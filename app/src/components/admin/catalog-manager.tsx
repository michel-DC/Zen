"use client";

import MovieCard from "@/components/movie-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { catalogApi, type CatalogMovie } from "@/lib/services/catalog-api";
import { movieApi, type Movie } from "@/lib/services/movie-api";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const DEBOUNCE_DELAY = 350;

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
    } catch (error) {
      console.error("Failed to search movies:", error);
      setMovies([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-full -translate-y-2 flex-col items-center gap-10 sm:-translate-y-2 lg:-translate-y-2">
        <div className="relative w-full max-w-4xl rounded-3xl border border-white/10 bg-black/10 p-1 shadow-2xl backdrop-blur-2xl transition-all hover:bg-black/20 dark:bg-black/40 dark:hover:bg-black/50">
          <ArrowRight className="pointer-events-none absolute left-6 top-1/2 size-8 -translate-y-1/2 text-black opacity-80 dark:text-white" />
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
            className="h-16 rounded-2xl border-0 bg-transparent pl-16 pr-6 font-mono text-3xl font-light tracking-tight text-foreground/90 shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0 sm:h-20 sm:text-5xl"
          />
        </div>

        <Link
          href="/catalog"
          className="inline-flex items-center justify-center rounded-full border border-white/15 bg-black/10 px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-black/20 dark:bg-white/5 dark:hover:bg-white/10"
        >
          Voir mon catalogue
        </Link>

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
