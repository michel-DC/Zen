"use client";

import MovieCard from "@/components/movie-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { catalogApi, type CatalogMovie } from "@/lib/services/catalog-api";
import { movieApi, type Movie } from "@/lib/services/movie-api";
import { ArrowRight, Clapperboard, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function CatalogManager() {
  const [query, setQuery] = useState("");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [catalogMovies, setCatalogMovies] = useState<CatalogMovie[]>([]);

  const normalizedQuery = useMemo(() => query.trim(), [query]);
  const catalogTmdbIds = useMemo(() => {
    return new Set(
      catalogMovies
        .map((movie) => movie.tmdb_id)
        .filter((id): id is number => Boolean(id)),
    );
  }, [catalogMovies]);

  const handleAddedToCatalog = (movieId: number) => {
    setCatalogMovies((currentMovies) => {
      if (currentMovies.some((movie) => movie.tmdb_id === movieId)) {
        return currentMovies;
      }

      return [
        ...currentMovies,
        {
          id: String(movieId),
          title: "",
          release_year: null,
          director: null,
          overview: null,
          poster_url: null,
          tmdb_id: movieId,
          genres: [],
          watched_at: null,
          rating: null,
          favorite: false,
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
    });
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const document = await catalogApi.getCatalog();
        if (mounted) {
          setCatalogMovies(document.movies || []);
        }
      } catch (error) {
        console.error("Failed to load catalog ids:", error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const doSearch = async (q: string) => {
    const value = q.trim();
    if (!value) {
      setMovies([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await movieApi.getMovies(1, 24, value);
      setMovies(response.data);
      if (response.data.length === 0) {
        toast.info("Aucun film trouvé", {
          description: `Aucun résultat ne correspond à "${value}".`,
        });
      }
    } catch (error) {
      console.error("Failed to search movies:", error);
      setMovies([]);
      toast.error("La recherche a échoué", {
        description: "Impossible de récupérer les films pour le moment.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-full -translate-y-2 flex-col items-center gap-10 sm:-translate-y-2 lg:-translate-y-2">
        <div className="w-full max-w-4xl space-y-3">
          {!normalizedQuery ? (
            <div className="flex flex-col items-center gap-3 px-1 text-center">
              <div className="space-y-2">
                <p className="text-base font-medium tracking-tight text-foreground sm:text-lg">
                  Cherche un film, explore les résultats, puis ajoute-le à ton
                  catalogue.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground sm:text-sm">
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2.5 py-1 dark:bg-white/8">
                    <Search className="size-3.5" />
                    Recherche instantanée
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2.5 py-1 dark:bg-white/8">
                    <Clapperboard className="size-3.5" />
                    Ajout en un clic
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <div className="relative rounded-3xl border border-white/10 bg-black/10 p-1 shadow-2xl backdrop-blur-2xl transition-all hover:bg-black/20 dark:bg-black/40 dark:hover:bg-black/50">
            <ArrowRight className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-black opacity-80 dark:text-white sm:left-6 sm:size-8" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  doSearch(query);
                }
              }}
              placeholder="Rechercher"
              autoComplete="off"
              className="h-14 rounded-2xl border-0 bg-transparent pl-12 pr-4 text-xl font-light tracking-tight text-foreground/90 shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0 sm:h-20 sm:pl-16 sm:pr-6 sm:text-5xl"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/catalog"
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-black/10 px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-black/20 dark:bg-white/5 dark:hover:bg-white/10"
          >
            Voir mon catalogue
          </Link>

          <Link
            href="/top"
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-black/10 px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-black/20 dark:bg-white/5 dark:hover:bg-white/10"
          >
            Voir mon top 3
          </Link>
        </div>

        {normalizedQuery ? (
          <div className="w-full">
            {isLoading && movies.length === 0 ? (
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {Array.from({ length: 10 }).map((_, index) => (
                  <div key={index} className="flex flex-col gap-3">
                    <Skeleton className="aspect-2/3 w-full rounded-xl" />
                    <div className="space-y-2 px-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : movies.length > 0 ? (
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {movies.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    id={movie.id}
                    image={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                    title={movie.title}
                    author={movie.director || "Inconnu"}
                    palette={movie.palette}
                    isInCatalog={catalogTmdbIds.has(movie.id)}
                    onAddedToCatalog={handleAddedToCatalog}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}
