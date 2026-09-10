"use client";

import { Compass, Home, Library, Search, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Accueil", icon: Home, matches: ["/"] },
  { href: "/catalog", label: "Bibliothèque", icon: Library, matches: ["/catalog", "/watchlist", "/top"] },
  { href: "/recommendations", label: "Découvrir", icon: Compass, matches: ["/recommendations"] },
  { href: "/settings", label: "Réglages", icon: Settings, matches: ["/settings"] },
];

export default function MobileNavigation() {
  const pathname = usePathname();
  if (pathname.startsWith("/movies/")) return null;

  return (
    <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="mx-auto flex max-w-md items-end gap-2">
        <div className="flex min-w-0 flex-1 items-center justify-around rounded-[1.65rem] border border-black/8 bg-background/88 px-1.5 py-1.5 shadow-[0_10px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:border-white/10">
          {items.map((item) => {
            const active = item.matches.includes(pathname);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-14 min-w-14 flex-col items-center justify-center gap-1 rounded-[1.25rem] px-1 text-[0.625rem] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${active ? "bg-primary/10 text-primary" : "text-muted-foreground active:bg-muted"}`}>
                <Icon className="size-[1.15rem]" strokeWidth={active ? 2.4 : 1.9} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
        <Link
          href="/search"
          aria-label="Rechercher"
          aria-current={pathname === "/search" ? "page" : undefined}
          className={`flex size-[4.25rem] shrink-0 items-center justify-center rounded-full border shadow-[0_10px_32px_rgba(0,0,0,0.14)] backdrop-blur-xl transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${pathname === "/search" ? "border-primary bg-primary text-primary-foreground" : "border-black/8 bg-background/88 text-foreground dark:border-white/10"}`}
        >
          <Search className="size-6" strokeWidth={2.1} />
        </Link>
      </div>
    </nav>
  );
}
