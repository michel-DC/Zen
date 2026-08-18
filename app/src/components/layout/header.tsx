"use client";

import { HeaderLoadingLine } from "@/components/layout/loading-line-provider";
import { ModeToggle } from "@/components/layout/mode-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Brain,
  Check,
  ChevronDown,
  Clapperboard,
  Drama,
  Ghost,
  Heart,
  Laugh,
  Menu,
  Rocket,
  Search,
  Shield,
  Sparkles,
  Sword,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FaGithub } from "react-icons/fa6";

const navigationItems = [
  { href: "/app", label: "Recherche" },
  { href: "/catalog", label: "Catalogue" },
  { href: "/top", label: "Top" },
  { href: "/recommendations", label: "Recommandations" },
  { href: "/watchlist", label: "À voir" },
];

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(
    searchParams.get("search") || "",
  );

  const genres = [
    { label: "Action", icon: Clapperboard, iconClass: "text-red-500" },
    { label: "Drame", icon: Drama, iconClass: "text-orange-500" },
    { label: "Comédie", icon: Laugh, iconClass: "text-yellow-500" },
    { label: "Horreur", icon: Ghost, iconClass: "text-violet-500" },
    { label: "Science-fiction", icon: Rocket, iconClass: "text-cyan-500" },
    { label: "Fantastique", icon: Sword, iconClass: "text-amber-700" },
    { label: "Romance", icon: Heart, iconClass: "text-pink-500" },
    { label: "Thriller", icon: Shield, iconClass: "text-foreground" },
    { label: "Mystère", icon: Brain, iconClass: "text-green-500" },
    { label: "Animation", icon: Sparkles, iconClass: "text-fuchsia-500" },
  ];

  const filters = ["Récent", "Populaire", "Tendance"];
  const [selectedFilter, setSelectedFilter] = useState(
    searchParams.get("filter") || "Récent",
  );

  const currentGenreLabel = searchParams.get("genre") || "";
  const activeGenre =
    genres.find((g) => g.label === currentGenreLabel) || genres[0];
  const ActiveGenreIcon = activeGenre.icon;

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);

  /**
   * Met à jour l'URL avec les nouveaux paramètres
   */
  const updateUrl = useCallback(
    (paramsUpdates: Record<string, string | null>) => {
      const params = new URLSearchParams(window.location.search);

      Object.entries(paramsUpdates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      params.set("page", "1");
      router.push(`/?${params.toString()}`);
    },
    [router],
  );

  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter);
    updateUrl({ filter, genre: null, search: null });
  };

  const handleGenreChange = (genreLabel: string) => {
    updateUrl({ genre: genreLabel, filter: null, search: null });
  };

  /**
   * Met à jour l'URL avec la valeur de recherche (Debounced)
   */
  const performSearch = useCallback(
    (value: string) => {
      updateUrl({ search: value, filter: null, genre: null });
    },
    [updateUrl],
  );

  // Effet de Debounce pour la recherche dynamique
  useEffect(() => {
    if (!mounted) return;

    // Ne pas déclencher au premier montage si la valeur est identique à l'URL
    const currentSearch = searchParams.get("search") || "";
    if (searchValue === currentSearch) return;

    const timer = setTimeout(() => {
      performSearch(searchValue);
    }, 500); // 500ms d'attente après la fin de la frappe

    return () => clearTimeout(timer);
  }, [searchValue, performSearch, mounted, searchParams]);

  // Synchroniser searchValue si l'URL change (ex: clic sur logo)
  useEffect(() => {
    const currentSearch = searchParams.get("search") || "";
    if (currentSearch !== searchValue) {
      setSearchValue(currentSearch);
    }
  }, [searchParams]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchValue); // Force la recherche immédiate sur "Entrée"
  };

  if (!mounted) return null;

  const hideMovieFilters = ["/app", "/catalog", "/top", "/recommendations", "/watchlist"].includes(pathname);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-black/10 bg-white dark:border-border dark:bg-black">
      <div className="flex h-15 items-center gap-2 px-4 lg:gap-4 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image
            src="/icons/favicon.png"
            alt="Zen"
            width={26}
            height={26}
            className="h-8 w-8"
          />
          <span className="text-lg font-semibold text-foreground">Zen</span>
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-1 lg:flex">
          {navigationItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative px-2.5 py-2 text-sm transition-colors after:absolute after:inset-x-2.5 after:bottom-0 after:h-px after:origin-center after:bg-foreground after:transition-transform after:duration-200 after:ease-out motion-reduce:after:transition-none ${active ? "text-foreground after:scale-x-100" : "text-muted-foreground after:scale-x-0 hover:text-foreground"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        <div className="-mr-2 flex items-center gap-1 sm:gap-2 lg:gap-3">
          <form onSubmit={handleFormSubmit} className="relative hidden sm:block sm:w-57.5">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher..."
              autoComplete="off"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="peer h-10 w-full rounded-lg border border-background bg-muted px-3 py-1 pl-8 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#2a2a2a] dark:text-[#f2f2f2] dark:placeholder:text-[#9a9a9a] dark:shadow-none"
            />
          </form>

          {!hideMovieFilters && <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 hidden md:flex p-0s md:pl-1 md:pr-1"
              >
                <span className="mr-2 font-light text-gray-400">
                  Filtrer par:
                </span>
                {selectedFilter}
                <ChevronDown className="ml-2 h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 p-1">
              <div className="flex flex-col">
                {filters.map((filter) => (
                  <DropdownMenuItem
                    key={filter}
                    onClick={() => handleFilterChange(filter)}
                    className="flex items-center justify-between rounded-md px-3 py-2"
                  >
                    <span>{filter}</span>
                    {selectedFilter === filter && (
                      <Check className="h-4 w-4 text-foreground" />
                    )}
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>}

          {!hideMovieFilters && <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 p-0 md:pl-3 md:pr-3"
              >
                <span className="mr-1 flex h-6 w-6 items-center justify-center">
                  <ActiveGenreIcon
                    className={`h-4 w-4 ${activeGenre.iconClass}`}
                  />
                </span>
                <span className="hidden md:block">{activeGenre.label}</span>
                <span className="md:hidden font-semibold text-foreground">
                  {activeGenre.label}
                </span>
                <ChevronDown className="ml-2 h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {genres.map((genre) => {
                const Icon = genre.icon;
                return (
                  <DropdownMenuItem
                    key={genre.label}
                    className="py-1.5"
                    onClick={() => handleGenreChange(genre.label)}
                  >
                    <Icon className={`mr-1.5 h-4 w-4 ${genre.iconClass}`} />
                    <span>{genre.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>}

          <div className="origin-center scale-90">
            <ModeToggle />
          </div>

          <button
            type="button"
            aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="inline-flex size-11 items-center justify-center rounded-lg text-foreground transition-colors duration-150 hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring motion-reduce:transition-none lg:hidden"
          >
            {mobileMenuOpen ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>

          <Link
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden h-9 items-center justify-center whitespace-nowrap rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground xl:flex"
          >
            <FaGithub className="h-4 w-4" />
            <span className="sr-only">GitHub</span>
          </Link>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          id="mobile-navigation"
          className="absolute inset-x-0 top-full border-b border-black/10 bg-white px-4 py-2 dark:border-border dark:bg-black lg:hidden"
        >
          <nav aria-label="Navigation mobile" className="flex flex-col">
            {navigationItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex min-h-11 items-center text-base transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none ${active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <span
                    className={`relative py-2 after:absolute after:inset-x-0 after:bottom-1 after:h-px after:bg-foreground ${active ? "after:scale-x-100" : "after:scale-x-0"}`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      <HeaderLoadingLine />
    </header>
  );
}
