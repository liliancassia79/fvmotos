import { supabase } from "@/integrations/supabase/client";
import type { OrdemServico, OSStatus } from "./os-storage";
import type { FormaPagamento } from "./pagamento";

// ---------- Ordens de Serviço ----------
function fromOS(r: any): OrdemServico {
  return {
    id: r.id, modelo: r.modelo, placa: r.placa, cliente: r.cliente,
    celular: r.celular ?? "", defeito: r.defeito ?? "",
    valor: r.valor != null ? Number(r.valor) : undefined,
    formaPagamento: (r.forma_pagamento ?? undefined) as FormaPagamento | undefined,
    observacoes: r.observacoes ?? undefined,
    fotos: r.fotos ?? [],
    status: r.status as OSStatus,
    pago: !!r.pago,
    criadoEm: new Date(r.criado_em).getTime(),
    atualizadoEm: r.atualizado_em ? new Date(r.atualizado_em).getTime() : undefined,
    finalizadoEm: r.finalizado_em ? new Date(r.finalizado_em).getTime() : undefined,
  };
}
function toOS(o: Partial<OrdemServico>) {
  const row: any = {
    modelo: o.modelo, placa: o.placa, cliente: o.cliente, celular: o.celular ?? null,
    defeito: o.defeito ?? null, valor: o.valor ?? null,
    forma_pagamento: o.formaPagamento ?? null, observacoes: o.observacoes ?? null,
    fotos: o.fotos ?? [], status: o.status ?? "fila",
  };
  if (typeof o.pago === "boolean") row.pago = o.pago;
  if (o.atualizadoEm) row.atualizado_em = new Date(o.atualizadoEm).toISOString();
  if (o.finalizadoEm) row.finalizado_em = new Date(o.finalizadoEm).toISOString();
  return row;
}
export const osDB = {
  async list(): Promise<OrdemServico[]> {
    const { data, error } = await supabase.from("ordens_servico").select("*").order("criado_em", { ascending: false });
    if (error) throw error; return (data ?? []).map(fromOS);
  },
  async create(o: Partial<OrdemServico>) {
    const { error } = await supabase.from("ordens_servico").insert(toOS(o)); if (error) throw error;
  },
  async update(id: string, o: Partial<OrdemServico>) {
    const { error } = await supabase.from("ordens_servico").update(toOS(o)).eq("id", id); if (error) throw error;
  },
  async remove(id: string) {
    const { error } = await supabase.from("ordens_servico").delete().eq("id", id); if (error) throw error;
  },
};

// ---------- Clientes ----------
export interface ClienteDB {
  id: string; nome: string; celular: string; email?: string; observacoes?: string; criadoEm: number;
}
const fromCli = (r: any): ClienteDB => ({
  id: r.id, nome: r.nome, celular: r.celular ?? "", email: r.email ?? undefined,
  observacoes: r.observacoes ?? undefined, criadoEm: new Date(r.created_at).getTime(),
});
export const clientesDB = {
  async list(): Promise<ClienteDB[]> {
    const { data, error } = await supabase.from("clientes").select("*").order("created_at", { ascending: false });
    if (error) throw error; return (data ?? []).map(fromCli);
  },
  async create(c: { nome: string; celular?: string; email?: string; observacoes?: string }) {
    const { error } = await supabase.from("clientes").insert({
      nome: c.nome, celular: c.celular ?? null, email: c.email ?? null, observacoes: c.observacoes ?? null,
    }); if (error) throw error;
  },
  async update(id: string, c: Partial<ClienteDB>) {
    const { error } = await supabase.from("clientes").update({
      nome: c.nome, celular: c.celular ?? null, email: c.email ?? null, observacoes: c.observacoes ?? null,
    }).eq("id", id); if (error) throw error;
  },
  async remove(id: string) {
    const { error } = await supabase.from("clientes").delete().eq("id", id); if (error) throw error;
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
  observacoes?: string;
  criadoEm: number;
}
const fromOrc = (r: any): OrcamentoDB => ({
  id: r.id, cliente: r.cliente, celular: r.celular ?? "",
  itens: (r.itens ?? []) as OrcamentoItem[],
  total: Number(r.total ?? 0),
  formaPagamento: (r.forma_pagamento ?? undefined) as FormaPagamento | undefined,
  status: (r.status ?? "rascunho") as OrcStatus,
  observacoes: r.observacoes ?? undefined,
  criadoEm: new Date(r.created_at).getTime(),
});
export const orcDB = {
  async list(): Promise<OrcamentoDB[]> {
    const { data, error } = await supabase.from("orcamentos").select("*").order("created_at", { ascending: false });
    if (error) throw error; return (data ?? []).map(fromOrc);
  },
  async create(o: Omit<OrcamentoDB, "id" | "criadoEm">) {
    const { error } = await supabase.from("orcamentos").insert({
      cliente: o.cliente, celular: o.celular || null, itens: o.itens as any, total: o.total,
      forma_pagamento: o.formaPagamento ?? null, status: o.status, observacoes: o.observacoes ?? null,
    }); if (error) throw error;
  },
  async setStatus(id: string, status: OrcStatus) {
    const { error } = await supabase.from("orcamentos").update({ status }).eq("id", id); if (error) throw error;
  },
  async remove(id: string) {
    const { error } = await supabase.from("orcamentos").delete().eq("id", id); if (error) throw error;
  },
};

// ---------- Agendamentos ----------
export interface AgendamentoDB {
  id: string; cliente: string; celular: string;
  dataHora: string; // ISO
  servico: string; observacoes?: string; confirmado: boolean;
  criadoEm: number;
}
const fromAg = (r: any): AgendamentoDB => ({
  id: r.id, cliente: r.cliente, celular: r.celular ?? "",
  dataHora: r.data_hora, servico: r.servico ?? "", observacoes: r.observacoes ?? undefined,
  confirmado: !!r.confirmado, criadoEm: new Date(r.created_at).getTime(),
});
export const agDB = {
  async list(): Promise<AgendamentoDB[]> {
    const { data, error } = await supabase.from("agendamentos").select("*").order("data_hora", { ascending: true });
    if (error) throw error; return (data ?? []).map(fromAg);
  },
  async create(a: Omit<AgendamentoDB, "id" | "criadoEm">) {
    const { error } = await supabase.from("agendamentos").insert({
      cliente: a.cliente, celular: a.celular || null, data_hora: a.dataHora,
      servico: a.servico, observacoes: a.observacoes ?? null, confirmado: a.confirmado,
    }); if (error) throw error;
  },
  async setConfirmado(id: string, confirmado: boolean) {
    const { error } = await supabase.from("agendamentos").update({ confirmado }).eq("id", id); if (error) throw error;
  },
  async remove(id: string) {
    const { error } = await supabase.from("agendamentos").delete().eq("id", id); if (error) throw error;
  },
};

// ---------- Catálogo ----------
export type ServicoCategoria = "revisao" | "pecas" | "motor" | "eletrica" | "injecao" | "acessorios";
export interface ServicoDB { id: string; nome: string; preco: number; categoria: ServicoCategoria; }
const fromSrv = (r: any): ServicoDB => ({
  id: r.id, nome: r.nome, preco: Number(r.preco ?? 0),
  categoria: (r.categoria ?? "revisao") as ServicoCategoria,
});
export const catDB = {
  async list(): Promise<ServicoDB[]> {
    const { data, error } = await supabase.from("servicos_catalogo").select("*").order("categoria").order("nome");
    if (error) throw error; return (data ?? []).map(fromSrv);
  },
  async create(s: Omit<ServicoDB, "id">) {
    const { error } = await supabase.from("servicos_catalogo").insert({ nome: s.nome, preco: s.preco, categoria: s.categoria });
    if (error) throw error;
  },
  async update(id: string, s: Partial<ServicoDB>) {
    const { error } = await supabase.from("servicos_catalogo").update({
      nome: s.nome, preco: s.preco, categoria: s.categoria,
    }).eq("id", id); if (error) throw error;
  },
  async remove(id: string) {
    const { error } = await supabase.from("servicos_catalogo").delete().eq("id", id); if (error) throw error;
  },
};

export const categoriaLabel: Record<ServicoCategoria, string> = {
  revisao: "Revisões", pecas: "Troca de Peças", motor: "Motor",
  eletrica: "Elétrica", injecao: "Injeção Eletrônica", acessorios: "Acessórios",
};
export const orcStatusLabel: Record<OrcStatus, string> = {
  rascunho: "Rascunho", enviado: "Enviado", aprovado: "Aprovado", recusado: "Recusado",
};
