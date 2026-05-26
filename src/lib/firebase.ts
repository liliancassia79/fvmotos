import { initializeApp, getApps } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyApV0M-qe7vM06Efqh5a9dZ9A_s5yUa09g",
  authDomain: "oficina-fv.firebaseapp.com",
  projectId: "oficina-fv",
  storageBucket: "oficina-fv.firebasestorage.app",
  messagingSenderId: "412160130965",
  appId: "1:412160130965:web:d129eff202bc24deaf009c",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);

// Ativa cache offline (IndexedDB) — apenas no browser
if (typeof window !== "undefined") {
  enableIndexedDbPersistence(db, { forceOwnership: true }).catch((err: any) => {
    if (err?.code === "failed-precondition") {
      console.log("[Firestore] Offline: múltiplas abas abertas");
    } else if (err?.code === "unimplemented") {
      console.log("[Firestore] Offline: navegador não suporta");
    }
  });
}
