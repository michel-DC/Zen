"use client";

import MobileMovieTile from "@/components/mobile/movie-tile";
import MovieCard from "@/components/movie-card";
import { Skeleton } from "@/components/ui/skeleton";
import { catalogApi, type CatalogMoviePayload } from "@/lib/services/catalog-api";
import { movieApi, type Movie } from "@/lib/services/movie-api";
import { ArrowLeft, CircleAlert, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import AfterFilmDialog, { type AfterFilmPayload } from "@/components/journal/after-film-dialog";
import { syncJourneyAfterViewing } from "@/lib/journey-progress";

function moviePayload(movie: Movie): CatalogMoviePayload {
  return { title: movie.title, release_year: movie.release_year, director: movie.director, overview: movie.overview, poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null, tmdb_id: movie.id, genres: [], watched_at: null, rating: null, favorite: false, notes: null };
}

export default function SearchPage() {
  const router = useRouter();
  const params = useSearchParams();
  const submitted = params.get("q")?.trim() || "";
  const [query, setQuery] = React.useState(submitted);
  const [movies, setMovies] = React.useState<Movie[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [retry, setRetry] = React.useState(0);
  const [afterFilmMovie, setAfterFilmMovie] = React.useState<Movie | null>(null);
  const goBack = () => { if (window.history.length > 1) router.back(); else router.push("/"); };

  React.useEffect(() => {
    if (!submitted) return;
    let active = true;
    setLoading(true);
    setFailed(false);
    movieApi.getMovies(1, 24, submitted).then((result) => { if (active) setMovies(result.data); }).catch(() => { if (active) setFailed(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [submitted, retry]);

  const submit = (event: React.FormEvent) => { event.preventDefault(); const value = query.trim(); router.push(value ? `/search?q=${encodeURIComponent(value)}` : "/search"); };
  const add = async (movie: Movie, target: "catalog" | "watchlist") => {
    if (target === "catalog") { setAfterFilmMovie(movie); return; }
    try {
      await catalogApi.createWatchlistMovie(moviePayload(movie));
      window.dispatchEvent(new Event("zen-useful-action"));
      toast.success("Ajouté à À voir");
    } catch (error: unknown) { toast.error(error instanceof Error ? error.message : "Impossible d’ajouter ce film"); }
  };
  const saveAfterFilm = async (payload: AfterFilmPayload) => {
    if (!afterFilmMovie) return;
    try {
      const record = await catalogApi.createMovie({ ...moviePayload(afterFilmMovie), watched_at: payload.watched_at });
      const result = await catalogApi.createViewing(record.id, { ...payload, is_rewatch: false });
      void syncJourneyAfterViewing(result.movie, result.viewing.id).catch(() => undefined);
      window.dispatchEvent(new Event("zen-useful-action"));
      toast.success("Ajouté au catalogue");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Impossible d’ajouter ce film"); throw error; }
  };

  return (
    <main id="main-content" className="zen-mobile-page mx-auto w-full max-w-7xl px-5 pb-8 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 md:py-8 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-2">
          <button onClick={goBack} aria-label="Retour à la page précédente" className="flex size-11 shrink-0 items-center justify-center rounded-full active:bg-muted md:hidden"><ArrowLeft className="size-5" /></button>
        <form role="search" onSubmit={submit} className="flex min-h-14 min-w-0 flex-1 items-center gap-2 rounded-2xl bg-muted px-4 md:rounded-xl">
          <Search className="size-5 shrink-0 text-muted-foreground" />
          <label htmlFor="global-search" className="sr-only">Rechercher un film</label>
          <input id="global-search" autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un film" className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground" />
          {query && <button type="button" onClick={() => setQuery("")} aria-label="Effacer la recherche" className="flex size-11 items-center justify-center rounded-full"><X className="size-4" /></button>}
        </form></div>
        <section className="mt-8" aria-live="polite">
          <div className="flex items-end justify-between gap-4"><div><h1 className="text-2xl font-bold tracking-[-0.035em]">{submitted ? "Résultats" : "Recherche"}</h1>{submitted && <p className="mt-1 text-sm text-muted-foreground">Pour « {submitted} »</p>}</div>{!loading && submitted && !failed && <span className="text-sm text-muted-foreground">{movies.length} film{movies.length > 1 ? "s" : ""}</span>}</div>
          {loading ? <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="aspect-[2/3] rounded-[1.15rem]" />)}</div>
            : failed ? <div className="mt-12 text-center" role="alert"><CircleAlert className="mx-auto size-6 text-muted-foreground" /><h2 className="mt-3 font-semibold">Recherche momentanément indisponible</h2><p className="mt-1 text-sm text-muted-foreground">La connexion au service de films a échoué.</p><button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-5 min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">Réessayer</button></div>
            : movies.length ? <><div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-6 md:hidden">{movies.map((movie) => <MobileMovieTile key={movie.id} id={movie.id} image={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null} title={movie.title} author={movie.director} year={movie.release_year} onCatalog={() => void add(movie, "catalog")} onWatchlist={() => void add(movie, "watchlist")} />)}</div><div className="mt-5 hidden grid-cols-4 gap-6 md:grid">{movies.map((movie) => <MovieCard key={movie.id} id={movie.id} image={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null} title={movie.title} author={movie.director || "Inconnu"} palette={movie.palette} />)}</div></>
            : submitted ? <div className="py-16 text-center"><h2 className="font-semibold">Aucun film trouvé</h2><p className="mt-1 text-sm text-muted-foreground">Vérifie le titre ou essaie une autre recherche.</p></div>
            : <div className="zen-mobile-empty mt-8 bg-muted/60 px-5 py-10 text-center"><Search className="mx-auto size-6 text-primary" /><p className="mt-3 font-semibold">Tout le cinéma, en quelques mots.</p><p className="mx-auto mt-1 max-w-xs text-sm leading-5 text-muted-foreground">Saisis un titre, un réalisateur ou une ambiance.</p></div>}
        </section>
      </div>
      <AfterFilmDialog open={Boolean(afterFilmMovie)} title={afterFilmMovie?.title || "ce film"} onOpenChange={(open) => { if (!open) setAfterFilmMovie(null); }} onSave={saveAfterFilm} />
    </main>
  );
}
