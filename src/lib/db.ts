import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc,
  query, orderBy, onSnapshot, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { sheetsSync } from "./sheets-sync";
import type { OrdemServico, OSStatus } from "./os-storage";
import type { FormaPagamento } from "./pagamento";


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
  const set = (k: string, v: any) => { if (v !== undefined) row[k] = v; };
  set("modelo", o.modelo);
  set("placa", o.placa);
  set("cliente", o.cliente);
  set("celular", o.celular ?? null);
  set("defeito", o.defeito ?? null);
  set("valor", o.valor ?? null);
  set("formaPagamento", o.formaPagamento ?? null);
  set("observacoes", o.observacoes ?? null);
  set("fotos", o.fotos ?? []);
  set("status", o.status);
  if (typeof o.pago === "boolean") row.pago = o.pago;
  if (o.atualizadoEm) row.atualizadoEm = new Date(o.atualizadoEm).getTime();
  if (o.finalizadoEm) row.finalizadoEm = new Date(o.finalizadoEm).getTime();
  return row;
}

export const osDB = {
  subscribe(callback: (ordens: OrdemServico[]) => void) {
    const q = query(osCol(), orderBy("criadoEm", "desc"));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => fromOS(d.id, d.data())));
    });
  },
  async create(o: Partial<OrdemServico>) {
    const ref = await addDoc(osCol(), { ...cleanOS(o), criadoEm: serverTimestamp() });
    getDoc(ref).then((s) => s.exists() && sheetsSync.os.upsert({ id: ref.id, ...(fromOS(ref.id, s.data()) as any) }));
  },
  async update(id: string, o: Partial<OrdemServico>) {
    await updateDoc(doc(db, "ordens_servico", id), cleanOS(o));
    getDoc(doc(db, "ordens_servico", id)).then((s) => s.exists() && sheetsSync.os.upsert({ id, ...(fromOS(id, s.data()) as any) }));
  },
  async remove(id: string) {
    await deleteDoc(doc(db, "ordens_servico", id));
    sheetsSync.os.remove(id);
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
    const ref = await addDoc(cliCol(), {
      nome: c.nome, celular: c.celular ?? null,
      email: c.email ?? null, observacoes: c.observacoes ?? null,
      criadoEm: serverTimestamp(),
    });
    getDoc(ref).then((s) => s.exists() && sheetsSync.cliente.upsert(fromCli(ref.id, s.data())));
  },
  async update(id: string, c: Partial<ClienteDB>) {
    await updateDoc(doc(db, "clientes", id), {
      nome: c.nome ?? null, celular: c.celular ?? null,
      email: c.email ?? null, observacoes: c.observacoes ?? null,
      atualizadoEm: serverTimestamp(),
    });
    getDoc(doc(db, "clientes", id)).then((s) => s.exists() && sheetsSync.cliente.upsert(fromCli(id, s.data())));
  },
  async remove(id: string) {
    await deleteDoc(doc(db, "clientes", id));
    sheetsSync.cliente.remove(id);
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
    await addDoc(orcCol(), {
      cliente: o.cliente, celular: o.celular ?? null,
      itens: o.itens, total: o.total,
      formaPagamento: o.formaPagamento ?? null,
      status: o.status, pago: !!o.pago,
      observacoes: o.observacoes ?? null,
      criadoEm: serverTimestamp(),
    });
  },
  async setStatus(id: string, status: OrcStatus) {
    await updateDoc(doc(db, "orcamentos", id), { status });
  },
  async setPago(id: string, pago: boolean) {
    await updateDoc(doc(db, "orcamentos", id), { pago });
  },
  async remove(id: string) { await deleteDoc(doc(db, "orcamentos", id)); },
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
    await addDoc(agCol(), {
      cliente: a.cliente, celular: a.celular ?? null,
      dataHora: a.dataHora, servico: a.servico,
      observacoes: a.observacoes ?? null, confirmado: a.confirmado,
      criadoEm: serverTimestamp(),
    });
  },
  async setConfirmado(id: string, confirmado: boolean) {
    await updateDoc(doc(db, "agendamentos", id), { confirmado });
  },
  async remove(id: string) { await deleteDoc(doc(db, "agendamentos", id)); },
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
    await addDoc(catCol(), {
      nome: s.nome,
      preco: s.preco,
      categoria: s.categoria,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    });
  },
  async update(id: string, s: Partial<ServicoDB>) {
    const patch: Record<string, any> = { atualizadoEm: serverTimestamp() };
    if (s.nome !== undefined) patch.nome = s.nome;
    if (s.preco !== undefined) patch.preco = s.preco;
    if (s.categoria !== undefined) patch.categoria = s.categoria;
    await updateDoc(doc(db, "servicos_catalogo", id), patch);
  },
  async remove(id: string) { await deleteDoc(doc(db, "servicos_catalogo", id)); },
};

export const categoriaLabel: Record<ServicoCategoria, string> = {
  revisao: "Revisões", pecas: "Troca de Peças", motor: "Motor",
  eletrica: "Elétrica", injecao: "Injeção Eletrônica", acessorios: "Acessórios",
};
export const orcStatusLabel: Record<OrcStatus, string> = {
  rascunho: "Rascunho", enviado: "Enviado", aprovado: "Aprovado", recusado: "Recusado",
};
