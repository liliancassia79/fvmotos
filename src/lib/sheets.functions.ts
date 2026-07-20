import { createServerFn } from "@tanstack/react-start";

const SPREADSHEET_ID = "1k7E4Gf2oLiMnbzywMcdQSa0HWuiPw3bOwN0xjGpHjiE";
const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

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

export const syncSheetRow = createServerFn({ method: "POST" })
  .inputValidator((d: SyncInput) => d)
  .handler(async ({ data }) => {
    const { tab, id, values, action = "upsert" } = data;
    const tabEnc = encodeURIComponent(tab);
    // Read column A to find row index
    const range = `${tab}!A:A`;
    const list = await gwFetch(
      `/spreadsheets/${SPREADSHEET_ID}/values/${tabEnc}!A:A`,
    );
    const col: string[][] = list.values || [];
    let rowIndex = -1;
    for (let i = 1; i < col.length; i++) {
      if (col[i]?.[0] === id) { rowIndex = i + 1; break; }
    }

    if (action === "delete") {
      if (rowIndex > 0) {
        await gwFetch(
          `/spreadsheets/${SPREADSHEET_ID}/values/${tabEnc}!A${rowIndex}:Z${rowIndex}:clear`,
          { method: "POST", body: "{}" },
        );
      }
      return { ok: true };
    }

    const row = [id, ...values];
    if (rowIndex > 0) {
      const endCol = String.fromCharCode(65 + row.length - 1);
      await gwFetch(
        `/spreadsheets/${SPREADSHEET_ID}/values/${tabEnc}!A${rowIndex}:${endCol}${rowIndex}?valueInputOption=USER_ENTERED`,
        { method: "PUT", body: JSON.stringify({ values: [row] }) },
      );
    } else {
      await gwFetch(
        `/spreadsheets/${SPREADSHEET_ID}/values/${tabEnc}!A:A:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        { method: "POST", body: JSON.stringify({ values: [row] }) },
      );
    }
    return { ok: true, range };
  });
