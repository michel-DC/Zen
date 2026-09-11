"use client";

import { Compass, Home, Library, Search, Settings } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import styles from "./mobile-navigation.module.css";

const items = [
  { href: "/", label: "Accueil", icon: Home, matches: ["/"] },
  { href: "/catalog", label: "Bibliothèque", icon: Library, matches: ["/catalog", "/watchlist", "/top"] },
  { href: "/tonight", label: "Ce soir", icon: Compass, matches: ["/tonight", "/journeys"] },
  { href: "/search", label: "Rechercher", icon: Search, matches: ["/search"] },
  { href: "/settings", label: "Réglages", icon: Settings, matches: ["/settings"] },
];

function NavigationPendingState() {
  const { pending } = useLinkStatus();
  return <span className={styles.pending} data-pending={pending || undefined} aria-hidden="true" />;
}

export default function MobileNavigation() {
  const pathname = usePathname();
  if (pathname.startsWith("/movies/")) return null;

  const activeIndex = Math.max(
    items.findIndex((item) => item.matches.includes(pathname)),
    0,
  );

  return (
    <nav
      aria-label="Navigation principale"
      className={styles.navigation}
      data-zen-mobile-navigation
    >
      <div
        className={styles.dock}
        style={{ "--active-index": activeIndex } as React.CSSProperties}
      >
        <span className={styles.selection} aria-hidden="true" />
        {items.map((item) => {
          const active = item.matches.includes(pathname);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={styles.item}
              data-active={active || undefined}
              onClick={() => navigator.vibrate?.(8)}
            >
              <NavigationPendingState />
              <span className={styles.iconWrap} aria-hidden="true">
                <Icon className={styles.icon} strokeWidth={active ? 2.35 : 1.9} />
              </span>
              <span className={styles.label}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
