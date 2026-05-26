import { initializeApp, getApps } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCSGkPJVW7_6ZBcGvlMVjhfuWhmenXPn0o",
  authDomain: "oficina-fv2.firebaseapp.com",
  projectId: "oficina-fv2",
  storageBucket: "oficina-fv2.firebasestorage.app",
  messagingSenderId: "323695982868",
  appId: "1:323695982868:web:cee93a1ad2de37503aea01",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);

// Cache offline (IndexedDB) — só no browser
if (typeof window !== "undefined") {
  enableIndexedDbPersistence(db, { forceOwnership: true }).catch((err: any) => {
    if (err?.code === "failed-precondition") {
      console.log("[Firestore] Offline: múltiplas abas abertas");
    } else if (err?.code === "unimplemented") {
      console.log("[Firestore] Offline: navegador não suporta");
    }
  });
}
