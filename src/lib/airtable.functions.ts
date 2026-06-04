import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BASE_ID = "appago3M8H1m2ErGZ";
const GATEWAY = "https://connector-gateway.lovable.dev/airtable";

function headers() {
  const lk = process.env.LOVABLE_API_KEY;
  const ak = process.env.AIRTABLE_API_KEY;
  if (!lk || !ak) throw new Error("Airtable não conectado (faltam LOVABLE_API_KEY/AIRTABLE_API_KEY)");
  return {
    Authorization: `Bearer ${lk}`,
    "X-Connection-Api-Key": ak,
    "Content-Type": "application/json",
  };
}

async function airtable(path: string, init?: RequestInit) {
  const res = await fetch(`${GATEWAY}/v0/${BASE_ID}/${path}`, { ...init, headers: { ...headers(), ...(init?.headers || {}) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`Airtable ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

export type Moto = { id: string; placa: string; modelo: string; kmAtual: number | null };
export type OS = {
  id: string;
  numero: number | string | null;
  status: string | null;
  placa: string | null;
  clienteNome: string | null;
  valorTotal: number | null;
  dataEntrada: string | null;
  defeito: string | null;
  valorMaoObra: number | null;
  motoId: string | null;
};

export const listMotos = createServerFn({ method: "GET" }).handler(async () => {
  const data = await airtable(`Motos?fields%5B%5D=Placa%20da%20Moto&fields%5B%5D=Modelo&fields%5B%5D=KM%20Atual&pageSize=100`);
  const motos: Moto[] = (data.records || []).map((r: any) => ({
    id: r.id,
    placa: r.fields["Placa da Moto"] ?? "",
    modelo: r.fields["Modelo"] ?? "",
    kmAtual: r.fields["KM Atual"] ?? null,
  }));
  motos.sort((a, b) => a.placa.localeCompare(b.placa));
  return motos;
});

export const createOS = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      motoId: z.string().min(1),
      defeito: z.string().min(1).max(5000),
      kmAtual: z.number().min(0).max(9999999),
      valorMaoObra: z.number().min(0).max(9999999),
    }).parse,
  )
  .handler(async ({ data }) => {
    const nowIso = new Date().toISOString();
    const created = await airtable(`Ordens%20de%20Servi%C3%A7o`, {
      method: "POST",
      body: JSON.stringify({
        fields: {
          Status: "Orçamento",
          Moto: [data.motoId],
          "Defeito Relatado": data.defeito,
          "Data Entrada": nowIso,
          "Valor Mão de Obra": data.valorMaoObra,
        },
      }),
    });
    await airtable(`Motos/${data.motoId}`, {
      method: "PATCH",
      body: JSON.stringify({ fields: { "KM Atual": data.kmAtual } }),
    });
    return { id: created.id };
  });

function mapOS(r: any): OS {
  const f = r.fields || {};
  const clienteNome = Array.isArray(f["Cliente Nome"]) ? f["Cliente Nome"].join(", ") : (f["Cliente Nome"] ?? null);
  return {
    id: r.id,
    numero: f["Número da OS"] ?? null,
    status: f["Status"] ?? null,
    placa: null, // resolved separately via moto lookup if needed
    clienteNome,
    valorTotal: f["Valor Total Estimado"] ?? f["Valor Mão de Obra"] ?? null,
    dataEntrada: f["Data Entrada"] ?? f["Data de Abertura"] ?? null,
    defeito: f["Defeito Relatado"] ?? null,
    valorMaoObra: f["Valor Mão de Obra"] ?? null,
    motoId: Array.isArray(f["Moto"]) ? f["Moto"][0] : null,
  };
}

export const listOS = createServerFn({ method: "GET" }).handler(async () => {
  const [osData, motos] = await Promise.all([
    airtable(`Ordens%20de%20Servi%C3%A7o?pageSize=100`),
    listMotos(),
  ]);
  const placaById = new Map(motos.map((m) => [m.id, m.placa]));
  const items: OS[] = (osData.records || []).map((r: any) => {
    const o = mapOS(r);
    o.placa = o.motoId ? placaById.get(o.motoId) ?? null : null;
    return o;
  });
  items.sort((a, b) => (b.dataEntrada ?? "").localeCompare(a.dataEntrada ?? ""));
  return items;
});

export const getOS = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string().min(1) }).parse)
  .handler(async ({ data }) => {
    const r = await airtable(`Ordens%20de%20Servi%C3%A7o/${data.id}`);
    const o = mapOS(r);
    if (o.motoId) {
      try {
        const m = await airtable(`Motos/${o.motoId}`);
        o.placa = m.fields?.["Placa da Moto"] ?? null;
      } catch {}
    }
    return o;
  });
