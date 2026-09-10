"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window { __zenInstallPrompt?: InstallPromptEvent; }
}

export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw-dev.js");
      return;
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => console.error("Service worker registration failed:", error));
    }
    const rememberPrompt = (event: Event) => {
      event.preventDefault();
      window.__zenInstallPrompt = event as InstallPromptEvent;
      window.dispatchEvent(new Event("zen-install-ready"));
    };
    window.addEventListener("beforeinstallprompt", rememberPrompt);
    const offerInstall = () => {
      if (localStorage.getItem("zen:install-offered")) return;
      localStorage.setItem("zen:install-offered", "1");
      const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
      if (!window.__zenInstallPrompt && !isIos) return;
      toast("Garder Zen à portée de main ?", {
        description: isIos ? "Dans Safari : Partager, puis Sur l’écran d’accueil." : "Installe l’application sur ton écran d’accueil.",
        action: window.__zenInstallPrompt ? { label: "Installer", onClick: () => void window.__zenInstallPrompt?.prompt() } : undefined,
        duration: 8000,
      });
    };
    window.addEventListener("zen-useful-action", offerInstall);
    return () => { window.removeEventListener("beforeinstallprompt", rememberPrompt); window.removeEventListener("zen-useful-action", offerInstall); };
  }, []);

  return null;
}
