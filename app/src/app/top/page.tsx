"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { CatalogMovie } from "@/lib/services/catalog-api";
import { catalogApi } from "@/lib/services/catalog-api";
import { Medal, Search, Trophy, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

const TOP_STORAGE_KEY = "zen-top-three";

const rankStyles = [
  {
    label: "Top 1",
    badgeClass:
      "border-amber-300/60 bg-amber-100 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-100",
    icon: Trophy,
  },
  {
    label: "Top 2",
    badgeClass:
      "border-slate-300/70 bg-slate-100 text-slate-900 dark:border-slate-400/30 dark:bg-slate-400/15 dark:text-slate-100",
    icon: Medal,
  },
  {
    label: "Top 3",
    badgeClass:
      "border-orange-300/70 bg-orange-100 text-orange-900 dark:border-orange-400/30 dark:bg-orange-400/15 dark:text-orange-100",
    icon: Medal,
  },
] as const;

function readTopIds(): Array<string | null> {
  if (typeof window === "undefined") return [null, null, null];

  try {
    const raw = window.localStorage.getItem(TOP_STORAGE_KEY);
    if (!raw) return [null, null, null];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [null, null, null];
    return [parsed[0] ?? null, parsed[1] ?? null, parsed[2] ?? null];
  } catch {
    return [null, null, null];
  }
}

function persistTopIds(topIds: Array<string | null>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOP_STORAGE_KEY, JSON.stringify(topIds));
}

function TopMovieCard({
  movie,
  rankIndex,
  onRemove,
}: {
  movie: CatalogMovie | null;
  rankIndex: number;
  onRemove: () => void;
}) {
  const rank = rankStyles[rankIndex];
  const RankIcon = rank.icon;

  return (
    <article className="flex flex-col gap-3">
      <div
        className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${rank.badgeClass}`}
      >
        <RankIcon className="size-3.5" />
        {rank.label}
      </div>

      {movie ? (
        <div className="overflow-hidden rounded-3xl border border-black/10 bg-background shadow-sm dark:border-white/10">
          <Link
            href={movie.tmdb_id ? `/movies/${movie.tmdb_id}` : "/catalog"}
            className="relative block aspect-[4/5] overflow-hidden"
          >
            <Image
              src={movie.poster_url || "/icons/favicon.png"}
              alt={movie.title}
              fill
              sizes="(max-width: 768px) 33vw, 25vw"
              className="object-cover"
            />
          </Link>

          <div className="space-y-3 p-4">
            <div className="space-y-1">
              <h2 className="line-clamp-2 text-lg font-semibold tracking-tight">
                {movie.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {movie.director || "Réalisateur inconnu"}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {movie.release_year || "Année inconnue"}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRemove}
                className="rounded-full"
              >
                <X className="size-3.5" />
                Retirer
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex aspect-[4/5] items-center justify-center rounded-3xl border border-dashed border-black/15 bg-black/[0.02] p-6 text-center dark:border-white/10 dark:bg-white/[0.03]">
          <div className="space-y-2">
            <p className="text-base font-medium">Aucun film sélectionné</p>
            <p className="text-sm text-muted-foreground">
              Choisis un film du catalogue dans la section plus bas.
            </p>
          </div>
        </div>
      )}
    </article>
  );
}

export default function TopPage() {
  const [catalogMovies, setCatalogMovies] = React.useState<CatalogMovie[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [topIds, setTopIds] = React.useState<Array<string | null>>([
    null,
    null,
    null,
  ]);

  React.useEffect(() => {
    setTopIds(readTopIds());
  }, []);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setIsLoading(true);
        const doc = await catalogApi.getCatalog();
        if (!mounted) return;
        setCatalogMovies(doc.movies || []);
      } catch (error) {
        console.error("Failed to load catalog for top page:", error);
        if (mounted) setCatalogMovies([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const topMovies = React.useMemo(
    () =>
      topIds.map((id) => catalogMovies.find((movie) => movie.id === id) || null),
    [catalogMovies, topIds],
  );

  const filteredCatalogMovies = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return catalogMovies;

    return catalogMovies.filter((movie) => {
      const title = movie.title.toLowerCase();
      const director = (movie.director || "").toLowerCase();
      return title.includes(normalizedQuery) || director.includes(normalizedQuery);
    });
  }, [catalogMovies, query]);

  const assignMovieToRank = (movieId: string, rankIndex: number) => {
    const nextTopIds = [...topIds];

    for (let index = 0; index < nextTopIds.length; index += 1) {
      if (nextTopIds[index] === movieId) {
        nextTopIds[index] = null;
      }
    }

    nextTopIds[rankIndex] = movieId;
    setTopIds(nextTopIds);
    persistTopIds(nextTopIds);

    toast.success(`Film placé en ${rankStyles[rankIndex].label.toLowerCase()}`);
  };

  const removeMovieFromRank = (rankIndex: number) => {
    const nextTopIds = [...topIds];
    nextTopIds[rankIndex] = null;
    setTopIds(nextTopIds);
    persistTopIds(nextTopIds);
  };

  if (isLoading && catalogMovies.length === 0) {
    return (
      <main className="px-6 py-8">
        <section className="mx-auto max-w-full px-4 space-y-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-3">
                <Skeleton className="h-7 w-20 rounded-full" />
                <Skeleton className="aspect-[4/5] w-full rounded-3xl" />
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <Skeleton className="h-10 w-full max-w-md rounded-xl" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[72px_1fr] gap-3 rounded-2xl border border-black/10 p-3 dark:border-white/10"
                >
                  <Skeleton className="aspect-[3/4] w-full rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                    <div className="flex gap-2">
                      {Array.from({ length: 3 }).map((__, buttonIndex) => (
                        <Skeleton
                          key={buttonIndex}
                          className="h-8 w-12 rounded-full"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="px-6 py-8">
      <section className="mx-auto max-w-full px-4 space-y-10">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight">Mon top 3</h1>
          <p className="text-sm text-muted-foreground">
            Choisis les trois meilleurs films vus dans ton catalogue.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {topMovies.map((movie, index) => (
            <TopMovieCard
              key={rankStyles[index].label}
              movie={movie}
              rankIndex={index}
              onRemove={() => removeMovieFromRank(index)}
            />
          ))}
        </div>

        <div className="space-y-5 border-t border-black/10 pt-8 dark:border-white/10">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold tracking-tight">
              Choisir ou modifier mon top
            </h2>
            <p className="text-sm text-muted-foreground">
              Recherche un film déjà présent dans ton catalogue, puis assigne-le à une place du top 3.
            </p>
          </div>

          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher dans les films vus"
              className="pl-9"
            />
          </div>

          {catalogMovies.length === 0 ? (
            <div className="py-12 text-center">
              <h3 className="text-lg font-semibold">Catalogue vide</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Ajoute d&apos;abord des films à ton catalogue pour créer ton top.
              </p>
            </div>
          ) : filteredCatalogMovies.length === 0 ? (
            <div className="py-12 text-center">
              <h3 className="text-lg font-semibold">Aucun film trouvé</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Aucun film du catalogue ne correspond à "{query}".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredCatalogMovies.map((movie) => (
                <article
                  key={movie.id}
                  className="grid grid-cols-[72px_1fr] gap-3 rounded-2xl border border-black/10 p-3 dark:border-white/10"
                >
                  <Link
                    href={movie.tmdb_id ? `/movies/${movie.tmdb_id}` : "/catalog"}
                    className="relative block aspect-[3/4] overflow-hidden rounded-xl bg-muted"
                  >
                    <Image
                      src={movie.poster_url || "/icons/favicon.png"}
                      alt={movie.title}
                      fill
                      sizes="72px"
                      className="object-cover"
                    />
                  </Link>

                  <div className="min-w-0 space-y-3">
                    <div className="space-y-1">
                      <h3 className="line-clamp-2 text-base font-semibold tracking-tight">
                        {movie.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {movie.director || "Réalisateur inconnu"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {rankStyles.map((rank, rankIndex) => (
                        <Button
                          key={rank.label}
                          type="button"
                          size="sm"
                          variant={
                            topIds[rankIndex] === movie.id ? "default" : "outline"
                          }
                          className="rounded-full"
                          onClick={() => assignMovieToRank(movie.id, rankIndex)}
                        >
                          {rank.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
