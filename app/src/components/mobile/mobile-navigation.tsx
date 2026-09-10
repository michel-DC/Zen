"use client";

import { Compass, Home, Library, Search, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Accueil", icon: Home, matches: ["/"] },
  { href: "/catalog", label: "Bibliothèque", icon: Library, matches: ["/catalog", "/watchlist", "/top"] },
  { href: "/recommendations", label: "Découvrir", icon: Compass, matches: ["/recommendations"] },
  { href: "/settings", label: "Réglages", icon: Settings, matches: ["/settings"] },
  { href: "/search", label: "Rechercher", icon: Search, matches: ["/search"] },
];

export default function MobileNavigation() {
  const pathname = usePathname();
  if (pathname.startsWith("/movies/")) return null;

  return (
    <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 rounded-[1.5rem] border border-black/7 bg-background/92 p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.1)] backdrop-blur-xl dark:border-white/10">
        {items.map((item) => {
          const active = item.matches.includes(pathname);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-[3.6rem] min-w-0 flex-col items-center justify-center gap-1 rounded-[1.05rem] px-1 text-[0.625rem] font-medium transition-[background-color,color,transform] duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97] ${active ? "bg-primary/10 text-foreground ring-1 ring-primary/10" : "text-muted-foreground active:bg-muted/80"}`}>
              <Icon className={`size-[1.1rem] ${active ? "text-primary" : ""}`} strokeWidth={active ? 2.25 : 1.85} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
