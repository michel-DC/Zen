"use client";

import MoviePoster from "@/components/movie-poster";
import { Button } from "@/components/ui/button";
import { catalogApi } from "@/lib/services/catalog-api";
import { ArrowRight, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

type TonightMovie = { id: number; title: string; poster_path: string | null; director: string; release_year: number | null; runtime: number | null; rationale: string; source: "watchlist" | "surprise" };
const durations = [90, 120, 150, 180];

export default function TonightPage() {
  const router = useRouter();
  const [mode, setMode] = React.useState<"watchlist" | "surprise">("watchlist");
  const [minutes, setMinutes] = React.useState(150);
  const [intensity, setIntensity] = React.useState(3);
  const [pace, setPace] = React.useState<"slow" | "balanced" | "paced">("balanced");
  const [continuity, setContinuity] = React.useState<"continue" | "change">("continue");
  const [context, setContext] = React.useState("");
  const [movies, setMovies] = React.useState<TonightMovie[]>([]);
  const [excluded, setExcluded] = React.useState<number[]>([]);
  const [loading, setLoading] = React.useState(false);

  const run = async (additionalExclusions: number[] = []) => {
    setLoading(true);
    try {
      const response = await catalogApi.getTonightRecommendations({ mode, available_minutes: minutes, emotional_intensity: intensity, pace, continuity, context: context.trim() || undefined, session_exclusions: [...excluded, ...additionalExclusions] });
      setMovies(response.data);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Impossible de choisir un film"); }
    finally { setLoading(false); }
  };

  const replace = (movie: TonightMovie) => { setExcluded((current) => [...current, movie.id]); void run([movie.id]); };
  const decide = async (movie: TonightMovie, decision: "defer" | "not_interested") => {
    try { await catalogApi.decideTonight({ tmdb_id: movie.id, decision }); setMovies((current) => current.filter((item) => item.id !== movie.id)); toast.success(decision === "defer" ? "Mis de côté pour quelques jours" : "Film retiré de tes suggestions"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Impossible d’enregistrer ce choix"); }
  };
  const choose = async (movie: TonightMovie) => {
    try {
      if (movie.source === "surprise") await catalogApi.createWatchlistMovie({ title: movie.title, release_year: movie.release_year, director: movie.director, overview: null, poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null, tmdb_id: movie.id, genres: [], watched_at: null, rating: null, favorite: false, notes: null });
      await catalogApi.decideTonight({ tmdb_id: movie.id, decision: "chosen" });
      router.push(`/movies/${movie.id}`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Impossible de préparer ce film"); }
  };

  return (
    <main id="main-content" className="zen-mobile-page mx-auto w-full max-w-5xl px-5 pb-8 pt-[max(2rem,env(safe-area-inset-top))] md:px-8 md:py-10">
      <header className="max-w-xl"><p className="zen-mobile-kicker">Ce soir</p><h1 className="zen-mobile-title mt-2 md:text-4xl">Choisir sans chercher trop longtemps.</h1><p className="zen-mobile-lead mt-3">Un choix principal et deux alternatives, à partir de ta liste ou d’une surprise.</p></header>

      <section className="zen-mobile-form mt-8 max-w-xl space-y-6 bg-muted p-4 md:p-6" aria-label="Préférences pour ce soir">
        <div className="grid grid-cols-2 rounded-xl bg-background/70 p-1"><button type="button" aria-pressed={mode === "watchlist"} onClick={() => setMode("watchlist")} className={`min-h-11 rounded-[0.65rem] px-3 text-sm font-semibold ${mode === "watchlist" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Dans ma liste</button><button type="button" aria-pressed={mode === "surprise"} onClick={() => setMode("surprise")} className={`min-h-11 rounded-[0.65rem] px-3 text-sm font-semibold ${mode === "surprise" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Surprise-moi</button></div>
        <fieldset><legend className="text-sm font-medium">Temps disponible</legend><div className="mt-2 flex flex-wrap gap-2">{durations.map((value) => <button key={value} type="button" aria-pressed={minutes === value} onClick={() => setMinutes(value)} className={`min-h-11 rounded-full px-3 text-sm font-medium ${minutes === value ? "bg-primary text-primary-foreground" : "bg-background text-foreground"}`}>{value} min</button>)}</div></fieldset>
        <fieldset><legend className="text-sm font-medium">Intensité émotionnelle</legend><div className="mt-2 flex justify-between gap-2">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`Intensité ${value} sur 5`} aria-pressed={intensity === value} onClick={() => setIntensity(value)} className={`size-11 rounded-full text-sm font-semibold ${intensity === value ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}>{value}</button>)}</div></fieldset>
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Rythme<select value={pace} onChange={(event) => setPace(event.target.value as typeof pace)} className="mt-2 h-12 w-full rounded-xl bg-background px-3 text-base outline-none"><option value="slow">Lent</option><option value="balanced">Équilibré</option><option value="paced">Soutenu</option></select></label><label className="text-sm font-medium">Envie<select value={continuity} onChange={(event) => setContinuity(event.target.value as typeof continuity)} className="mt-2 h-12 w-full rounded-xl bg-background px-3 text-base outline-none"><option value="continue">Dans la continuité</option><option value="change">Changer de registre</option></select></label></div>
        <label className="block text-sm font-medium" htmlFor="tonight-context">Une précision ? <span className="font-normal text-muted-foreground">Facultatif</span><input id="tonight-context" value={context} onChange={(event) => setContext(event.target.value)} maxLength={400} placeholder="Quelque chose de doux, sans trop de dialogues…" className="mt-2 h-12 w-full rounded-xl bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
        <Button onClick={() => void run()} disabled={loading} className="h-12 w-full rounded-full">{loading ? <RefreshCw className="animate-spin" /> : <Sparkles />} {loading ? "Je cherche…" : "Trouver mon film"}</Button>
      </section>

      {movies.length > 0 && <section className="mt-12"><div className="flex items-end justify-between gap-4"><div><h2 className="text-xl font-bold tracking-[-0.03em]">Pour ce soir</h2><p className="mt-1 text-sm text-muted-foreground">Le premier choix est celui que Zen privilégie.</p></div><Link href="/journeys" className="min-h-11 shrink-0 py-3 text-sm font-semibold text-primary">Parcours</Link></div><div className="mt-5 grid gap-8 md:grid-cols-3">{movies.map((movie, index) => <article key={movie.id} className={`min-w-0 ${index === 0 ? "md:col-span-2 md:grid md:grid-cols-[minmax(12rem,0.75fr)_1fr] md:gap-6" : ""}`}><div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-muted"><MoviePoster src={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null} alt={movie.title} sizes={index === 0 ? "(max-width: 767px) 90vw, 40vw" : "(max-width: 767px) 45vw, 22vw"} /></div><div className={index === 0 ? "mt-4 md:mt-0 md:self-center" : "mt-3"}>{index === 0 && <p className="text-xs font-bold text-primary">Choix principal</p>}<h3 className="mt-1 text-lg font-bold leading-tight">{movie.title}</h3><p className="mt-1 text-sm text-muted-foreground">Par {movie.director}{movie.runtime ? ` · ${movie.runtime} min` : ""}</p><p className="mt-3 text-sm leading-5 text-muted-foreground">{movie.rationale}</p><div className="mt-5 flex flex-wrap gap-2"><Button className="rounded-full" onClick={() => void choose(movie)}>C’est celui-ci <ArrowRight /></Button><button type="button" onClick={() => replace(movie)} className="min-h-11 rounded-full bg-muted px-3 text-sm font-semibold">Autre chose</button><button type="button" onClick={() => void decide(movie, "defer")} className="min-h-11 rounded-full px-3 text-sm font-medium text-muted-foreground">Pas maintenant</button><button type="button" onClick={() => void decide(movie, "not_interested")} className="min-h-11 rounded-full px-3 text-sm font-medium text-destructive">Plus intéressé</button></div></div></article>)}</div></section>}
    </main>
  );
}
