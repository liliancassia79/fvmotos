import { createServerFn } from "@tanstack/react-start";

const SPREADSHEET_ID = "1k7E4Gf2oLiMnbzywMcdQSa0HWuiPw3bOwN0xjGpHjiE";
const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

const HEADERS: Record<SyncInput["tab"], string[]> = {
  Clientes: ["ID", "Nome", "WhatsApp", "Email", "Observações", "Atualizado em"],
  "Ordens de Servico": [
    "ID", "Cliente", "Modelo", "Placa", "WhatsApp", "Defeito / Serviços",
    "Valor", "Forma de pagamento", "Pago", "Status", "Criado em", "Atualizado em", "Finalizado em",
  ],
  Orcamentos: ["ID", "Cliente", "WhatsApp", "Itens", "Total", "Forma de pagamento", "Status", "Pago", "Observações", "Atualizado em"],
  Agendamentos: ["ID", "Cliente", "WhatsApp", "Data", "Hora", "Serviço", "Confirmado", "Observações", "Atualizado em"],
};

type SyncInput = {
  tab: "Clientes" | "Ordens de Servico" | "Orcamentos" | "Agendamentos";
  id: string;
  values: (string | number | null)[];
  action?: "upsert" | "delete";
};

async function gwFetch(path: string, init: RequestInit = {}) {
  const lovable = process.env.LOVABLE_API_KEY;
  const conn = process.env.GOOGLE_SHEETS_API_KEY;
  if (!lovable || !conn) throw new Error("Sheets connector env vars missing");
  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${lovable}`,
      "X-Connection-Api-Key": conn,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Sheets ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

function sheetName(tab: SyncInput["tab"]) {
  return /^[A-Za-z0-9_]+$/.test(tab) ? tab : `'${tab.replace(/'/g, "''")}'`;
}

function colName(index: number) {
  let name = "";
  let n = index;
  while (n > 0) {
    const mod = (n - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    n = Math.floor((n - mod) / 26);
  }
  return name;
}

async function ensureHeaders(tab: SyncInput["tab"]) {
  const headers = HEADERS[tab];
  const endCol = colName(headers.length);
  await gwFetch(
    `/spreadsheets/${SPREADSHEET_ID}/values/${sheetName(tab)}!A1:${endCol}1?valueInputOption=USER_ENTERED`,
    { method: "PUT", body: JSON.stringify({ values: [headers] }) },
  );
}

export const syncSheetRow = createServerFn({ method: "POST" })
  .inputValidator((d: SyncInput) => d)
  .handler(async ({ data }) => {
    const { tab, id, values, action = "upsert" } = data;
    const sheet = sheetName(tab);
    await ensureHeaders(tab);
    // Read column A to find row index
    const list = await gwFetch(
      `/spreadsheets/${SPREADSHEET_ID}/values/${sheet}!A:A`,
    );
    const col: string[][] = list.values || [];
    let rowIndex = -1;
    for (let i = 1; i < col.length; i++) {
      if (col[i]?.[0] === id) { rowIndex = i + 1; break; }
    }

    if (action === "delete") {
      if (rowIndex > 0) {
        await gwFetch(
          `/spreadsheets/${SPREADSHEET_ID}/values/${sheet}!A${rowIndex}:Z${rowIndex}:clear`,
          { method: "POST", body: "{}" },
        );
      }
      return { ok: true };
    }

    const row = [id, ...values];
    if (rowIndex > 0) {
      const endCol = colName(Math.max(row.length, HEADERS[tab].length));
      await gwFetch(
        `/spreadsheets/${SPREADSHEET_ID}/values/${sheet}!A${rowIndex}:Z${rowIndex}:clear`,
        { method: "POST", body: "{}" },
      );
      await gwFetch(
        `/spreadsheets/${SPREADSHEET_ID}/values/${sheet}!A${rowIndex}:${endCol}${rowIndex}?valueInputOption=USER_ENTERED`,
        { method: "PUT", body: JSON.stringify({ values: [row] }) },
      );
    } else {
      await gwFetch(
        `/spreadsheets/${SPREADSHEET_ID}/values/${sheet}!A:A:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        { method: "POST", body: JSON.stringify({ values: [row] }) },
      );
    }
    return { ok: true };
  });
