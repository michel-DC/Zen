"use client";

import MobileLibraryHeader from "@/components/mobile/library-header";
import MobileMovieTile from "@/components/mobile/movie-tile";
import MovieCard from "@/components/movie-card";
import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";
import { catalogApi, type CatalogMovie } from "@/lib/services/catalog-api";
import { Eye, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

export default function WatchlistPage() {
  const [movies, setMovies] = React.useState<CatalogMovie[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  React.useEffect(() => { void catalogApi.getCatalog().then((doc) => setMovies(doc.watchlist || [])).catch(() => toast.error("Impossible de charger À voir")).finally(() => setLoading(false)); }, []);
  const watched = async (id: string) => { try { await catalogApi.markWatchlistMovieAsWatched(id); setMovies((items) => items.filter((item) => item.id !== id)); toast.success("Film ajouté au catalogue"); } catch (error: any) { toast.error(error?.message || "Impossible de transférer ce film"); } };
  const remove = async (id: string) => { try { await catalogApi.deleteWatchlistMovie(id); setMovies((items) => items.filter((item) => item.id !== id)); toast.success("Film retiré de À voir"); } catch (error: any) { toast.error(error?.message || "Impossible de retirer ce film"); } };
  const filtered = movies.filter((movie) => !query.trim() || `${movie.title} ${movie.director || ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <main id="main-content" className="w-full px-4 py-8 sm:px-6 lg:px-8">
      <section className="md:hidden"><MobileLibraryHeader count={movies.length} /><div className="relative mt-5"><label htmlFor="watchlist-search-mobile" className="sr-only">Filtrer les films à voir</label><input id="watchlist-search-mobile" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filtrer les films à voir" className="h-12 w-full rounded-full bg-muted px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>{loading ? <div className="mt-6 grid grid-cols-2 gap-3"><div className="aspect-[2/3] animate-pulse rounded-[1.15rem] bg-muted" /><div className="aspect-[2/3] animate-pulse rounded-[1.15rem] bg-muted" /></div> : filtered.length ? <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6">{filtered.map((movie) => <MobileMovieTile key={movie.id} id={movie.tmdb_id ?? 0} image={movie.poster_url} title={movie.title} year={movie.release_year} onWatched={() => void watched(movie.id)} onDelete={() => void remove(movie.id)} />)}</div> : <div className="py-16 text-center"><h2 className="font-semibold">{movies.length ? "Aucun film trouvé" : "Rien à voir pour le moment"}</h2><p className="mt-2 text-sm text-muted-foreground">Ajoute un film depuis la recherche.</p></div>}</section>
      <section className="hidden space-y-6 md:block"><PageHeading title="À voir" description={`${movies.length} film${movies.length > 1 ? "s" : ""}`} /><div className="max-w-md"><label htmlFor="watchlist-search" className="sr-only">Rechercher dans la liste</label><input id="watchlist-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Titre ou réalisateur" className="h-10 w-full rounded-lg border bg-background px-3" /></div>{loading ? <p className="text-sm text-muted-foreground">Chargement…</p> : <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">{filtered.map((movie) => <div key={movie.id} className="space-y-3"><MovieCard id={movie.tmdb_id ?? 0} image={movie.poster_url} title={movie.title} author={movie.director || "Inconnu"} /><div className="flex gap-2"><Button variant="outline" onClick={() => void watched(movie.id)}><Eye />Vu</Button><Button variant="ghost" onClick={() => void remove(movie.id)}><Trash2 />Retirer</Button></div></div>)}</div>}</section>
    </main>
  );
}
