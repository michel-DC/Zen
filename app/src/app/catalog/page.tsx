"use client";

import MovieCard from "@/components/movie-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CatalogMovie } from "@/lib/services/catalog-api";
import { catalogApi } from "@/lib/services/catalog-api";
import * as React from "react";

export default function CatalogPage() {
  const [movies, setMovies] = React.useState<CatalogMovie[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

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

  if (isLoading && movies.length === 0) {
    return (
      <main className="px-6 py-8">
        <section className="max-w-full mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-10">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <Skeleton className="aspect-2/3 w-full rounded-xl" />
                <div className="space-y-2 px-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
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
      <section className="max-w-full mx-auto px-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-10">
          {movies.map((m) => (
            <MovieCard
              key={m.id}
              id={m.tmdb_id ? Number(m.tmdb_id) : 0}
              image={m.poster_url || "/icons/favicon.png"}
              title={m.title}
              author={m.director || "Inconnu"}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
