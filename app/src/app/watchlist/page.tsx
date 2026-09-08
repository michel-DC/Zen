"use client";

import * as React from "react";
import { Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import MovieCard from "@/components/movie-card";
import { SearchField } from "@/components/ui/search-field";
import { PageHeading } from "@/components/layout/page-heading";
import { ButtonGroup } from "@/components/ui/button-group";
import Link from "next/link";
import { catalogApi, type CatalogMovie } from "@/lib/services/catalog-api";

export default function WatchlistPage() {
  const [movies, setMovies] = React.useState<CatalogMovie[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [pending, setPending] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  React.useEffect(() => { void catalogApi.getCatalog().then((doc) => setMovies(doc.watchlist || [])).catch(() => toast.error("Impossible de charger À voir")).finally(() => setLoading(false)); }, []);
  const watched = async (id: string) => { setPending(id); try { await catalogApi.markWatchlistMovieAsWatched(id); setMovies((items) => items.filter((item) => item.id !== id)); toast.success("Film ajouté au catalogue"); } catch (error: any) { toast.error(error?.message || "Impossible de transférer ce film"); } finally { setPending(null); } };
  const remove = async (id: string) => { setPending(id); try { await catalogApi.deleteWatchlistMovie(id); setMovies((items) => items.filter((item) => item.id !== id)); toast.success("Film retiré de À voir"); } catch (error: any) { toast.error(error?.message || "Impossible de supprimer ce film"); } finally { setPending(null); } };
  const filteredMovies = movies.filter((movie) => {
    const term = query.trim().toLowerCase();
    return !term || movie.title.toLowerCase().includes(term) || (movie.director || "").toLowerCase().includes(term);
  });

  return <main id="main-content" className="w-full px-4 py-8 sm:px-6 lg:px-8"><section className="space-y-6">
    <PageHeading title="À voir" description={`${movies.length} film${movies.length > 1 ? "s" : ""}`}><Button asChild variant="outline"><Link href="/">Ajouter</Link></Button></PageHeading><SearchField id="watchlist-search" label="Rechercher dans la liste" value={query} onChange={setQuery} compact />
    {loading ? <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <MovieCard.Skeleton key={index} />)}</div> : filteredMovies.length === 0 ? <div className="py-16 text-center"><h2 className="text-xl font-semibold">{movies.length ? "Aucun résultat" : "Liste vide"}</h2></div> : <section className="space-y-4"><div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">{filteredMovies.map((movie) => <div key={movie.id} className="flex flex-col gap-3"><MovieCard id={movie.tmdb_id ? Number(movie.tmdb_id) : 0} image={movie.poster_url} title={movie.title} author={movie.director || "Inconnu"} /><div className="flex items-center justify-between gap-3 px-1"><span className="text-xs text-muted-foreground">{movie.release_year || "Année inconnue"}</span><ButtonGroup aria-label="Actions sur le film"><Button size="icon" variant="ghost" aria-label={`Marquer ${movie.title} comme vu`} disabled={pending === movie.id} onClick={() => watched(movie.id)}><Eye /></Button><Button size="icon" variant="ghost" aria-label={`Retirer ${movie.title} de la liste`} disabled={pending === movie.id} onClick={() => remove(movie.id)}><Trash2 /></Button></ButtonGroup></div></div>)}</div></section>}
  </section></main>;
}
