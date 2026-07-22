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

type PendingResolver = (osId: string, placeholderId: string, finalUrl: string) => Promise<boolean>;
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
    if (typeof window !== "undefined") {
      window.setTimeout(() => { processQueue(); }, 1200);
    }
  } catch (e) { console.warn("[fotos] reassignQueueOsId", e); }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Não foi possível ler a imagem.")); };
    img.src = url;
  });
}

async function compactarFotoLocal(file: File): Promise<string | null> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) return null;

  try {
    const img = await loadImage(file);
    let maxEdge = 1280;
    let quality = 0.72;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (dataUrl.length < 850_000 || attempt === 3) return dataUrl;
      maxEdge = Math.round(maxEdge * 0.78);
      quality = Math.max(0.52, quality - 0.08);
    }
  } catch (e) {
    console.warn("[fotos] fallback local falhou", e);
  }

  return null;
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
    const fallbackLocal = await compactarFotoLocal(file);
    if (fallbackLocal) {
      console.warn("[fotos] upload remoto falhou; foto salva localmente na O.S.", e);
      return fallbackLocal;
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
        let resolved = false;
        try { resolved = await resolver(item.osId, item.placeholderId, finalUrl); }
        catch (e) { console.warn("[fotos] resolver falhou", e); continue; }
        if (!resolved) {
          console.warn("[fotos] O.S. ainda não pronta para receber a foto; manter na fila", item.osId);
          continue;
        }
      } else {
        console.warn("[fotos] resolver não registrado; manter foto na fila");
        continue;
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
