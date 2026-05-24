// Helpers de mensagem WhatsApp para Orçamentos e Agendamentos
import { formatBRL } from "./os-storage";
import { formaPagamentoLabel } from "./pagamento";
import type { OrcamentoDB, AgendamentoDB } from "./db";

export function orcamentoMensagem(o: OrcamentoDB) {
  const linhas = [
    `*FV Motos · Orçamento*`,
    ``,
    `Cliente: ${o.cliente}`,
    ``,
    `Serviços:`,
    ...o.itens.map((i) => `• ${i.descricao} — ${formatBRL(i.valor)}`),
    ``,
    `*Total: ${formatBRL(o.total)}*`,
    o.formaPagamento ? `Pagamento: ${formaPagamentoLabel[o.formaPagamento]}` : "",
    o.observacoes ? `\nObs: ${o.observacoes}` : "",
    ``,
    `Aguardamos sua confirmação. Obrigado!`,
  ].filter(Boolean);
  return linhas.join("\n");
}

export function agendamentoMensagemConfirmacao(a: AgendamentoDB) {
  const data = new Date(a.dataHora);
  const quando = data.toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" });
  return [
    `*FV Motos · Agendamento*`,
    ``,
    `Olá ${a.cliente}, confirmando seu agendamento:`,
    ``,
    a.servico ? `Serviço: ${a.servico}` : "",
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
