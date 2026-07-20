import { syncSheetRow } from "./sheets.functions";

type Tab = "Clientes" | "Ordens de Servico" | "Orcamentos" | "Agendamentos";

type SheetValue = string | number | null;

export function syncSheet(
  tab: Tab,
  id: string,
  values: SheetValue[],
  action: "upsert" | "delete" = "upsert",
) {
  return syncSheetRow({ data: { tab, id, values, action } }).then(() => undefined);
}

// Fire-and-forget: never blocks the UI, logs failures.
export function pushSheet(
  tab: Tab,
  id: string,
  values: SheetValue[],
) {
  syncSheet(tab, id, values).catch((e) => {
    console.warn("[sheets] sync falhou", tab, id, e);
  });
}

export function deleteSheet(tab: Tab, id: string) {
  syncSheet(tab, id, [], "delete").catch(
    (e) => console.warn("[sheets] delete falhou", tab, id, e),
  );
}

export function fmtDate(ms?: number): string {
  return ms ? new Date(ms).toLocaleString("pt-BR") : "";
}
