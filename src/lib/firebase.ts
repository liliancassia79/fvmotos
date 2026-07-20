import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
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

function createFirestore() {
  if (typeof window === "undefined") return getFirestore(app);

  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch (err) {
    console.warn("[Firestore] Usando instância existente", err);
    return getFirestore(app);
  }
}

export const db = createFirestore();
export const storage = getStorage(app);
