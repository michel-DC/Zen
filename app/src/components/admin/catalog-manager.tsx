"use client";

import MovieCard from "@/components/movie-card";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { PageHeading } from "@/components/layout/page-heading";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { catalogApi, type CatalogMovie } from "@/lib/services/catalog-api";
import { movieApi, type Movie } from "@/lib/services/movie-api";
import { Search, ArrowRight } from "lucide-react";
import Link from "next/link";
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

  return <main id="main-content" className="w-full px-4 py-8 sm:px-6 lg:px-8">
    <section className="space-y-8">
      <PageHeading title="Recherche" description="Trouve ton prochain film et enrichis ta collection.">
        <ButtonGroup aria-label="Ma collection"><Button asChild variant="outline"><Link href="/catalog">Catalogue</Link></Button><Button asChild variant="outline"><Link href="/watchlist">À voir</Link></Button></ButtonGroup>
      </PageHeading>
      <div className={submittedQuery ? "w-full" : "w-full py-8 sm:py-12"}>
        {!submittedQuery && <div className="mb-8 space-y-3"><h2 className="text-3xl font-semibold tracking-tight">Quel film as-tu en tête ?</h2><p className="text-sm leading-6 text-muted-foreground">Une envie, un classique à revoir, une nouvelle découverte.<br />Tout commence par un titre.</p></div>}
        <form role="search" onSubmit={(event) => { event.preventDefault(); const value = query.trim(); if (value === submittedQuery) setRetry((n) => n + 1); else router.push(value ? '/?search=' + encodeURIComponent(value) : '/', { scroll: false }); }}>
          <Field><FieldLabel htmlFor="movie-search">Rechercher un film</FieldLabel>
            <div className="flex flex-col gap-2 sm:flex-row"><div className="relative min-w-0 flex-1"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="movie-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ex. Interstellar, Le Voyage de Chihiro…" autoComplete="off" className="h-10 pl-9" /></div><Button type="submit" size="lg" disabled={!normalizedQuery || isLoading}>{isLoading ? "Recherche…" : "Rechercher"}<ArrowRight data-icon="inline-end" /></Button></div>
            <FieldDescription>Ajoute ensuite tes découvertes au catalogue ou à ta liste à voir.</FieldDescription>
          </Field>
        </form>
      </div>
      {submittedQuery && <section aria-label="Résultats de recherche" aria-busy={isLoading} className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3"><h2 className="text-lg font-semibold">Résultats pour « {submittedQuery} »</h2><span role="status" className="text-sm text-muted-foreground">{isLoading ? "Recherche en cours…" : searchError ? "Recherche indisponible" : movies.length + " film" + (movies.length > 1 ? "s" : "")}</span></div>
        {isLoading ? <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, index) => <MovieCard.Skeleton key={index} />)}</div>
          : searchError ? <div role="alert" className="rounded-lg border p-8 text-center"><h3 className="font-medium">La recherche est indisponible</h3><p className="mb-4 mt-2 text-sm text-muted-foreground">Impossible de récupérer les films pour le moment.</p><Button variant="outline" onClick={() => setRetry((n) => n + 1)}>Réessayer</Button></div>
          : movies.length ? <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">{movies.map((movie) => <MovieCard key={movie.id} id={movie.id} image={movie.poster_path ? 'https://image.tmdb.org/t/p/w500' + movie.poster_path : null} title={movie.title} author={movie.director || "Inconnu"} palette={movie.palette} isInCatalog={catalogTmdbIds.has(movie.id)} isInWatchlist={watchlistTmdbIds.has(movie.id)} onAddedToCatalog={handleAddedToCatalog} />)}</div>
          : <div className="py-16 text-center"><h3 className="font-medium">Aucun film trouvé</h3><p className="mt-2 text-sm text-muted-foreground">Vérifie le titre ou essaie une autre recherche.</p></div>}
      </section>}
    </section>
  </main>;
}
