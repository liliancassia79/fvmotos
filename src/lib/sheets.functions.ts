import { createServerFn } from "@tanstack/react-start";

const SHEET_ID = "1k7E4Gf2oLiMnbzywMcdQSa0HWuiPw3bOwN0xjGpHjiE";
const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

type SyncAction = "upsert" | "delete";
type Input = { sheet: string; id: string; values?: (string | number | null)[]; action: SyncAction };

async function gw(path: string, init: RequestInit = {}) {
  const key = process.env.GOOGLE_SHEETS_API_KEY;
  const lk = process.env.LOVABLE_API_KEY;
  if (!key || !lk) throw new Error("Sheets connector not configured");
  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${lk}`,
      "X-Connection-Api-Key": key,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sheets ${res.status}: ${body}`);
  }
  return res.json();
}

export const syncSheetRow = createServerFn({ method: "POST" })
  .inputValidator((d: Input) => d)
  .handler(async ({ data }) => {
    const { sheet, id, values, action } = data;
    const tab = encodeURIComponent(sheet);

    // Read column A to find row by id
    const colA = await gw(`/spreadsheets/${SHEET_ID}/values/${tab}!A:A`);
    const rows: string[][] = colA.values ?? [];
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if ((rows[i]?.[0] ?? "") === id) { rowIndex = i + 1; break; }
    }

    if (action === "delete") {
      if (rowIndex > 0) {
        await gw(`/spreadsheets/${SHEET_ID}/values/${tab}!A${rowIndex}:Z${rowIndex}:clear`, { method: "POST" });
      }
      return { ok: true };
    }

    const row = [id, ...(values ?? []).map((v) => (v == null ? "" : v))];
    if (rowIndex > 0) {
      const endCol = colLetter(row.length);
      await gw(
        `/spreadsheets/${SHEET_ID}/values/${tab}!A${rowIndex}:${endCol}${rowIndex}?valueInputOption=USER_ENTERED`,
        { method: "PUT", body: JSON.stringify({ values: [row] }) },
      );
    } else {
      await gw(
        `/spreadsheets/${SHEET_ID}/values/${tab}!A:A:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        { method: "POST", body: JSON.stringify({ values: [row] }) },
      );
    }
    return { ok: true };
  });

function colLetter(n: number): string {
  let s = "";
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
