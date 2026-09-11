"use client";

import MobileMovieTile from "@/components/mobile/movie-tile";
import { Skeleton } from "@/components/ui/skeleton";
import { catalogApi, type CatalogDocument } from "@/lib/services/catalog-api";
import { ArrowRight, Bookmark, Library, RefreshCw, Search, Sparkles, WifiOff } from "lucide-react";
import Link from "next/link";
import * as React from "react";

export default function MobileHome() {
  const [document, setDocument] = React.useState<CatalogDocument | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadFailed, setLoadFailed] = React.useState(false);
  const loadCatalog = React.useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      setDocument(await catalogApi.getCatalog());
    } catch {
      setDocument(null);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);
  React.useEffect(() => { void loadCatalog(); }, [loadCatalog]);
  const recent = document?.movies.slice(0, 4) ?? [];
  return (
    <main id="main-content" className="zen-soft-in mx-auto w-full max-w-md px-5 pb-4 pt-[max(2.25rem,env(safe-area-inset-top))] md:hidden">
      <header className="mb-8">
        <p className="text-[0.9rem] font-medium text-muted-foreground">Bonjour</p>
        <h1 className="mt-1 text-[2rem] font-bold leading-none tracking-[-0.045em]">Quel film aujourd’hui ?</h1>
      </header>
      <Link href="/search" className="flex min-h-14 items-center gap-3 rounded-full bg-muted px-5 text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.99]"><Search className="size-5" /><span className="text-base">Rechercher un film</span></Link>
      <section className="mt-9 space-y-2" aria-label="Actions rapides">
        <Link href="/catalog" className="flex min-h-[4.5rem] items-center gap-4 rounded-[1.25rem] px-2 active:bg-muted"><span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Library className="size-5" /></span><span className="min-w-0 flex-1"><strong className="block text-base">Ma bibliothèque</strong><small className="text-sm text-muted-foreground">Retrouver mes films</small></span><ArrowRight className="size-5 text-muted-foreground" /></Link>
        <Link href="/recommendations" className="flex min-h-[4.5rem] items-center gap-4 rounded-[1.25rem] px-2 active:bg-muted"><span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Sparkles className="size-5" /></span><span className="min-w-0 flex-1"><strong className="block text-base">Trouver une idée</strong><small className="text-sm text-muted-foreground">À partir de mes goûts</small></span><ArrowRight className="size-5 text-muted-foreground" /></Link>
      </section>
      <section className="mt-10">
        <div className="flex items-end justify-between"><div><h2 className="text-[1.2rem] font-bold tracking-[-0.025em]">Derniers ajouts</h2><p className="mt-1 text-sm text-muted-foreground">{document ? `${document.movies.length} films · ${document.watchlist.length} à voir` : "Ma bibliothèque"}</p></div><Link href="/catalog" className="min-h-11 rounded-full px-2 py-3 text-sm font-semibold text-primary">Tout voir</Link></div>
        {loading ? <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-6"><Skeleton className="aspect-[2/3] rounded-[1.15rem]" /><Skeleton className="aspect-[2/3] rounded-[1.15rem]" /></div> : loadFailed ? <div role="alert" className="mt-4 rounded-[1.25rem] bg-muted p-5"><WifiOff className="size-5 text-primary" /><p className="mt-3 font-semibold">Catalogue indisponible</p><p className="mt-1 text-sm leading-5 text-muted-foreground">Le serveur n’a pas répondu. Tu peux réessayer sans recharger l’application.</p><button type="button" onClick={() => void loadCatalog()} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"><RefreshCw className="size-4" />Réessayer</button></div> : recent.length ? <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-6">{recent.map((movie) => <MobileMovieTile key={movie.id} id={movie.tmdb_id ?? 0} image={movie.poster_url} title={movie.title} author={movie.director} year={movie.release_year} />)}</div> : <div className="mt-4 rounded-[1.25rem] bg-muted p-5"><Bookmark className="size-5 text-primary" /><p className="mt-3 font-semibold">Ta bibliothèque est vide</p><p className="mt-1 text-sm leading-5 text-muted-foreground">Recherche un film pour commencer.</p></div>}
      </section>
    </main>
  );
}
