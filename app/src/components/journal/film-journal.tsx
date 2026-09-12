"use client";

import AfterFilmDialog, { type AfterFilmPayload } from "@/components/journal/after-film-dialog";
import JournalConversation from "@/components/journal/journal-conversation";
import { catalogApi, type CatalogMovie } from "@/lib/services/catalog-api";
import { syncJourneyAfterViewing } from "@/lib/journey-progress";
import { Heart, RotateCcw, Star } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function dateForFirstViewing(movie: CatalogMovie): string {
  return movie.watched_at || movie.created_at.slice(0, 10);
}

function Stars({ rating }: { rating: number | null }) {
  return <span className="flex items-center gap-0.5" aria-label={rating ? `${rating} sur 5` : "Non noté"}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`size-4 ${rating && rating > index ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />)}{rating && <span className="ml-1 text-sm font-semibold">{rating.toLocaleString("fr-FR")}</span>}</span>;
}

export default function FilmJournal({ movie, onUpdated }: { movie: CatalogMovie; onUpdated: (movie: CatalogMovie) => void }) {
  const [rewatchOpen, setRewatchOpen] = React.useState(false);
  const [pendingMessage, setPendingMessage] = React.useState(false);
  const viewings = movie.viewings ?? [];
  const ratingHistory = movie.rating_history ?? [];
  const lastViewing = viewings.at(-1);

  const saveRewatch = async (payload: AfterFilmPayload) => {
    try {
      const result = await catalogApi.createViewing(movie.id, payload);
      onUpdated(result.movie);
      void syncJourneyAfterViewing(result.movie, result.viewing.id).catch(() => undefined);
      toast.success("Revisionnage ajouté");
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

  const send = async (message: string) => {
    if (!message.trim() || pendingMessage) return false;
    setPendingMessage(true);
    try {
      let activeMovie = movie;
      let activeViewing = lastViewing;

      if (!activeViewing) {
        const created = await catalogApi.createViewing(movie.id, {
          watched_at: dateForFirstViewing(movie),
          is_rewatch: false,
        });
        activeMovie = created.movie;
        activeViewing = created.viewing;
      }

      const result = await catalogApi.continueConversation(movie.id, activeViewing.id, message.trim());
      onUpdated({
        ...activeMovie,
        viewings: activeMovie.viewings.map((viewing) => viewing.id === result.viewing.id ? result.viewing : viewing),
      });
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "La discussion est indisponible");
      return false;
    } finally {
      setPendingMessage(false);
    }
  };

  return (
    <section className="mt-10 border-t border-border pt-8" aria-labelledby="journal-title">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-sm font-medium text-primary">Après le film</p><h2 id="journal-title" className="mt-1 text-xl font-bold tracking-[-0.03em]">Ton histoire avec ce film</h2></div>
        <button type="button" onClick={() => void toggleFavorite()} aria-pressed={movie.favorite} aria-label={movie.favorite ? "Retirer des favoris" : "Ajouter aux favoris"} className={`flex size-11 shrink-0 items-center justify-center rounded-full ${movie.favorite ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}><Heart className={movie.favorite ? "size-5 fill-current" : "size-5"} /></button>
      </div>
      <div className="mt-5 flex items-center justify-between rounded-2xl bg-muted p-4"><div><p className="text-sm text-muted-foreground">Note actuelle</p><div className="mt-1"><Stars rating={movie.rating} /></div></div><button type="button" onClick={() => setRewatchOpen(true)} className="flex min-h-11 items-center gap-2 rounded-full bg-background px-4 text-sm font-semibold"><RotateCcw className="size-4" />Revisionner</button></div>
      {ratingHistory.length > 1 && <details className="mt-4 rounded-2xl bg-muted p-4"><summary className="cursor-pointer text-sm font-semibold">Évolution de ta note</summary><ol className="mt-3 space-y-2 text-sm text-muted-foreground">{[...ratingHistory].reverse().map((entry) => <li key={`${entry.recorded_at}-${entry.rating}`} className="flex justify-between gap-3"><span>{dateLabel(entry.recorded_at)}</span><span className="font-semibold text-foreground">{entry.rating.toLocaleString("fr-FR")}/5</span></li>)}</ol></details>}
      <JournalConversation movieTitle={movie.title} messages={lastViewing?.conversation ?? []} pending={pendingMessage} onSend={send} initialViewingDate={lastViewing ? null : dateForFirstViewing(movie)} />
      <div className="mt-6 space-y-3">{[...viewings].reverse().map((viewing) => <article key={viewing.id} className="rounded-2xl bg-muted p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{viewing.is_rewatch ? "Revisionnage" : "Premier visionnage"}</p><p className="mt-1 text-sm text-muted-foreground">{dateLabel(viewing.watched_at)}</p></div>{viewing.reflection_status === "pending" && <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">À compléter</span>}</div>{viewing.impression && <p className="mt-4 text-sm leading-6">{viewing.impression}</p>}{((viewing.emotions ?? []).length > 0 || (viewing.appreciated_aspects ?? []).length > 0) && <div className="mt-4 flex flex-wrap gap-2">{[...(viewing.emotions ?? []), ...(viewing.appreciated_aspects ?? [])].map((item) => <span key={item} className="rounded-full bg-background px-3 py-1 text-xs font-medium">{item.replaceAll("_", " ")}</span>)}</div>}</article>)}</div>
      <AfterFilmDialog open={rewatchOpen} title={movie.title} onOpenChange={setRewatchOpen} onSave={saveRewatch} />
    </section>
  );
}
