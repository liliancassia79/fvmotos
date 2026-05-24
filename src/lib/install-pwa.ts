import { useEffect, useState } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS
      window.navigator.standalone === true;
    setInstalled(standalone);

    // Register minimal service worker (required for Android install prompt).
    // Skip in iframes and on Lovable preview hosts to avoid cache issues.
    try {
      const inIframe = window.self !== window.top;
      const host = window.location.hostname;
      const isPreview = host.includes("id-preview--") || host.includes("lovableproject.com");
      const allowSW = !inIframe && !isPreview;
      if ("serviceWorker" in navigator && allowSW && window.location.protocol === "https:") {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      }
    } catch {}

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferred(null);
      return;
    }
    // Fallback: iOS Safari / browsers without BIP
    const ua = navigator.userAgent;
    const iOS = /iPhone|iPad|iPod/.test(ua);
    if (iOS) {
      alert("Para instalar: toque em Compartilhar e depois em 'Adicionar à Tela de Início'.");
    } else {
      alert("Para instalar, abra o menu do navegador e escolha 'Instalar aplicativo' ou 'Adicionar à tela inicial'.");
    }
  }

  return { install, installed, canInstall: !!deferred };
}
