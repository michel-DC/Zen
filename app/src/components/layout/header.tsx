"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/layout/mode-toggle";
import { HeaderLoadingLine } from "@/components/layout/loading-line-provider";
const navigationItems = [
  { href: "/", label: "Recherche" }, { href: "/catalog", label: "Catalogue" },
  { href: "/top", label: "Top 3" }, { href: "/recommendations", label: "Recommandations" }, { href: "/watchlist", label: "À voir" }, { href: "/tonight", label: "Ce soir" }, { href: "/journeys", label: "Parcours" },
];
export default function Header() {
  const pathname = usePathname();
  if (pathname === "/unlock") return null;
  return <header className="sticky top-0 z-40 hidden bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:block">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">Aller au contenu</a>
    <div className="flex h-14 w-full items-center gap-6 px-4 sm:px-6 lg:px-8">
      <Link href="/" aria-label="Zen — accueil" className="flex h-11 shrink-0 items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-ring md:h-auto"><Image src="/icons/favicon.png" alt="" width={24} height={24} /><span className="text-sm font-semibold tracking-tight">Zen</span></Link>
      <nav aria-label="Navigation principale" className="hidden items-center gap-1 md:flex">{navigationItems.map((item) => <Button key={item.href} asChild variant="ghost" size="sm" className={pathname === item.href ? "bg-muted text-foreground" : "text-muted-foreground"}><Link href={item.href} aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link></Button>)}</nav>
      <div className="ml-auto flex items-center gap-2"><ModeToggle /></div>
    </div>
    <HeaderLoadingLine />
  </header>;
}
