"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/catalog", label: "Catalogue" },
  { href: "/watchlist", label: "À voir" },
  { href: "/top", label: "Top 3" },
];

export default function MobileLibraryHeader({ count }: { count?: number }) {
  const pathname = usePathname();
  return (
    <header className="md:hidden">
      <div className="flex items-start justify-between gap-4">
        <div><h1 className="text-[2rem] font-bold leading-none tracking-[-0.045em]">Bibliothèque</h1>{typeof count === "number" && <p className="mt-2 text-sm text-muted-foreground">{count} film{count > 1 ? "s" : ""}</p>}</div>
        <Link href="/search" aria-label="Rechercher" className="flex size-11 items-center justify-center rounded-full bg-muted"><Search className="size-5" /></Link>
      </div>
      <nav aria-label="Sections de la bibliothèque" className="mt-7 grid grid-cols-3 rounded-full bg-muted p-1">
        {tabs.map((tab) => <Link key={tab.href} href={tab.href} aria-current={pathname === tab.href ? "page" : undefined} className={`flex min-h-11 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors ${pathname === tab.href ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>{tab.label}</Link>)}
      </nav>
    </header>
  );
}
