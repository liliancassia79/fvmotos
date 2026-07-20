import { syncSheetRow } from "./sheets.functions";

type Tab = "Clientes" | "Ordens de Servico" | "Orcamentos" | "Agendamentos";

// Fire-and-forget: never blocks the UI, logs failures.
export function pushSheet(
  tab: Tab,
  id: string,
  values: (string | number | null)[],
) {
  syncSheetRow({ data: { tab, id, values, action: "upsert" } }).catch((e) => {
    console.warn("[sheets] sync falhou", tab, id, e);
  });
}

export function deleteSheet(tab: Tab, id: string) {
  syncSheetRow({ data: { tab, id, values: [], action: "delete" } }).catch(
    (e) => console.warn("[sheets] delete falhou", tab, id, e),
  );
}

export function fmtDate(ms?: number): string {
  return ms ? new Date(ms).toLocaleString("pt-BR") : "";
}
