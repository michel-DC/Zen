"use client";

import { Wifi, WifiOff } from "lucide-react";
import { usePathname } from "next/navigation";
import * as React from "react";

const SCROLL_KEY = "zen:scroll:";
const SYNC_KEY = "zen:last-catalog-sync";

function formatSyncTime(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function MobileExperience({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [online, setOnline] = React.useState(true);
  const [connectionRestored, setConnectionRestored] = React.useState(false);
  const [lastSync, setLastSync] = React.useState<string | null>(null);
  const wasOffline = React.useRef(false);
  const restoreOnNextRoute = React.useRef(false);

  React.useEffect(() => {
    setOnline(navigator.onLine);
    wasOffline.current = !navigator.onLine;
    setLastSync(localStorage.getItem(SYNC_KEY));

    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    document.documentElement.toggleAttribute("data-zen-standalone", standalone);

    const handleOffline = () => {
      wasOffline.current = true;
      setConnectionRestored(false);
      setOnline(false);
    };
    const handleOnline = () => {
      setOnline(true);
      if (wasOffline.current) setConnectionRestored(true);
      wasOffline.current = false;
    };
    const handleSync = () => setLastSync(localStorage.getItem(SYNC_KEY));

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    window.addEventListener("zen-catalog-synced", handleSync);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("zen-catalog-synced", handleSync);
      document.documentElement.removeAttribute("data-zen-standalone");
    };
  }, []);

  React.useEffect(() => {
    if (!connectionRestored) return;
    const timer = window.setTimeout(() => setConnectionRestored(false), 2800);
    return () => window.clearTimeout(timer);
  }, [connectionRestored]);

  React.useEffect(() => {
    const viewport = window.visualViewport;
    const updateKeyboardState = () => {
      const focused = document.activeElement?.matches("input, textarea, [contenteditable='true']") ?? false;
      const keyboardOpen = Boolean(focused && viewport && window.innerHeight - viewport.height > 120);
      document.documentElement.toggleAttribute("data-zen-keyboard-open", keyboardOpen);
    };
    viewport?.addEventListener("resize", updateKeyboardState);
    document.addEventListener("focusin", updateKeyboardState);
    document.addEventListener("focusout", updateKeyboardState);
    return () => {
      viewport?.removeEventListener("resize", updateKeyboardState);
      document.removeEventListener("focusin", updateKeyboardState);
      document.removeEventListener("focusout", updateKeyboardState);
      document.documentElement.removeAttribute("data-zen-keyboard-open");
    };
  }, []);

  React.useEffect(() => {
    const saveBeforeDetail = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!link || !new URL(link.href, window.location.href).pathname.startsWith("/movies/")) return;
      sessionStorage.setItem(`${SCROLL_KEY}${window.location.pathname}${window.location.search}`, String(window.scrollY));
    };
    const prepareRestore = () => { restoreOnNextRoute.current = true; };
    document.addEventListener("click", saveBeforeDetail, true);
    window.addEventListener("popstate", prepareRestore);
    return () => {
      document.removeEventListener("click", saveBeforeDetail, true);
      window.removeEventListener("popstate", prepareRestore);
    };
  }, []);

  React.useEffect(() => {
    if (!restoreOnNextRoute.current || !window.matchMedia("(max-width: 767px)").matches) return;
    restoreOnNextRoute.current = false;
    const position = Number(sessionStorage.getItem(`${SCROLL_KEY}${window.location.pathname}${window.location.search}`));
    if (!Number.isFinite(position) || position <= 0) return;
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: position, behavior: "auto" })));
  }, [pathname]);

  const syncTime = formatSyncTime(lastSync);
  return (
    <>
      <div key={pathname} className="zen-mobile-scene">{children}</div>
      {(!online || connectionRestored) && (
        <div className="zen-connection-status" role="status" aria-live="polite">
          {online ? <Wifi aria-hidden="true" /> : <WifiOff aria-hidden="true" />}
          <span>{online ? "Connexion rétablie" : `Hors ligne${syncTime ? ` · synchronisé à ${syncTime}` : ""}`}</span>
        </div>
      )}
    </>
  );
}
