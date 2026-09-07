"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ModeToggle } from "@/components/layout/mode-toggle";
import { HeaderLoadingLine } from "@/components/layout/loading-line-provider";
const navigationItems = [
  { href: "/", label: "Recherche" }, { href: "/catalog", label: "Catalogue" },
  { href: "/top", label: "Top 3" }, { href: "/recommendations", label: "Recommandations" }, { href: "/watchlist", label: "À voir" },
];
export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [open]);
  return <header className="sticky top-0 z-40 border-b bg-background">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">Aller au contenu</a>
    <div className="flex h-16 w-full items-center gap-6 px-4 sm:px-6 lg:px-8">
      <Link href="/" aria-label="Zen — accueil" className="flex shrink-0 items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-ring"><Image src="/icons/favicon.png" alt="" width={28} height={28} /><span className="text-lg font-semibold tracking-tight">Zen</span></Link>
      <Separator orientation="vertical" className="hidden h-5! md:block" />
      <nav aria-label="Navigation principale" className="hidden items-center gap-1 md:flex">{navigationItems.map((item) => <Button key={item.href} asChild variant={pathname === item.href ? "secondary" : "ghost"}><Link href={item.href} aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link></Button>)}</nav>
      <div className="ml-auto flex items-center gap-2"><ModeToggle /><Button variant="outline" size="icon" className="md:hidden" aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</Button></div>
    </div>
    {open && <nav id="mobile-navigation" aria-label="Navigation mobile" className="absolute inset-x-0 top-full flex flex-col gap-1 border-b bg-background p-4 md:hidden">{navigationItems.map((item) => <Button key={item.href} asChild variant={pathname === item.href ? "secondary" : "ghost"} className="h-11 justify-start"><Link href={item.href} onClick={() => setOpen(false)} aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link></Button>)}</nav>}
    <HeaderLoadingLine />
  </header>;
}
