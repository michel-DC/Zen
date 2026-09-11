"use client";

import MovieCard from "@/components/movie-card";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { catalogApi, type CatalogMovie } from "@/lib/services/catalog-api";
import { movieApi, type Movie } from "@/lib/services/movie-api";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function CatalogManager() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const submittedQuery = searchParams.get("search")?.trim() || "";
  const [query, setQuery] = useState(submittedQuery);
  const [searchError, setSearchError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [catalogMovies, setCatalogMovies] = useState<CatalogMovie[]>([]);
  const [watchlistMovies, setWatchlistMovies] = useState<CatalogMovie[]>([]);

  const normalizedQuery = useMemo(() => query.trim(), [query]);
  const catalogTmdbIds = useMemo(() => {
    return new Set(
      catalogMovies
        .map((movie) => movie.tmdb_id)
        .filter((id): id is number => Boolean(id)),
    );
  }, [catalogMovies]);
  const watchlistTmdbIds = useMemo(() => new Set(watchlistMovies.map((movie) => movie.tmdb_id).filter((id): id is number => Boolean(id))), [watchlistMovies]);

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
          rating_history: [],
          favorite: false,
          notes: null,
          viewings: [],
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
          setWatchlistMovies(document.watchlist || []);
        }
      } catch (error) {
        console.error("Failed to load catalog ids:", error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setQuery(submittedQuery);
    setSearchError(false);
    if (!submittedQuery) { setMovies([]); setIsLoading(false); return; }
    let active = true;
    setIsLoading(true);
    setMovies([]);
    movieApi.getMovies(1, 24, submittedQuery)
      .then((response) => { if (active) setMovies(response.data); })
      .catch(() => { if (active) setSearchError(true); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [submittedQuery, retry]);

  return <main id="main-content" className={submittedQuery ? "w-full px-4 pb-12 sm:px-6 lg:px-8" : "w-full px-4 sm:px-6 lg:px-8"}>
    <section className="space-y-10">
      <div className={submittedQuery ? "border-b py-6 sm:py-8" : "flex min-h-[calc(100svh-3.5rem)] items-center justify-center py-12"}>
        <div className={submittedQuery ? "w-full" : "w-full max-w-3xl"}>
          <form role="search" onSubmit={(event) => { event.preventDefault(); const value = query.trim(); if (value === submittedQuery) setRetry((n) => n + 1); else router.push(value ? '/?search=' + encodeURIComponent(value) : '/', { scroll: false }); }} className={submittedQuery ? "w-full" : "mx-auto w-full max-w-xs sm:max-w-2xl"}>
            <label htmlFor="movie-search" className="sr-only">Rechercher un film</label>
            <ButtonGroup className="w-full shadow-xs">
              <Input id="movie-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un film…" autoComplete="off" enterKeyHint="search" className="h-14! min-w-0 flex-1 px-5 text-base sm:h-10! sm:text-sm" style={{ width: 0 }} />
              <Button type="submit" disabled={!normalizedQuery || isLoading} aria-label={isLoading ? "Recherche en cours" : "Rechercher"} className="h-14! w-14! px-0 sm:h-10! sm:w-auto! sm:px-4"><span className="hidden sm:inline">{isLoading ? "Recherche…" : "Rechercher"}</span><ArrowRight aria-hidden="true" /></Button>
            </ButtonGroup>
          </form>
        </div>
      </div>
      {submittedQuery && <section aria-label="Résultats de recherche" aria-busy={isLoading} className="space-y-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3"><div className="flex items-baseline gap-3"><h1 className="text-2xl font-semibold tracking-tight">Résultats</h1><span className="text-sm text-muted-foreground">« {submittedQuery} »</span></div><span role="status" className="text-sm text-muted-foreground">{isLoading ? "Recherche en cours…" : searchError ? "Recherche indisponible" : movies.length + " film" + (movies.length > 1 ? "s" : "")}</span></div>
        {isLoading ? <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, index) => <MovieCard.Skeleton key={index} />)}</div>
          : searchError ? <div role="alert" className="rounded-lg border p-8 text-center"><h3 className="font-medium">La recherche est indisponible</h3><p className="mb-4 mt-2 text-sm text-muted-foreground">Impossible de récupérer les films pour le moment.</p><Button variant="outline" onClick={() => setRetry((n) => n + 1)}>Réessayer</Button></div>
          : movies.length ? <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">{movies.map((movie) => <MovieCard key={movie.id} id={movie.id} image={movie.poster_path ? 'https://image.tmdb.org/t/p/w500' + movie.poster_path : null} title={movie.title} author={movie.director || "Inconnu"} palette={movie.palette} isInCatalog={catalogTmdbIds.has(movie.id)} isInWatchlist={watchlistTmdbIds.has(movie.id)} onAddedToCatalog={handleAddedToCatalog} />)}</div>
          : <div className="py-16 text-center"><h3 className="font-medium">Aucun film trouvé</h3><p className="mt-2 text-sm text-muted-foreground">Vérifie le titre ou essaie une autre recherche.</p></div>}
      </section>}
    </section>
  </main>;
}
