import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { openDB, type IDBPDatabase } from "idb";
import { storage } from "./firebase";

const ROOT = "moto-fotos";
const DB_NAME = "foto-queue";
const STORE = "uploads";

const getDB = (): Promise<IDBPDatabase> =>
  openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    },
  });

/** Upload genérico — tenta enviar, se falhar enfileira no IndexedDB. */
export const uploadFoto = async (file: File, path: string): Promise<string> => {
  try {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file, {
      contentType: file.type || "image/jpeg",
      cacheControl: "public,max-age=31536000",
    });
    return await getDownloadURL(storageRef);
  } catch (e) {
    const db = await getDB();
    await db.add(STORE, { file, path, timestamp: Date.now() });
    console.warn("[fotos] upload offline — enfileirado", e);
    throw new Error("OFFLINE_QUEUE");
  }
};

/** Reprocessa a fila — chamado quando volta a internet. */
export const processQueue = async (): Promise<void> => {
  const db = await getDB();
  const all = await db.getAll(STORE);
  for (const item of all as Array<{ id: number; file: File; path: string }>) {
    try {
      const storageRef = ref(storage, item.path);
      await uploadBytes(storageRef, item.file, {
        contentType: item.file.type || "image/jpeg",
        cacheControl: "public,max-age=31536000",
      });
      await db.delete(STORE, item.id);
    } catch {
      // mantém na fila pra próxima tentativa
      break;
    }
  }
};

// ---------- API usada pelo app (FotosUpload) ----------

export async function uploadFotoMoto(file: File, osId: string): Promise<string> {
  const ext = (file.type.split("/")[1] || "jpg").toLowerCase();
  const path = `${ROOT}/${osId}/${crypto.randomUUID()}.${ext}`;
  try {
    return await uploadFoto(file, path);
  } catch (e) {
    if ((e as Error).message === "OFFLINE_QUEUE") {
      // Mostra preview local imediato; sobe quando voltar a rede
      return URL.createObjectURL(file);
    }
    throw e;
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

// ---------- Retry automático ----------
if (typeof window !== "undefined") {
  window.addEventListener("online", () => { processQueue(); });
  setTimeout(() => { if (navigator.onLine) processQueue(); }, 4000);
}
