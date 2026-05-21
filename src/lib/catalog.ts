export type ServicoCategoria = "revisao" | "pecas" | "motor" | "eletrica" | "injecao" | "acessorios";

export interface ServicoItem {
  id: string;
  nome: string;
  categoria: ServicoCategoria;
  preco: number;
}

export const categoriaLabel: Record<ServicoCategoria, string> = {
  revisao: "Revisões",
  pecas: "Troca de Peças",
  motor: "Motor",
  eletrica: "Elétrica",
  injecao: "Injeção Eletrônica",
  acessorios: "Acessórios",
};

export const CATALOGO_PADRAO: ServicoItem[] = [
  { id: "rev-basica", nome: "Revisão Básica", categoria: "revisao", preco: 150 },
  { id: "rev-premium", nome: "Revisão Premium", categoria: "revisao", preco: 350 },

  { id: "p-lonas", nome: "Troca de Lonas de Freio", categoria: "pecas", preco: 120 },
  { id: "p-pastilhas", nome: "Troca de Pastilhas", categoria: "pecas", preco: 90 },
  { id: "p-cabos", nome: "Troca de Cabos", categoria: "pecas", preco: 60 },
  { id: "p-kit", nome: "Kit de Transmissão (relação)", categoria: "pecas", preco: 280 },

  { id: "m-retifica", nome: "Retífica de Motor", categoria: "motor", preco: 1200 },
  { id: "m-revisao-motor", nome: "Revisão de Motor", categoria: "motor", preco: 450 },

  { id: "e-bateria", nome: "Diagnóstico Elétrico / Bateria", categoria: "eletrica", preco: 80 },
  { id: "e-chicote", nome: "Reparo de Chicote", categoria: "eletrica", preco: 180 },

  { id: "i-scanner", nome: "Scanner de Injeção Eletrônica", categoria: "injecao", preco: 120 },
  { id: "i-limpeza", nome: "Limpeza de Bicos Injetores", categoria: "injecao", preco: 160 },

  { id: "a-instalacao", nome: "Instalação de Acessórios", categoria: "acessorios", preco: 70 },
];

const KEY = "oficina-catalogo-v1";

export function loadCatalogo(): ServicoItem[] {
  if (typeof window === "undefined") return CATALOGO_PADRAO;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return CATALOGO_PADRAO;
    const parsed = JSON.parse(raw) as ServicoItem[];
    return Array.isArray(parsed) && parsed.length ? parsed : CATALOGO_PADRAO;
  } catch {
    return CATALOGO_PADRAO;
  }
}

export function saveCatalogo(items: ServicoItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
}
