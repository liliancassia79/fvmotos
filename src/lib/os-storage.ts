export type OSStatus = "fila" | "consertando" | "pronta";

export interface OrdemServico {
  id: string;
  modelo: string;
  placa: string;
  cliente: string;
  celular: string;
  defeito: string;
  status: OSStatus;
  criadoEm: number;
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
