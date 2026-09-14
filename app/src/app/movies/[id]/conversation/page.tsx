"use client";

import JournalConversation from "@/components/journal/journal-conversation";
import { catalogApi, type CatalogMovie } from "@/lib/services/catalog-api";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

function dateForFirstViewing(movie: CatalogMovie): string {
  return movie.watched_at || movie.created_at.slice(0, 10);
}

export default function MovieConversationPage() {
  const params = useParams<{ id: string }>();
  const tmdbId = Number(params.id);
  const [movie, setMovie] = React.useState<CatalogMovie | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<"not-found" | "network" | null>(null);
  const [loadAttempt, setLoadAttempt] = React.useState(0);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);

    void catalogApi.getCatalog()
      .then((document) => {
        if (!active) return;
        const catalogMovie = document.movies.find((item) => item.tmdb_id === tmdbId) ?? null;
        setMovie(catalogMovie);
        setLoadError(catalogMovie ? null : "not-found");
      })
      .catch(() => {
        if (active) setLoadError("network");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [loadAttempt, tmdbId]);

  const send = async (message: string) => {
    if (!movie || !message.trim() || pending) return false;
    setPending(true);

    try {
      let activeMovie = movie;
      let activeViewing = activeMovie.viewings.at(-1);

      if (!activeViewing) {
        const created = await catalogApi.createViewing(activeMovie.id, {
          watched_at: dateForFirstViewing(activeMovie),
          is_rewatch: false,
        });
        activeMovie = created.movie;
        activeViewing = created.viewing;
        setMovie(activeMovie);
      }

      const result = await catalogApi.continueConversation(activeMovie.id, activeViewing.id, message.trim());
      setMovie({
        ...activeMovie,
        viewings: activeMovie.viewings.map((viewing) => viewing.id === result.viewing.id ? result.viewing : viewing),
      });
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "La discussion est indisponible");
      return false;
    } finally {
      setPending(false);
    }
  };

  if (loading) {
    return (
      <main id="main-content" className="zen-conversation-page zen-conversation-page--loading" aria-busy="true">
        <div className="zen-conversation-loading"><span aria-hidden="true" /><p>Ouverture de la discussion…</p></div>
      </main>
    );
  }

  if (loadError || !movie) {
    const unavailable = loadError === "network";
    return (
      <main id="main-content" className="zen-conversation-page zen-conversation-page--error">
        <div>
          <h1>{unavailable ? "Chargement impossible" : "Discussion indisponible"}</h1>
          <p>{unavailable ? "Zen n’a pas pu récupérer cette discussion. Vérifie ta connexion puis réessaie." : "Ce film doit être dans ton catalogue pour commencer un échange avec Zen."}</p>
          <div className="zen-conversation-page__error-actions">
            {unavailable && <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Réessayer</button>}
            <Link href={`/movies/${params.id}`}><ArrowLeft aria-hidden="true" /> Revenir au film</Link>
          </div>
        </div>
      </main>
    );
  }

  const lastViewing = movie.viewings.at(-1);

  return (
    <JournalConversation
      movieTitle={movie.title}
      messages={lastViewing?.conversation ?? []}
      pending={pending}
      onSend={send}
      initialViewingDate={lastViewing ? null : dateForFirstViewing(movie)}
      backHref={`/movies/${params.id}`}
    />
  );
}
