"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type LoadingLineContextValue = {
  isLoading: boolean;
  runId: number;
  startLoading: () => void;
  stopLoading: () => void;
  runAfterLoading: (
    task: () => void | Promise<void>,
    durationMs?: number,
  ) => Promise<void>;
};

const LoadingLineContext = createContext<LoadingLineContextValue | null>(null);

export function LoadingLineProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [runId, setRunId] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousRouteKeyRef = useRef<string | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const wait = useCallback(
    (durationMs: number) =>
      new Promise<void>((resolve) => {
        clearTimer();
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          resolve();
        }, durationMs);
      }),
    [clearTimer],
  );

  const startLoading = useCallback(() => {
    setRunId((prev) => prev + 1);
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    clearTimer();
    setIsLoading(false);
  }, [clearTimer]);

  const runAfterLoading = useCallback(
    async (task: () => void | Promise<void>, durationMs = 650) => {
      startLoading();
      await wait(durationMs);
      stopLoading();
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
      await task();
    },
    [startLoading, stopLoading, wait],
  );

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target as Element | null;
      const link = target?.closest("a[href]") as HTMLAnchorElement | null;

      if (!link) {
        return;
      }

      if (link.target && link.target !== "_self") {
        return;
      }

      if (link.hasAttribute("download")) {
        return;
      }

      const href = link.getAttribute("href");

      if (!href || href.startsWith("#")) {
        return;
      }

      const nextUrl = new URL(link.href, window.location.href);

      if (nextUrl.origin !== window.location.origin) {
        return;
      }

      const currentUrl = new URL(window.location.href);
      const hasRealNavigation =
        nextUrl.pathname !== currentUrl.pathname ||
        nextUrl.search !== currentUrl.search;

      if (hasRealNavigation) {
        startLoading();
      }
    };

    const handlePopstate = () => {
      startLoading();
    };

    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("popstate", handlePopstate);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("popstate", handlePopstate);
    };
  }, [startLoading]);

  useEffect(() => {
    const routeKey = `${pathname}?${searchParams.toString()}`;

    if (previousRouteKeyRef.current === null) {
      previousRouteKeyRef.current = routeKey;
      return;
    }

    if (previousRouteKeyRef.current !== routeKey) {
      previousRouteKeyRef.current = routeKey;
      stopLoading();
    }
  }, [pathname, searchParams, stopLoading]);

  useEffect(() => {
    if (document.readyState !== "complete") {
      startLoading();

      const handleLoad = () => {
        stopLoading();
      };

      window.addEventListener("load", handleLoad, { once: true });

      return () => {
        window.removeEventListener("load", handleLoad);
      };
    }
  }, [startLoading, stopLoading]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      startLoading();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearTimer();
    };
  }, [clearTimer, startLoading]);

  const value = useMemo(
    () => ({ isLoading, runId, startLoading, stopLoading, runAfterLoading }),
    [isLoading, runId, startLoading, stopLoading, runAfterLoading],
  );

  return (
    <LoadingLineContext.Provider value={value}>
      {children}
    </LoadingLineContext.Provider>
  );
}

export function useLoadingLine() {
  const context = useContext(LoadingLineContext);

  if (!context) {
    throw new Error("useLoadingLine must be used within LoadingLineProvider");
  }

  return context;
}

export function HeaderLoadingLine() {
  const { isLoading, runId } = useLoadingLine();

  return (
    <div className="pointer-events-none absolute left-0 top-full z-60 h-px w-full overflow-hidden">
      {isLoading && (
        <div
          key={runId}
          className="animate-zen-rainbow-loader absolute left-0 top-0 h-full w-full origin-left bg-[linear-gradient(90deg,#ff004c_0%,#ff8a00_16%,#ffe600_32%,#00d56f_48%,#00b8ff_64%,#7a5cff_80%,#ff00ad_100%)] bg-size-[200%_100%]"
        />
      )}
    </div>
  );
}
