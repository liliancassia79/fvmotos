import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, serverTimestamp, Timestamp, getDocFromCache, getDocsFromCache,
} from "firebase/firestore";
import { db } from "./firebase";
import type { OrdemServico, OSStatus } from "./os-storage";
import { statusLabel } from "./os-storage";
import { formaPagamentoLabel, type FormaPagamento } from "./pagamento";
import { pushSheet, deleteSheet, syncSheet, fmtDate } from "./sheets-sync";


function tsToMillis(v: any): number {
  if (!v) return Date.now();
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v === "number") return v;
  if (typeof v === "string") return new Date(v).getTime();
  if (v?.seconds) return v.seconds * 1000;
  return Date.now();
}

// ---------- Ordens de Serviço ----------
const osCol = () => collection(db, "ordens_servico");

function fromOS(id: string, r: any): OrdemServico {
  return {
    id,
    modelo: r.modelo ?? "",
    placa: r.placa ?? "",
    cliente: r.cliente ?? "",
    celular: r.celular ?? "",
    defeito: r.defeito ?? "",
    valor: r.valor != null ? Number(r.valor) : undefined,
    formaPagamento: r.formaPagamento as FormaPagamento | undefined,
    observacoes: r.observacoes ?? undefined,
    fotos: r.fotos ?? [],
    status: (r.status ?? "fila") as OSStatus,
    pago: !!r.pago,
    criadoEm: tsToMillis(r.criadoEm),
    atualizadoEm: r.atualizadoEm ? tsToMillis(r.atualizadoEm) : undefined,
    finalizadoEm: r.finalizadoEm ? tsToMillis(r.finalizadoEm) : undefined,
  };
}

function cleanOS(o: Partial<OrdemServico>): Record<string, any> {
  const row: Record<string, any> = {};
  const set = (k: keyof OrdemServico, v: any) => {
    if (Object.prototype.hasOwnProperty.call(o, k)) row[k] = v ?? null;
  };
  set("modelo", o.modelo);
  set("placa", o.placa);
  set("cliente", o.cliente);
  set("celular", o.celular);
  set("defeito", o.defeito);
  set("valor", o.valor);
  set("formaPagamento", o.formaPagamento);
  set("observacoes", o.observacoes);
  set("fotos", o.fotos ?? []);
  set("status", o.status);
  if (typeof o.pago === "boolean") row.pago = o.pago;
  if (o.atualizadoEm) row.atualizadoEm = new Date(o.atualizadoEm).getTime();
  if (o.finalizadoEm) row.finalizadoEm = new Date(o.finalizadoEm).getTime();
  return row;
}

function pagamentoNome(v?: FormaPagamento | null) {
  return v ? formaPagamentoLabel[v] ?? v : "";
}

function osSheetRow(o: OrdemServico) {
  return [
    o.cliente, o.modelo, o.placa, o.celular ?? "", o.defeito ?? "",
    o.valor ?? "", pagamentoNome(o.formaPagamento), o.pago ? "Sim" : "Não",
    statusLabel[o.status] ?? o.status, fmtDate(o.criadoEm), fmtDate(o.atualizadoEm), fmtDate(o.finalizadoEm),
  ];
}

function reportFirestoreWrite(promise: Promise<unknown>, label: string) {
  promise.catch((error) => {
    console.warn(`[firebase] ${label} falhou`, error);
  });
}

function scheduleCacheSync(fn: () => Promise<void>) {
  const run = () => {
    fn().catch((error) => console.warn("[sheets] sincronização pelo cache falhou", error));
  };

  if (typeof window === "undefined") {
    run();
    return;
  }

  window.setTimeout(run, 350);
}

function clienteSheetRow(c: ClienteDB) {
  return [c.nome, c.celular ?? "", c.email ?? "", c.observacoes ?? "", fmtDate(Date.now())];
}

function orcamentoSheetRow(o: OrcamentoDB) {
  const itensTxt = o.itens.map((i) => `${i.descricao} (R$ ${i.valor})`).join(" | ");
  return [
    o.cliente, o.celular ?? "", itensTxt, o.total ?? 0, pagamentoNome(o.formaPagamento),
    orcStatusLabel[o.status] ?? o.status, o.pago ? "Sim" : "Não", o.observacoes ?? "", fmtDate(o.criadoEm),
  ];
}

function agendamentoSheetRow(a: AgendamentoDB) {
  const d = new Date(a.dataHora);
  return [
    a.cliente, a.celular ?? "",
    d.toLocaleDateString("pt-BR"),
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    a.servico, a.confirmado ? "Sim" : "Não", a.observacoes ?? "", fmtDate(a.criadoEm),
  ];
}

async function syncOSById(id: string) {
  const snap = await getDocFromCache(doc(db, "ordens_servico", id));
  if (snap.exists()) pushSheet("Ordens de Servico", id, osSheetRow(fromOS(id, snap.data())));
}

async function syncOrcamentoById(id: string) {
  const snap = await getDocFromCache(doc(db, "orcamentos", id));
  if (snap.exists()) pushSheet("Orcamentos", id, orcamentoSheetRow(fromOrc(id, snap.data())));
}

async function syncAgendamentoById(id: string) {
  const snap = await getDocFromCache(doc(db, "agendamentos", id));
  if (snap.exists()) pushSheet("Agendamentos", id, agendamentoSheetRow(fromAg(id, snap.data())));
}

export const osDB = {
  subscribe(callback: (ordens: OrdemServico[]) => void) {
    const q = query(osCol(), orderBy("criadoEm", "desc"));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => fromOS(d.id, d.data())));
    });
  },
  async create(o: Partial<OrdemServico>) {
    const ref = doc(osCol());
    reportFirestoreWrite(
      setDoc(ref, { ...cleanOS({ ...o, status: o.status ?? "fila" }), criadoEm: serverTimestamp() }),
      "salvar ordem de serviço",
    );
    pushSheet("Ordens de Servico", ref.id, osSheetRow(fromOS(ref.id, { ...o, status: o.status ?? "fila", criadoEm: Date.now() })));
    return ref.id;
  },
  async update(id: string, o: Partial<OrdemServico>) {
    reportFirestoreWrite(updateDoc(doc(db, "ordens_servico", id), cleanOS(o)), "atualizar ordem de serviço");
    scheduleCacheSync(() => syncOSById(id));
  },
  async remove(id: string) {
    reportFirestoreWrite(deleteDoc(doc(db, "ordens_servico", id)), "remover ordem de serviço");
    deleteSheet("Ordens de Servico", id);
  },
};


// ---------- Clientes ----------
export interface ClienteDB {
  id: string; nome: string; celular: string; email?: string; observacoes?: string; criadoEm: number;
}
const cliCol = () => collection(db, "clientes");
const fromCli = (id: string, r: any): ClienteDB => ({
  id, nome: r.nome ?? "", celular: r.celular ?? "",
  email: r.email ?? undefined, observacoes: r.observacoes ?? undefined,
  criadoEm: tsToMillis(r.criadoEm),
});
export const clientesDB = {
  subscribe(callback: (clientes: ClienteDB[]) => void) {
    const q = query(cliCol(), orderBy("criadoEm", "desc"));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => fromCli(d.id, d.data())));
    });
  },
  async create(c: { nome: string; celular?: string; email?: string; observacoes?: string }) {
    const ref = doc(cliCol());
    reportFirestoreWrite(setDoc(ref, {
      nome: c.nome, celular: c.celular ?? null,
      email: c.email ?? null, observacoes: c.observacoes ?? null,
      criadoEm: serverTimestamp(),
    }), "salvar cliente");
    pushSheet("Clientes", ref.id, clienteSheetRow(fromCli(ref.id, { ...c, criadoEm: Date.now() })));
    return ref.id;
  },
  async update(id: string, c: Partial<ClienteDB>) {
    const patch: Record<string, unknown> = { atualizadoEm: serverTimestamp() };
    if (Object.prototype.hasOwnProperty.call(c, "nome")) patch.nome = c.nome ?? null;
    if (Object.prototype.hasOwnProperty.call(c, "celular")) patch.celular = c.celular ?? null;
    if (Object.prototype.hasOwnProperty.call(c, "email")) patch.email = c.email ?? null;
    if (Object.prototype.hasOwnProperty.call(c, "observacoes")) patch.observacoes = c.observacoes ?? null;
    reportFirestoreWrite(updateDoc(doc(db, "clientes", id), patch), "atualizar cliente");
    scheduleCacheSync(async () => {
      const snap = await getDocFromCache(doc(db, "clientes", id));
      if (snap.exists()) pushSheet("Clientes", id, clienteSheetRow(fromCli(id, snap.data())));
    });
  },
  async remove(id: string) {
    reportFirestoreWrite(deleteDoc(doc(db, "clientes", id)), "remover cliente");
    deleteSheet("Clientes", id);
  },
};


// ---------- Orçamentos ----------
export type OrcStatus = "rascunho" | "enviado" | "aprovado" | "recusado";
export interface OrcamentoItem { descricao: string; valor: number; }
export interface OrcamentoDB {
  id: string; cliente: string; celular: string;
  itens: OrcamentoItem[]; total: number;
  formaPagamento?: FormaPagamento;
  status: OrcStatus;
  pago?: boolean;
  observacoes?: string;
  criadoEm: number;
}
const orcCol = () => collection(db, "orcamentos");
const fromOrc = (id: string, r: any): OrcamentoDB => ({
  id, cliente: r.cliente ?? "", celular: r.celular ?? "",
  itens: (r.itens ?? []) as OrcamentoItem[],
  total: Number(r.total ?? 0),
  formaPagamento: r.formaPagamento as FormaPagamento | undefined,
  status: (r.status ?? "rascunho") as OrcStatus,
  pago: !!r.pago,
  observacoes: r.observacoes ?? undefined,
  criadoEm: tsToMillis(r.criadoEm),
});
export const orcDB = {
  subscribe(callback: (orcs: OrcamentoDB[]) => void) {
    const q = query(orcCol(), orderBy("criadoEm", "desc"));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => fromOrc(d.id, d.data())));
    });
  },
  async create(o: Omit<OrcamentoDB, "id" | "criadoEm">) {
    const ref = doc(orcCol());
    reportFirestoreWrite(setDoc(ref, {
      cliente: o.cliente, celular: o.celular ?? null,
      itens: o.itens, total: o.total,
      formaPagamento: o.formaPagamento ?? null,
      status: o.status, pago: !!o.pago,
      observacoes: o.observacoes ?? null,
      criadoEm: serverTimestamp(),
    }), "salvar orçamento");
    pushSheet("Orcamentos", ref.id, orcamentoSheetRow(fromOrc(ref.id, { ...o, criadoEm: Date.now() })));
    return ref.id;
  },
  async setStatus(id: string, status: OrcStatus) {
    reportFirestoreWrite(updateDoc(doc(db, "orcamentos", id), { status }), "atualizar status do orçamento");
    scheduleCacheSync(() => syncOrcamentoById(id));
  },
  async setPago(id: string, pago: boolean) {
    reportFirestoreWrite(updateDoc(doc(db, "orcamentos", id), { pago }), "atualizar pagamento do orçamento");
    scheduleCacheSync(() => syncOrcamentoById(id));
  },
  async remove(id: string) {
    reportFirestoreWrite(deleteDoc(doc(db, "orcamentos", id)), "remover orçamento");
    deleteSheet("Orcamentos", id);
  },
};


// ---------- Agendamentos ----------
export interface AgendamentoDB {
  id: string; cliente: string; celular: string;
  dataHora: string;
  servico: string; observacoes?: string; confirmado: boolean;
  criadoEm: number;
}
const agCol = () => collection(db, "agendamentos");
const fromAg = (id: string, r: any): AgendamentoDB => ({
  id, cliente: r.cliente ?? "", celular: r.celular ?? "",
  dataHora: r.dataHora ?? new Date().toISOString(),
  servico: r.servico ?? "", observacoes: r.observacoes ?? undefined,
  confirmado: !!r.confirmado, criadoEm: tsToMillis(r.criadoEm),
});
export const agDB = {
  subscribe(callback: (ags: AgendamentoDB[]) => void) {
    const q = query(agCol(), orderBy("dataHora", "asc"));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => fromAg(d.id, d.data())));
    });
  },
  async create(a: Omit<AgendamentoDB, "id" | "criadoEm">) {
    const ref = doc(agCol());
    reportFirestoreWrite(setDoc(ref, {
      cliente: a.cliente, celular: a.celular ?? null,
      dataHora: a.dataHora, servico: a.servico,
      observacoes: a.observacoes ?? null, confirmado: a.confirmado,
      criadoEm: serverTimestamp(),
    }), "salvar agendamento");
    pushSheet("Agendamentos", ref.id, agendamentoSheetRow(fromAg(ref.id, { ...a, criadoEm: Date.now() })));
    return ref.id;
  },
  async setConfirmado(id: string, confirmado: boolean) {
    reportFirestoreWrite(updateDoc(doc(db, "agendamentos", id), { confirmado }), "atualizar confirmação do agendamento");
    scheduleCacheSync(() => syncAgendamentoById(id));
  },
  async remove(id: string) {
    reportFirestoreWrite(deleteDoc(doc(db, "agendamentos", id)), "remover agendamento");
    deleteSheet("Agendamentos", id);
  },

};

// ---------- Catálogo ----------
export type ServicoCategoria = "revisao" | "pecas" | "motor" | "eletrica" | "injecao" | "acessorios";
export interface ServicoDB { id: string; nome: string; preco: number; categoria: ServicoCategoria; }
const catCol = () => collection(db, "servicos_catalogo");
const fromSrv = (id: string, r: any): ServicoDB => ({
  id, nome: r.nome ?? "", preco: Number(r.preco ?? 0),
  categoria: (r.categoria ?? "revisao") as ServicoCategoria,
});
export const catDB = {
  subscribe(callback: (servicos: ServicoDB[]) => void, onError?: (error: Error) => void) {
    const q = query(catCol(), orderBy("categoria", "asc"));
    return onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => fromSrv(d.id, d.data()));
      items.sort((a, b) =>
        a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome));
      callback(items);
    }, onError);
  },
  async create(s: Omit<ServicoDB, "id">) {
    const ref = doc(catCol());
    reportFirestoreWrite(setDoc(ref, {
      nome: s.nome,
      preco: s.preco,
      categoria: s.categoria,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    }), "salvar serviço do catálogo");
    return ref.id;
  },
  async update(id: string, s: Partial<ServicoDB>) {
    const patch: Record<string, any> = { atualizadoEm: serverTimestamp() };
    if (s.nome !== undefined) patch.nome = s.nome;
    if (s.preco !== undefined) patch.preco = s.preco;
    if (s.categoria !== undefined) patch.categoria = s.categoria;
    reportFirestoreWrite(updateDoc(doc(db, "servicos_catalogo", id), patch), "atualizar serviço do catálogo");
  },
  async remove(id: string) { reportFirestoreWrite(deleteDoc(doc(db, "servicos_catalogo", id)), "remover serviço do catálogo"); },
};

export const categoriaLabel: Record<ServicoCategoria, string> = {
  revisao: "Revisões", pecas: "Troca de Peças", motor: "Motor",
  eletrica: "Elétrica", injecao: "Injeção Eletrônica", acessorios: "Acessórios",
};
export const orcStatusLabel: Record<OrcStatus, string> = {
  rascunho: "Rascunho", enviado: "Enviado", aprovado: "Aprovado", recusado: "Recusado",
};

export async function backfillSheets() {
  const [clientes, ordens, orcamentos, agendamentos] = await Promise.all([
    getDocsFromCache(cliCol()), getDocsFromCache(osCol()), getDocsFromCache(orcCol()), getDocsFromCache(agCol()),
  ]);
  await Promise.all([
    ...clientes.docs.map((d) => syncSheet("Clientes", d.id, clienteSheetRow(fromCli(d.id, d.data())))),
    ...ordens.docs.map((d) => syncSheet("Ordens de Servico", d.id, osSheetRow(fromOS(d.id, d.data())))),
    ...orcamentos.docs.map((d) => syncSheet("Orcamentos", d.id, orcamentoSheetRow(fromOrc(d.id, d.data())))),
    ...agendamentos.docs.map((d) => syncSheet("Agendamentos", d.id, agendamentoSheetRow(fromAg(d.id, d.data())))),
  ]);
}
