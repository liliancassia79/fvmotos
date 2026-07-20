import { syncSheetRow } from "./sheets.functions";

type Tab = "Clientes" | "Ordens de Servico" | "Orcamentos" | "Agendamentos";

type SheetValue = string | number | null;
type SheetAction = "upsert" | "delete";
type QueueItem = {
  key: string;
  tab: Tab;
  id: string;
  values: SheetValue[];
  action: SheetAction;
  attempts: number;
  nextTryAt: number;
};

const QUEUE_KEY = "fv-sheets-sync-queue-v1";
let draining = false;
let drainTimer: number | null = null;

function hasBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readQueue(): QueueItem[] {
  if (!hasBrowserStorage()) return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) as QueueItem[] : [];
  } catch (error) {
    console.warn("[sheets] fila local inválida", error);
    return [];
  }
}

function writeQueue(items: QueueItem[]) {
  if (!hasBrowserStorage()) return;
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

function requestDrain(delay = 0) {
  if (typeof window === "undefined") return;
  if (drainTimer) window.clearTimeout(drainTimer);
  drainTimer = window.setTimeout(() => {
    drainTimer = null;
    flushSheetQueue();
  }, delay);
}

function enqueueSheetSync(tab: Tab, id: string, values: SheetValue[], action: SheetAction) {
  if (!hasBrowserStorage()) {
    syncSheet(tab, id, values, action).catch((e) => console.warn("[sheets] sync falhou", tab, id, e));
    return;
  }

  const key = `${tab}:${id}`;
  const queue = readQueue().filter((item) => item.key !== key);
  queue.push({ key, tab, id, values, action, attempts: 0, nextTryAt: Date.now() });
  writeQueue(queue);
  requestDrain(0);
}

export function syncSheet(
  tab: Tab,
  id: string,
  values: SheetValue[],
  action: SheetAction = "upsert",
) {
  return syncSheetRow({ data: { tab, id, values, action } }).then(() => undefined);
}

export async function flushSheetQueue() {
  if (!hasBrowserStorage() || draining) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;

  draining = true;
  try {
    for (let sent = 0; sent < 8; sent += 1) {
      const queue = readQueue();
      const item = queue[0];
      if (!item) return;

      const wait = item.nextTryAt - Date.now();
      if (wait > 0) {
        requestDrain(wait);
        return;
      }

      try {
        await syncSheet(item.tab, item.id, item.values, item.action);
        writeQueue(readQueue().filter((queued) => queued.key !== item.key));
      } catch (error) {
        const attempts = item.attempts + 1;
        const delay = Math.min(5 * 60_000, 2_000 * (2 ** Math.min(attempts, 7)));
        const updated = readQueue();
        const index = updated.findIndex((queued) => queued.key === item.key);
        if (index >= 0) {
          updated[index] = { ...updated[index], attempts, nextTryAt: Date.now() + delay };
          writeQueue(updated);
        }
        console.warn("[sheets] sync em fila aguardando nova tentativa", item.tab, item.id, error);
        requestDrain(delay);
        return;
      }
    }

    if (readQueue().length > 0) requestDrain(1_000);
  } finally {
    draining = false;
  }
}

// Fire-and-forget com fila persistente: no celular, se a rede cair ou o app
// fechar, a sincronização fica salva e tenta novamente quando abrir/voltar online.
export function pushSheet(
  tab: Tab,
  id: string,
  values: SheetValue[],
) {
  enqueueSheetSync(tab, id, values, "upsert");
}

export function deleteSheet(tab: Tab, id: string) {
  enqueueSheetSync(tab, id, [], "delete");
}

export function fmtDate(ms?: number): string {
  return ms ? new Date(ms).toLocaleString("pt-BR") : "";
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => requestDrain(0));
  window.addEventListener("focus", () => requestDrain(0));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) requestDrain(0);
  });
  requestDrain(500);
}
