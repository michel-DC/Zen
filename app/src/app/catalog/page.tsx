"use client";

import MovieCard from "@/components/movie-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { CatalogMovie } from "@/lib/services/catalog-api";
import { catalogApi } from "@/lib/services/catalog-api";
import { Search, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

type CatalogGroup = {
  key: string;
  label: string;
  movies: CatalogMovie[];
};

function formatDateLabel(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "Date inconnue";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function groupMoviesByAddedDate(movies: CatalogMovie[]): CatalogGroup[] {
  const grouped = new Map<string, CatalogMovie[]>();

  for (const movie of movies) {
    const key = formatDateLabel(movie.created_at);
    const current = grouped.get(key) || [];
    current.push(movie);
    grouped.set(key, current);
  }

  return Array.from(grouped.entries()).map(([key, value]) => ({
    key,
    label: key,
    movies: value,
  }));
}

export default function CatalogPage() {
  const [movies, setMovies] = React.useState<CatalogMovie[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setIsLoading(true);
        const doc = await catalogApi.getCatalog();
        // catalogApi returns { movies: CatalogMovie[] }
        const list = doc.movies || [];
        if (!mounted) return;
        setMovies(list);
      } catch (err) {
        console.error("Failed to load catalog:", err);
        setMovies([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredMovies = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return movies;

    return movies.filter((movie) => {
      const title = movie.title.toLowerCase();
      const director = (movie.director || "").toLowerCase();
      return title.includes(normalizedQuery) || director.includes(normalizedQuery);
    });
  }, [movies, query]);

  const groupedMovies = React.useMemo(
    () => groupMoviesByAddedDate(filteredMovies),
    [filteredMovies],
  );

  const handleDelete = async (movieId: string) => {
    try {
      setDeletingId(movieId);
      await catalogApi.deleteMovie(movieId);
      setMovies((currentMovies) =>
        currentMovies.filter((movie) => movie.id !== movieId),
      );
      toast.success("Film supprimé du catalogue");
    } catch (error: any) {
      toast.error(error?.message || "Impossible de supprimer ce film");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading && movies.length === 0) {
    return (
      <main className="px-6 py-8">
        <section className="mx-auto max-w-full px-4">
          <div className="space-y-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-7 w-36" />
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((__, index) => (
                    <div key={index} className="space-y-3">
                      <MovieCard.Skeleton />
                      <Skeleton className="h-8 w-24 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="px-6 py-8">
      <section className="mx-auto max-w-full px-4 space-y-8">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher dans le catalogue"
            className="pl-9"
          />
        </div>

        {movies.length === 0 ? (
          <div className="py-16 text-center">
            <h2 className="text-xl font-semibold">Catalogue vide</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Ajoute d&apos;abord des films depuis la page /app.
            </p>
          </div>
        ) : groupedMovies.length === 0 ? (
          <div className="py-16 text-center">
            <h2 className="text-xl font-semibold">Aucun film trouvé</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Aucun film du catalogue ne correspond à "{query}".
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedMovies.map((group) => (
              <section key={group.key} className="space-y-4">
                <div className="border-b border-black/10 pb-2 dark:border-white/10">
                  <h2 className="text-lg font-semibold tracking-tight">
                    {group.label}
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {group.movies.map((movie) => (
                    <div key={movie.id} className="flex flex-col gap-3">
                      <MovieCard
                        id={movie.tmdb_id ? Number(movie.tmdb_id) : 0}
                        image={movie.poster_url}
                        title={movie.title}
                        author={movie.director || "Inconnu"}
                      />
                      <div className="flex items-center justify-between gap-3 px-1">
                        <span className="text-xs text-muted-foreground">
                          {movie.release_year || "Année inconnue"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDelete(movie.id)}
                          disabled={deletingId === movie.id}
                          aria-label={`Supprimer ${movie.title} du catalogue`}
                          title="Supprimer"
                          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-700 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/15"
                        >
                          <Trash2
                            className={`size-3.5 ${deletingId === movie.id ? "animate-pulse" : ""}`}
                          />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
