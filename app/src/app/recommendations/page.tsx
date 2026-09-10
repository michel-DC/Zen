"use client";

import * as React from "react";
import { ChevronDown, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
import { PageHeading } from "@/components/layout/page-heading";
import { Field, FieldLabel } from "@/components/ui/field";
import MoviePoster from "@/components/movie-poster";
import { Switch } from "@/components/ui/switch";
import { catalogApi, type CatalogMovie, type RecommendationResponse, type RecommendationResult } from "@/lib/services/catalog-api";

function moviePayload(movie: RecommendationResult) {
  return { title: movie.title, release_year: movie.release_year, director: movie.director, overview: null, poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null, tmdb_id: movie.id, genres: [], watched_at: null, rating: null, favorite: false, notes: null };
}

function MovieChoice({ movie, onAdd }: { movie: CatalogMovie; onAdd: () => void }) {
  return <article className="flex min-w-0 flex-col gap-3">
    <div className="relative aspect-2/3 overflow-hidden rounded-xl bg-muted"><MoviePoster src={movie.poster_url} alt={movie.title} sizes="(max-width: 640px) 45vw, 25vw" /></div>
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-medium leading-tight">{movie.title}</h3><p className="mt-1 text-sm text-muted-foreground">Par {movie.director || "Inconnu"}</p></div><Button type="button" variant="secondary" size="icon" className="shrink-0 rounded-full" aria-label={`Ajouter ${movie.title} à la base`} title="Ajouter à la base" onClick={onAdd}><Plus /></Button></div>
  </article>;
}

export default function RecommendationsPage() {
  const [catalog, setCatalog] = React.useState<CatalogMovie[]>([]);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<RecommendationResult[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searching, setSearching] = React.useState(false);
  const [offset, setOffset] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [includeAnimation, setIncludeAnimation] = React.useState(false);
  const [includeDocumentary, setIncludeDocumentary] = React.useState(false);
  const [debug, setDebug] = React.useState<RecommendationResponse["debug"] | null>(null);
  const [focusResults, setFocusResults] = React.useState(false);
  const resultsSectionRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => { void catalogApi.getCatalog().then((document) => setCatalog(document.movies)).catch(() => toast.error("Impossible de charger le catalogue")).finally(() => setLoading(false)); }, []);
  React.useEffect(() => {
    if (!focusResults || !results.length) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultsSectionRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    setFocusResults(false);
  }, [focusResults, results.length]);
  const matches = query.trim().length < 2 ? [] : catalog.filter((movie) => !selected.includes(movie.id) && `${movie.title} ${movie.director || ""}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 2);
  const latest = catalog.filter((movie) => !selected.includes(movie.id)).slice(0, 3);
  const sources = selected.map((id) => catalog.find((movie) => movie.id === id)).filter((movie): movie is CatalogMovie => Boolean(movie));
  const addSource = (id: string) => { setSelected((current) => [...current, id]); setQuery(""); };
  const removeSource = (id: string) => setSelected((current) => current.filter((value) => value !== id));
  const run = async (nextOffset = 0) => { if (!selected.length) return; setSearching(true); try { const response = await catalogApi.getRecommendations({ movie_ids: selected, include_animation: includeAnimation, include_documentary: includeDocumentary, offset: nextOffset }); setResults((current) => nextOffset ? [...current, ...response.data] : response.data); setFocusResults(nextOffset === 0); setOffset(nextOffset); setHasMore(response.pagination.has_more); setDebug(response.debug); } catch (error: any) { toast.error(error?.message || "Les recommandations sont indisponibles"); } finally { setSearching(false); } };
  const add = async (movie: RecommendationResult) => { try { await catalogApi.createWatchlistMovie(moviePayload(movie)); toast.success("Ajouté à À voir"); } catch (error: any) { toast.error(error?.message || "Impossible d’ajouter ce film"); } };
  const reject = async (movie: RecommendationResult) => { try { await catalogApi.rejectRecommendation(movie.id); setResults((items) => items.filter((item) => item.id !== movie.id)); toast.success("Film masqué des recommandations"); } catch (error: any) { toast.error(error?.message || "Impossible de masquer ce film"); } };

  return <main id="main-content" className="zen-discover w-full px-4 py-8 sm:px-6 lg:px-8"><section className="space-y-6">
    <div className="md:hidden"><h1 className="text-[2rem] font-bold tracking-[-0.045em]">Découvrir</h1><p className="mt-2 max-w-xs text-sm leading-5 text-muted-foreground">Pars d’un film que tu aimes, Zen s’occupe du reste.</p></div><div className="hidden md:block"><PageHeading title="Recommandations" /></div>
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="space-y-5"><div className="space-y-3"><FieldLabel htmlFor="reference-search">Rechercher un film de référence</FieldLabel><ButtonGroup className="w-full"><ButtonGroupText aria-hidden="true" className="bg-background px-3"><Search /></ButtonGroupText><Input id="reference-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Titre ou réalisateur" className="min-w-0 flex-1" style={{ width: 0 }} autoComplete="off" /></ButtonGroup></div>
        {query.trim().length >= 2 ? <section className="space-y-4"><div className="border-b border-border pb-2"><h2 className="text-lg font-semibold tracking-tight">Résultats</h2></div>{matches.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">{matches.map((movie) => <MovieChoice key={movie.id} movie={movie} onAdd={() => addSource(movie.id)} />)}</div> : <p className="border-y border-border py-3 text-sm text-muted-foreground">Aucun film correspondant.</p>}</section> : <section className="space-y-4"><div className="border-b border-border pb-2"><h2 className="text-lg font-semibold tracking-tight">Derniers films vus</h2></div>{loading ? <p className="text-sm text-muted-foreground">Chargement du catalogue…</p> : <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">{latest.map((movie) => <MovieChoice key={movie.id} movie={movie} onAdd={() => addSource(movie.id)} />)}</div>}</section>}
      </section>
      <aside className="h-fit rounded-xl border bg-card p-5 lg:sticky lg:top-24"><div className="flex items-baseline justify-between border-b border-border pb-2"><h2 className="text-lg font-semibold tracking-tight">Base choisie</h2><span className="text-sm text-muted-foreground">{sources.length}</span></div>{sources.length ? <ul className="mt-1">{sources.map((movie) => <li key={movie.id} className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-0"><div className="min-w-0"><p className="truncate text-sm font-medium">{movie.title}</p><p className="truncate text-xs text-muted-foreground">{movie.director || "Inconnu"}</p></div><Button type="button" variant="ghost" size="icon" aria-label={`Retirer ${movie.title}`} onClick={() => removeSource(movie.id)}><X /></Button></li>)}</ul> : <p className="py-5 text-sm text-muted-foreground">Ajoute un film pour commencer.</p>}<details className="border-t border-border pt-4 text-sm"><summary className="cursor-pointer">Affiner les résultats</summary><div className="mt-4 space-y-3"><Field orientation="horizontal"><FieldLabel htmlFor="include-animation">Inclure les animations</FieldLabel><Switch id="include-animation" checked={includeAnimation} onCheckedChange={setIncludeAnimation} /></Field><Field orientation="horizontal"><FieldLabel htmlFor="include-documentary">Inclure les documentaires</FieldLabel><Switch id="include-documentary" checked={includeDocumentary} onCheckedChange={setIncludeDocumentary} /></Field></div></details><Button className="mt-6 w-full" disabled={!sources.length || searching} onClick={() => run()}><Sparkles data-icon="inline-start" />{searching ? "Recherche en cours…" : "Trouver des films similaires"}</Button></aside>
    </div>
    {results.length > 0 && <section ref={resultsSectionRef} className="scroll-mt-6 space-y-4"><div className="flex items-center justify-between border-b border-border pb-2"><h2 className="text-lg font-semibold tracking-tight">À découvrir</h2><span className="text-xs text-muted-foreground">3 par 3</span></div><div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">{results.map((movie) => <article key={movie.id} className="space-y-3"><div className="relative aspect-2/3 overflow-hidden rounded-xl bg-muted"><MoviePoster src={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null} alt={movie.title} sizes="(max-width: 640px) 45vw, 25vw" /></div><div><h3 className="font-medium leading-tight">{movie.title}</h3><p className="text-sm text-muted-foreground">Par {movie.director}</p></div><div className="flex items-center justify-between gap-3"><Button variant="ghost" size="sm" onClick={() => add(movie)}>Ajouter à voir</Button><Button variant="ghost" size="icon" aria-label={`Ne plus recommander ${movie.title}`} onClick={() => reject(movie)}><Trash2 /></Button></div></article>)}</div>{hasMore && <div className="flex justify-center pt-2"><Button size="lg" className="px-5" disabled={searching} onClick={() => run(offset + 3)}><ChevronDown data-icon="inline-start" />{searching ? "Recherche…" : "Charger 3 autres"}</Button></div>}</section>}
    {process.env.NODE_ENV === "development" && debug && <details className="border-t border-border pt-4 text-xs text-muted-foreground"><summary className="cursor-pointer">Debug local</summary><pre className="mt-3 overflow-auto">{JSON.stringify(debug, null, 2)}</pre></details>}
  </section></main>;
}
