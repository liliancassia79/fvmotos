import type { FormaPagamento } from "./pagamento";

export type OSStatus = "fila" | "consertando" | "pronta";

export interface OrdemServico {
  id: string;
  modelo: string;
  placa: string;
  cliente: string;
  celular: string;
  defeito: string;
  valor?: number;
  formaPagamento?: FormaPagamento;
  observacoes?: string;
  status: OSStatus;
  criadoEm: number;
  atualizadoEm?: number;
  finalizadoEm?: number;
}


const KEY = "oficina-os-v1";

export function loadOS(): OrdemServico[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OrdemServico[]) : [];
  } catch {
    return [];
  }
}

export function saveOS(items: OrdemServico[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
}

export const statusOrder: OSStatus[] = ["fila", "consertando", "pronta"];

export const statusLabel: Record<OSStatus, string> = {
  fila: "Na Fila",
  consertando: "Consertando",
  pronta: "Pronta para Entrega",
};

export function nextStatus(s: OSStatus): OSStatus {
  const i = statusOrder.indexOf(s);
  return statusOrder[(i + 1) % statusOrder.length];
}

export function formatBRL(n?: number) {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(ts?: number) {
  if (!ts) return "";
  return new Date(ts).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function relativeTime(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
}

export function whatsappLink(celular: string, mensagem: string) {
  const digits = celular.replace(/\D/g, "");
  const phone = digits.length > 0 ? (digits.startsWith("55") ? digits : "55" + digits) : "";
  return `https://wa.me/${phone}?text=${encodeURIComponent(mensagem)}`;
}

export function exportarCSV(items: OrdemServico[]) {
  const headers = ["Modelo", "Placa", "Cliente", "Celular", "Defeito", "Valor", "Status", "Criado em"];
  const rows = items.map((i) => [
    i.modelo, i.placa, i.cliente, i.celular, i.defeito,
    i.valor?.toString() ?? "", statusLabel[i.status], formatDate(i.criadoEm),
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ordens-servico-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
