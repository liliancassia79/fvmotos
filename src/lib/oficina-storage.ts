// Clientes, Orçamentos e Agendamentos
import { formatBRL } from "./os-storage";
import { formaPagamentoLabel, type FormaPagamento } from "./pagamento";

export interface Cliente {
  id: string;
  nome: string;
  celular: string;
  email?: string;
  motos?: string; // descrição livre das motos
  observacoes?: string;
  criadoEm: number;
}

export interface OrcamentoItem {
  descricao: string;
  valor: number;
}

export type OrcamentoStatus = "rascunho" | "enviado" | "aprovado" | "recusado";

export interface Orcamento {
  id: string;
  cliente: string;
  celular: string;
  moto?: string;
  itens: OrcamentoItem[];
  observacoes?: string;
  formaPagamento?: FormaPagamento;
  status: OrcamentoStatus;
  criadoEm: number;
}


export type AgendamentoStatus = "pendente" | "confirmado" | "concluido" | "cancelado";

export interface Agendamento {
  id: string;
  cliente: string;
  celular: string;
  moto?: string;
  servico: string;
  data: string; // ISO yyyy-mm-ddThh:mm
  status: AgendamentoStatus;
  observacoes?: string;
  criadoEm: number;
}

const KEY_CLI = "oficina-clientes-v1";
const KEY_ORC = "oficina-orcamentos-v1";
const KEY_AGE = "oficina-agendamentos-v1";

function load<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}
function save<T>(key: string, items: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(items));
}

export const loadClientes = () => load<Cliente>(KEY_CLI);
export const saveClientes = (i: Cliente[]) => save(KEY_CLI, i);
export const loadOrcamentos = () => load<Orcamento>(KEY_ORC);
export const saveOrcamentos = (i: Orcamento[]) => save(KEY_ORC, i);
export const loadAgendamentos = () => load<Agendamento>(KEY_AGE);
export const saveAgendamentos = (i: Agendamento[]) => save(KEY_AGE, i);

export const orcamentoStatusLabel: Record<OrcamentoStatus, string> = {
  rascunho: "Rascunho", enviado: "Enviado", aprovado: "Aprovado", recusado: "Recusado",
};
export const agendamentoStatusLabel: Record<AgendamentoStatus, string> = {
  pendente: "Pendente", confirmado: "Confirmado", concluido: "Concluído", cancelado: "Cancelado",
};

export function orcamentoTotal(o: Orcamento) {
  return o.itens.reduce((s, i) => s + (i.valor || 0), 0);
}

export function orcamentoMensagem(o: Orcamento) {
  const linhas = [
    `*FV Motos · Orçamento*`,
    ``,
    `Cliente: ${o.cliente}`,
    o.moto ? `Moto: ${o.moto}` : "",
    ``,
    `Serviços:`,
    ...o.itens.map((i) => `• ${i.descricao} — ${formatBRL(i.valor)}`),
    ``,
    `*Total: ${formatBRL(orcamentoTotal(o))}*`,
    o.observacoes ? `\nObs: ${o.observacoes}` : "",
    ``,
    `Aguardamos sua confirmação. Obrigado!`,
  ].filter(Boolean);
  return linhas.join("\n");
}

export function agendamentoMensagemConfirmacao(a: Agendamento) {
  const data = new Date(a.data);
  const quando = data.toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" });
  return [
    `*FV Motos · Agendamento*`,
    ``,
    `Olá ${a.cliente}, confirmando seu agendamento:`,
    ``,
    `Serviço: ${a.servico}`,
    a.moto ? `Moto: ${a.moto}` : "",
    `Data: ${quando}`,
    ``,
    `Por favor, responda *CONFIRMO* para garantir seu horário.`,
  ].filter(Boolean).join("\n");
}

export function formatDataHora(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
