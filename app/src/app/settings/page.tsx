"use client";

import { clearLocalAppCache } from "@/lib/offline-catalog";
import { Check, Download, Moon, Smartphone, Sun, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";
import { toast } from "sonner";

const themes = [{ value: "light", label: "Clair", icon: Sun }, { value: "dark", label: "Sombre", icon: Moon }, { value: "system", label: "Système", icon: Smartphone }];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);
  const [installReady, setInstallReady] = React.useState(false);
  const isIos = mounted && /iphone|ipad|ipod/i.test(navigator.userAgent);
  React.useEffect(() => { const timer = window.setTimeout(() => { setMounted(true); setInstallReady(Boolean(window.__zenInstallPrompt)); }, 0); const ready = () => setInstallReady(true); window.addEventListener("zen-install-ready", ready); return () => { window.clearTimeout(timer); window.removeEventListener("zen-install-ready", ready); }; }, []);
  const install = async () => { if (window.__zenInstallPrompt) { await window.__zenInstallPrompt.prompt(); const choice = await window.__zenInstallPrompt.userChoice; if (choice.outcome === "accepted") toast.success("Zen est en cours d’installation"); } else if (isIos) toast.info("Dans Safari, touche Partager puis « Sur l’écran d’accueil »."); else toast.info("Utilise le menu du navigateur puis « Installer l’application »."); };
  const clear = async () => { setClearing(true); try { await clearLocalAppCache(); navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_ZEN_CACHE" }); toast.success("Mémoire locale vidée", { description: "Ton catalogue en ligne et ton thème sont conservés." }); } finally { setClearing(false); } };
  return (
    <main id="main-content" className="mx-auto w-full max-w-xl px-5 py-8 pt-[max(2rem,env(safe-area-inset-top))] md:max-w-xl md:py-12">
      <h1 className="text-[2rem] font-bold tracking-[-0.045em]">Réglages</h1>
      <section className="mt-9">
        <h2 className="text-sm font-semibold text-muted-foreground">Apparence</h2>
        <div className="mt-3 rounded-[1.4rem] bg-muted p-1.5">
          {themes.map(({ value, label, icon: Icon }) => (
            <button key={value} onClick={() => setTheme(value)} className="flex min-h-14 w-full items-center gap-3 rounded-[1.1rem] px-4 text-left active:bg-background/70">
              <Icon className="size-5 text-muted-foreground" /><span className="flex-1 font-medium">{label}</span>{mounted && theme === value && <Check className="size-5 text-primary" />}
            </button>
          ))}
        </div>
      </section>
      <section className="mt-9">
        <h2 className="text-sm font-semibold text-muted-foreground">Application</h2>
        <div className="mt-3 overflow-hidden rounded-[1.4rem] bg-muted p-1.5">
          <button onClick={() => void install()} className="flex min-h-16 w-full items-center gap-3 rounded-[1.1rem] px-4 text-left active:bg-background/70"><Download className="size-5 text-primary" /><span className="flex-1"><strong className="block font-medium">Installer Zen</strong><small className="mt-0.5 block text-sm text-muted-foreground">{installReady ? "Ajouter à l’écran d’accueil" : "Voir les instructions"}</small></span></button>
          <div className="mx-4 h-px bg-border" />
          <button onClick={() => void clear()} disabled={clearing} className="flex min-h-16 w-full items-center gap-3 rounded-[1.1rem] px-4 text-left text-destructive active:bg-background/70 disabled:opacity-50"><Trash2 className="size-5" /><span className="flex-1"><strong className="block font-medium">Vider la mémoire locale</strong><small className="mt-0.5 block text-sm text-muted-foreground">Conserve le catalogue en ligne et le thème</small></span></button>
        </div>
      </section>
    </main>
  );
}
