import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { openDB, type IDBPDatabase } from "idb";
import { storage } from "./firebase";

const ROOT = "moto-fotos";
const DB_NAME = "foto-queue";
const STORE = "uploads";
const PENDING_PREFIX = "pending:";

type QueueItem = {
  id?: number;
  placeholderId: string; // "pending:<uuid>"
  osId: string;
  file: File;
  path: string;
  timestamp: number;
};

const getDB = (): Promise<IDBPDatabase> =>
  openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    },
  });

// preview em memória apenas durante a sessão
const previewMap = new Map<string, string>();

export function resolveFotoPreview(url: string): string {
  if (url && url.startsWith(PENDING_PREFIX)) {
    return previewMap.get(url) ?? url;
  }
  return url;
}

export function isPendingFoto(url: string): boolean {
  return !!url && url.startsWith(PENDING_PREFIX);
}

type PendingResolver = (osId: string, placeholderId: string, finalUrl: string) => Promise<void>;
let resolver: PendingResolver | null = null;
export function registerPendingResolver(fn: PendingResolver) { resolver = fn; }

export async function reassignQueueOsId(oldOsId: string, newOsId: string) {
  if (!oldOsId || oldOsId === newOsId) return;
  try {
    const db = await getDB();
    const all = (await db.getAll(STORE)) as QueueItem[];
    for (const it of all) {
      if (it.osId === oldOsId) {
        it.osId = newOsId;
        await db.put(STORE, it);
      }
    }
  } catch (e) { console.warn("[fotos] reassignQueueOsId", e); }
}

async function tryUpload(file: File, path: string): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, {
    contentType: file.type || "image/jpeg",
    cacheControl: "public,max-age=31536000",
  });
  return await getDownloadURL(storageRef);
}

export async function uploadFotoMoto(file: File, osId: string): Promise<string> {
  const ext = (file.type.split("/")[1] || "jpg").toLowerCase();
  const path = `${ROOT}/${osId}/${crypto.randomUUID()}.${ext}`;
  try {
    return await tryUpload(file, path);
  } catch (e: any) {
    const code = e?.code as string | undefined;
    if (code === "storage/unauthorized") {
      throw new Error("Sem permissão para enviar (verifique as regras do Firebase Storage).");
    }
    // enfileira e devolve placeholder — a UI mostrará o preview local até subir
    const placeholderId = `${PENDING_PREFIX}${crypto.randomUUID()}`;
    try { previewMap.set(placeholderId, URL.createObjectURL(file)); } catch {}
    try {
      const db = await getDB();
      await db.add(STORE, { placeholderId, osId, file, path, timestamp: Date.now() } satisfies QueueItem);
    } catch (err) { console.warn("[fotos] falha ao enfileirar", err); }
    console.warn("[fotos] offline — enfileirado", e);
    return placeholderId;
  }
}

export async function processQueue(): Promise<void> {
  let db: IDBPDatabase;
  try { db = await getDB(); } catch { return; }
  const all = (await db.getAll(STORE)) as QueueItem[];
  for (const item of all) {
    try {
      const finalUrl = await tryUpload(item.file, item.path);
      if (resolver) {
        try { await resolver(item.osId, item.placeholderId, finalUrl); }
        catch (e) { console.warn("[fotos] resolver falhou", e); continue; }
      }
      if (item.id != null) await db.delete(STORE, item.id);
      const preview = previewMap.get(item.placeholderId);
      if (preview) { try { URL.revokeObjectURL(preview); } catch {} previewMap.delete(item.placeholderId); }
    } catch (e) {
      console.warn("[fotos] tentativa falhou, manter na fila", e);
      break;
    }
  }
}

export async function removerFotoMoto(url: string): Promise<void> {
  if (url.startsWith("blob:")) {
    try { URL.revokeObjectURL(url); } catch {}
    return;
  }
  if (url.startsWith(PENDING_PREFIX)) {
    const preview = previewMap.get(url);
    if (preview) { try { URL.revokeObjectURL(preview); } catch {} previewMap.delete(url); }
    try {
      const db = await getDB();
      const all = (await db.getAll(STORE)) as QueueItem[];
      for (const it of all) {
        if (it.placeholderId === url && it.id != null) await db.delete(STORE, it.id);
      }
    } catch {}
    return;
  }
  const marker = `/o/${encodeURIComponent(ROOT)}%2F`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const end = url.indexOf("?", idx);
  const encoded = url.slice(idx + 3, end === -1 ? undefined : end);
  const path = decodeURIComponent(encoded);
  try { await deleteObject(ref(storage, path)); } catch (e) { console.warn("removerFoto", e); }
}

// Retry automático
if (typeof window !== "undefined") {
  window.addEventListener("online", () => { processQueue(); });
  setTimeout(() => { if (navigator.onLine) processQueue(); }, 4000);
}
