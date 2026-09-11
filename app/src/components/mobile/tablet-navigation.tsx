"use client";

import { Compass, Home, Library, Search, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Accueil", icon: Home, matches: ["/"] },
  { href: "/catalog", label: "Bibliothèque", icon: Library, matches: ["/catalog", "/watchlist", "/top"] },
  { href: "/tonight", label: "Ce soir", icon: Compass, matches: ["/tonight", "/journeys"] },
  { href: "/search", label: "Recherche", icon: Search, matches: ["/search"] },
  { href: "/settings", label: "Réglages", icon: Settings, matches: ["/settings"] },
];

export default function TabletNavigation() {
  const pathname = usePathname();
  return (
    <aside className="zen-tablet-sidebar" aria-label="Navigation iPad">
      <Link href="/" aria-label="Zen — accueil" className="zen-tablet-logo">
        <Image src="/icons/favicon.png" alt="" width={28} height={28} />
      </Link>
      <nav>
        {items.map(({ href, label, icon: Icon, matches }) => {
          const active = matches.includes(pathname);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} data-active={active || undefined}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
