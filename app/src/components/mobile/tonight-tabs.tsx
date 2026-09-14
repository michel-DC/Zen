"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/tonight", label: "Ce soir" },
  { href: "/journeys", label: "Parcours" },
  { href: "/recommendations", label: "Similaires" },
];

export default function MobileTonightTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections de Ce soir" className="mt-7 grid grid-cols-3 rounded-xl bg-muted p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={pathname === tab.href ? "page" : undefined}
          className={`flex min-h-12 items-center justify-center rounded-[0.65rem] px-2 text-sm font-semibold transition-colors ${pathname === tab.href ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
