import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase";

const ROOT = "moto-fotos";
const DB_NAME = "fv-motos-fotos-queue";
const STORE = "pending";

// ---------- IndexedDB (fila de upload offline) ----------
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(item: { id: string; osId: string; blob: Blob; type: string }) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbAll(): Promise<Array<{ id: string; osId: string; blob: Blob; type: string }>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function idbDel(id: string) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function doUpload(blob: Blob | File, osId: string, type: string): Promise<string> {
  const ext = (type.split("/")[1] || "jpg").toLowerCase();
  const path = `${ROOT}/${osId}/${crypto.randomUUID()}.${ext}`;
  const r = ref(storage, path);
  await uploadBytes(r, blob, { contentType: type, cacheControl: "public,max-age=31536000" });
  return getDownloadURL(r);
}

export async function uploadFotoMoto(file: File, osId: string): Promise<string> {
  const type = file.type || "image/jpeg";
  try {
    return await doUpload(file, osId, type);
  } catch (e) {
    // Sem rede: guarda no IndexedDB e devolve URL local temporária
    const id = crypto.randomUUID();
    try {
      await idbPut({ id, osId, blob: file, type });
      console.warn("[fotos] upload offline — enfileirado para retry", e);
    } catch (err) {
      console.error("[fotos] falha ao enfileirar offline", err);
    }
    scheduleFlush();
    return URL.createObjectURL(file);
  }
}

export async function removerFotoMoto(url: string): Promise<void> {
  if (url.startsWith("blob:")) {
    try { URL.revokeObjectURL(url); } catch {}
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

// ---------- Retry da fila ----------
let flushing = false;
async function flushQueue() {
  if (flushing) return;
  flushing = true;
  try {
    const pending = await idbAll();
    for (const item of pending) {
      try {
        await doUpload(item.blob, item.osId, item.type);
        await idbDel(item.id);
      } catch (e) {
        console.warn("[fotos] retry falhou, mantendo na fila", e);
        break;
      }
    }
  } finally {
    flushing = false;
  }
}

function scheduleFlush() {
  if (typeof window === "undefined") return;
  if (navigator.onLine) setTimeout(flushQueue, 2000);
}

if (typeof window !== "undefined") {
  window.addEventListener("online", flushQueue);
  setTimeout(() => { if (navigator.onLine) flushQueue(); }, 4000);
}
