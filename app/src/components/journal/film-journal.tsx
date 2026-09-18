"use client";

import AfterFilmDialog, { type AfterFilmPayload } from "@/components/journal/after-film-dialog";
import { catalogApi, type CatalogMovie } from "@/lib/services/catalog-api";
import { syncJourneyAfterViewing } from "@/lib/journey-progress";
import { ArrowRight, Heart, MessageCircle, RotateCcw, Star } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

function dateLabel(value: string) {
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function Stars({ rating }: { rating: number | null }) {
  return <span className="flex items-center gap-0.5" aria-label={rating ? `${rating.toLocaleString("fr-FR")} sur 5` : "Non noté"}>{Array.from({ length: 5 }, (_, index) => { const fill = Math.max(0, Math.min(1, (rating ?? 0) - index)); return <span key={index} className="relative size-4"><Star aria-hidden className="absolute inset-0 size-4 text-muted-foreground/30" /><span aria-hidden className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}><Star className="size-4 fill-primary text-primary" /></span></span>; })}{rating && <span className="ml-1 text-sm font-semibold">{rating.toLocaleString("fr-FR")}</span>}</span>;
}

export default function FilmJournal({ movie, onUpdated }: { movie: CatalogMovie; onUpdated: (movie: CatalogMovie) => void }) {
  const [rewatchOpen, setRewatchOpen] = React.useState(false);
  const viewings = movie.viewings ?? [];
  const ratingHistory = movie.rating_history ?? [];
  const lastViewing = viewings.at(-1);

  const saveViewing = async (payload: AfterFilmPayload) => {
    try {
      const result = await catalogApi.createViewing(movie.id, { ...payload, is_rewatch: Boolean(lastViewing) });
      onUpdated(result.movie);
      void syncJourneyAfterViewing(result.movie, result.viewing.id).catch(() => undefined);
      toast.success(lastViewing ? "Revisionnage ajouté" : "Visionnage ajouté");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d’ajouter ce visionnage");
      throw error;
    }
  };

  const toggleFavorite = async () => {
    try {
      onUpdated(await catalogApi.updateMovie(movie.id, { favorite: !movie.favorite }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de modifier le favori");
    }
  };

  return (
    <section className="mt-10 border-t border-border pt-8" aria-labelledby="journal-title">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-sm font-medium text-primary">Après le film</p><h2 id="journal-title" className="mt-1 text-xl font-bold tracking-[-0.03em]">Ton histoire avec ce film</h2></div>
        <button type="button" onClick={() => void toggleFavorite()} aria-pressed={movie.favorite} aria-label={movie.favorite ? "Retirer des favoris" : "Ajouter aux favoris"} className={`flex size-11 shrink-0 items-center justify-center rounded-full ${movie.favorite ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}><Heart className={movie.favorite ? "size-5 fill-current" : "size-5"} /></button>
      </div>
      <div className="mt-5 flex items-center justify-between rounded-2xl bg-muted p-4"><div><p className="text-sm text-muted-foreground">Note actuelle</p><div className="mt-1"><Stars rating={movie.rating} /></div></div><button type="button" onClick={() => setRewatchOpen(true)} className="flex min-h-11 items-center gap-2 rounded-full bg-background px-4 text-sm font-semibold"><RotateCcw className="size-4" />{lastViewing ? "Revisionner" : "Ajouter un visionnage"}</button></div>
      {ratingHistory.length > 1 && <details className="mt-4 rounded-2xl bg-muted p-4"><summary className="cursor-pointer text-sm font-semibold">Évolution de ta note</summary><ol className="mt-3 space-y-2 text-sm text-muted-foreground">{[...ratingHistory].reverse().map((entry) => <li key={`${entry.recorded_at}-${entry.rating}`} className="flex justify-between gap-3"><span>{dateLabel(entry.recorded_at)}</span><span className="font-semibold text-foreground">{entry.rating.toLocaleString("fr-FR")}/5</span></li>)}</ol></details>}
      {movie.tmdb_id !== null && (
        <div className="mt-6 border-y border-border py-5">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-foreground"><MessageCircle className="size-5" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold">Parler de {movie.title}</h3>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">Poursuis ta réflexion avec Zen dans une discussion dédiée.</p>
              <Link href={`/movies/${movie.tmdb_id}/conversation`} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                Ouvrir la discussion <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      )}
      <div className="mt-6 space-y-3">{[...viewings].reverse().map((viewing) => <article key={viewing.id} className="rounded-2xl bg-muted p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{viewing.is_rewatch ? "Revisionnage" : "Premier visionnage"}</p><p className="mt-1 text-sm text-muted-foreground">{dateLabel(viewing.watched_at)}</p></div>{viewing.reflection_status === "pending" && <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">À compléter</span>}</div>{viewing.impression && <p className="mt-4 text-sm leading-6">{viewing.impression}</p>}{((viewing.emotions ?? []).length > 0 || (viewing.appreciated_aspects ?? []).length > 0) && <div className="mt-4 flex flex-wrap gap-2">{[...(viewing.emotions ?? []), ...(viewing.appreciated_aspects ?? [])].map((item) => <span key={item} className="rounded-full bg-background px-3 py-1 text-xs font-medium">{item.replaceAll("_", " ")}</span>)}</div>}</article>)}</div>
      <AfterFilmDialog open={rewatchOpen} title={movie.title} onOpenChange={setRewatchOpen} onSave={saveViewing} />
    </section>
  );
}
