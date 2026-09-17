"use client";

import MoviePoster from "@/components/movie-poster";
import { Button } from "@/components/ui/button";
import { catalogApi } from "@/lib/services/catalog-api";
import { movieApi } from "@/lib/services/movie-api";
import { Check, ChevronRight, Clapperboard, EyeOff, Gamepad2, Heart, LoaderCircle, RefreshCw, Skull, SlidersHorizontal, Timer, Trophy, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";

const TMDB_IMAGE_URL = "https://image.tmdb.org/t/p/w1280";
const MAX_LIVES = 3;
type QuizLength = 15 | 30 | 50 | "all";
type GameMode = "memory" | "survival";
type Stage = "detail" | "confirm";

type QuizMovie = { id: string; tmdbId: number; title: string; releaseYear: number | null; genres: string[]; director: string | null };
type Question = { target: QuizMovie; choices: QuizMovie[]; choiceHints: Record<number, string>; images: [string, string]; cropOrigin: string; stage: Stage };
type Resolution = { selectedId: number | null; timedOut: boolean };

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function sharedGenres(first: QuizMovie, second: QuizMovie) {
  return first.genres.filter((genre) => second.genres.includes(genre)).length;
}

function pickChoices(target: QuizMovie, catalog: QuizMovie[]) {
  const alternatives = catalog.filter((movie) => movie.tmdbId !== target.tmdbId);
  const ranked = alternatives
    .map((movie) => ({ movie, shared: sharedGenres(movie, target), sameDirector: Boolean(target.director && movie.director === target.director), distance: Math.abs((movie.releaseYear ?? 0) - (target.releaseYear ?? 0)) }))
    .sort((first, second) => Number(second.sameDirector) - Number(first.sameDirector) || second.shared - first.shared || first.distance - second.distance)
    .map(({ movie }) => movie);
  return shuffle([target, ...shuffle(ranked.slice(0, 8)).slice(0, 3)]);
}

function timeLimitFor(index: number, total: number, mode: GameMode, sprint: boolean) {
  if (sprint) return 15;
  const progress = total > 1 ? index / (total - 1) : 0;
  const limits = mode === "survival" ? [45, 35, 25, 20] : [60, 45, 30, 20];
  return limits[Math.min(limits.length - 1, Math.floor(progress * limits.length))];
}

function finalJoke(score: number, total: number) {
  const percentage = total ? Math.round((score / total) * 100) : 0;
  if (percentage === 100) return "Tu as clairement les clés de la cabine de projection.";
  if (percentage >= 80) return "Les projectionnistes te confient les clés du cinéma.";
  if (percentage >= 60) return "Solide. Le popcorn était manifestement bien dosé.";
  if (percentage >= 40) return "On dira que les plans étaient particulièrement abstraits.";
  return "Le réalisateur voulait sans doute rester mystérieux.";
}

function metadata(movie: QuizMovie, hideDirector: boolean) {
  const parts = hideDirector
    ? [movie.releaseYear?.toString() ?? "Année inconnue", movie.genres[0] ?? "Genre inconnu"]
    : [movie.releaseYear?.toString(), movie.director].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Fiche mystère";
}

export default function QuizExperience() {
  const [catalog, setCatalog] = React.useState<QuizMovie[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState(false);
  const [noTextFreeVisuals, setNoTextFreeVisuals] = React.useState(false);
  const [selectedLength, setSelectedLength] = React.useState<QuizLength | null>(null);
  const [gameMode, setGameMode] = React.useState<GameMode>("memory");
  const [withoutTitles, setWithoutTitles] = React.useState(false);
  const [flashMode, setFlashMode] = React.useState(false);
  const [sprintMode, setSprintMode] = React.useState(false);
  const [noirMode, setNoirMode] = React.useState(false);
  const [mirrorMode, setMirrorMode] = React.useState(false);
  const [oneChanceMode, setOneChanceMode] = React.useState(false);
  // Kept as aliases until the advanced-settings markup is split into its own component.
  const directorMystery = flashMode;
  const setDirectorMystery = setFlashMode;
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [lineup, setLineup] = React.useState<QuizMovie[]>([]);
  const [candidateQueue, setCandidateQueue] = React.useState<QuizMovie[]>([]);
  const [candidateCursor, setCandidateCursor] = React.useState(0);
  const [questionLimit, setQuestionLimit] = React.useState(0);
  const [questionIndex, setQuestionIndex] = React.useState(0);
  const [question, setQuestion] = React.useState<Question | null>(null);
  const [isQuestionLoading, setIsQuestionLoading] = React.useState(false);
  const [resolution, setResolution] = React.useState<Resolution | null>(null);
  const [score, setScore] = React.useState(0);
  const [lives, setLives] = React.useState(MAX_LIVES);
  const [timeLeft, setTimeLeft] = React.useState(60);
  const [activeTimeLimit, setActiveTimeLimit] = React.useState(60);
  const [screen, setScreen] = React.useState<"setup" | "playing" | "finished">("setup");

  const eligibleCatalog = catalog;

  const loadCatalog = React.useCallback(async () => {
    setIsCatalogLoading(true);
    setLoadError(false);
    try {
      const document = await catalogApi.getCatalog();
      setCatalog(document.movies.filter((movie) => movie.tmdb_id !== null && Boolean(movie.title.trim())).map((movie) => ({ id: movie.id, tmdbId: movie.tmdb_id as number, title: movie.title, releaseYear: movie.release_year, genres: movie.genres, director: movie.director })));
    } catch {
      setLoadError(true);
      setCatalog([]);
    } finally {
      setIsCatalogLoading(false);
    }
  }, []);

  React.useEffect(() => { void loadCatalog(); }, [loadCatalog]);

  const prepareQuestion = React.useCallback(async (startCursor: number, queue: QuizMovie[], asked: QuizMovie[]) => {
    setIsQuestionLoading(true);
    setQuestion(null);
    setResolution(null);
    for (let cursor = startCursor; cursor < queue.length; cursor += 1) {
      const target = queue[cursor];
      try {
        const detail = await movieApi.getMovieDetail(target.tmdbId);
        const scenes = Array.from(new Set((detail.images?.backdrops ?? []).filter((image) => image.file_path && image.iso_639_1 === null).map((image) => image.file_path as string))).filter((path) => path !== detail.backdrop_path);
        if (!scenes.length) continue;
        const firstScene = shuffle(scenes)[0];
        const nextLineup = [...asked, target];
        const nextIndex = nextLineup.length - 1;
        const limit = timeLimitFor(nextIndex, questionLimit, gameMode, sprintMode);
        setLineup(nextLineup);
        setQuestionIndex(nextIndex);
        setCandidateCursor(cursor + 1);
        setActiveTimeLimit(limit);
        setTimeLeft(limit);
        const choices = pickChoices(target, catalog);
        const choiceHints = withoutTitles ? Object.fromEntries(await Promise.all(choices.map(async (choice) => {
          try {
            const choiceDetail = choice.tmdbId === target.tmdbId ? detail : await movieApi.getMovieDetail(choice.tmdbId);
            const hintParts = [choiceDetail.release_year?.toString(), choiceDetail.director];
            return [choice.tmdbId, hintParts.filter(Boolean).join(" · ") || metadata(choice, false)];
          } catch {
            return [choice.tmdbId, metadata(choice, false)];
          }
        }))) : {};
        setQuestion({ target, choices, choiceHints, images: [`${TMDB_IMAGE_URL}${firstScene}`, `${TMDB_IMAGE_URL}${firstScene}`], cropOrigin: shuffle(["left center", "center", "right center", "center top"])[0], stage: "detail" });
        setIsQuestionLoading(false);
        return;
      } catch {
        // Try the next catalogue film when a TMDB detail request cannot be used.
      }
    }
    setIsQuestionLoading(false);
    if (!asked.length) {
      setNoTextFreeVisuals(true);
      setScreen("setup");
    } else setScreen("finished");
  }, [catalog, gameMode, questionLimit, sprintMode, withoutTitles]);

  const resolveTimeout = React.useCallback(() => {
    setResolution((current) => {
      if (current) return current;
      if (gameMode === "survival" || oneChanceMode) setLives((currentLives) => Math.max(0, currentLives - 1));
      navigator.vibrate?.([30, 40, 30]);
      return { selectedId: null, timedOut: true };
    });
  }, [gameMode, oneChanceMode]);

  React.useEffect(() => {
    if (screen !== "playing" || !question || isQuestionLoading || resolution) return;
    const deadline = Date.now() + activeTimeLimit * 1000;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) resolveTimeout();
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [activeTimeLimit, isQuestionLoading, question, resolution, resolveTimeout, screen]);

  React.useEffect(() => {
    if (screen !== "playing") { delete document.body.dataset.quizLesson; return; }
    document.body.dataset.quizLesson = "active";
    return () => { delete document.body.dataset.quizLesson; };
  }, [screen]);

  React.useEffect(() => {
    const hidden = flashMode && screen === "playing" && question?.stage === "detail" && timeLeft <= activeTimeLimit - 6;
    if (hidden) document.body.dataset.quizFlash = "hidden";
    else delete document.body.dataset.quizFlash;
    return () => { delete document.body.dataset.quizFlash; };
  }, [activeTimeLimit, flashMode, question?.stage, screen, timeLeft]);

  React.useEffect(() => {
    document.body.toggleAttribute("data-quiz-noir", noirMode && screen === "playing");
    document.body.toggleAttribute("data-quiz-mirror", mirrorMode && screen === "playing");
    return () => { delete document.body.dataset.quizNoir; delete document.body.dataset.quizMirror; };
  }, [mirrorMode, noirMode, screen]);

  const startGame = () => {
    if (!selectedLength || eligibleCatalog.length < 4) return;
    const count = selectedLength === "all" ? eligibleCatalog.length : selectedLength;
    if (eligibleCatalog.length < count) return;
    const queue = shuffle(eligibleCatalog);
    setLineup([]); setCandidateQueue(queue); setCandidateCursor(0); setQuestionLimit(count); setQuestionIndex(0); setScore(0); setLives(oneChanceMode ? 1 : MAX_LIVES); setNoTextFreeVisuals(false); setScreen("playing");
    void prepareQuestion(0, queue, []);
  };

  const answer = (selectedId: number) => {
    if (!question || resolution) return;
    const correct = selectedId === question.target.tmdbId;
    setResolution({ selectedId, timedOut: false });
    if (!correct && (gameMode === "survival" || oneChanceMode)) setLives((currentLives) => Math.max(0, currentLives - 1));
    navigator.vibrate?.(correct ? [12, 45, 12] : [35]);
  };

  const continueGame = () => {
    if (!question || !resolution) return;
    const correct = resolution.selectedId === question.target.tmdbId;
    if (correct) setScore((current) => current + 1);
    if (((gameMode === "survival" || oneChanceMode) && !correct && lives <= 0) || lineup.length >= questionLimit) { setScreen("finished"); return; }
    void prepareQuestion(candidateCursor, candidateQueue, lineup);
  };

  const restart = () => {
    setScreen("setup"); setLineup([]); setCandidateQueue([]); setCandidateCursor(0); setQuestionLimit(0); setNoTextFreeVisuals(false); setQuestion(null); setResolution(null); setSelectedLength(null);
  };

  const selectedCount = selectedLength === "all" ? eligibleCatalog.length : selectedLength;
  const progressPercentage = questionLimit ? ((questionIndex + (resolution && question?.stage === "confirm" ? 1 : 0)) / questionLimit) * 100 : 0;

  if (screen === "finished") {
    const percentage = lineup.length ? Math.round((score / lineup.length) * 100) : 0;
    return <main id="main-content" className="zen-soft-in mx-auto flex h-[100dvh] w-full max-w-md flex-col justify-center overflow-hidden px-5 pb-28 pt-[max(2rem,env(safe-area-inset-top))]"><section className="text-center" aria-labelledby="quiz-result-title"><span className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground"><Trophy className="size-7" /></span><h1 id="quiz-result-title" className="mt-7 text-[2.2rem] font-bold leading-none tracking-[-0.04em]">Partie terminée</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Tu as validé {score} film{score > 1 ? "s" : ""} sur {lineup.length}{gameMode === "survival" && lives === 0 ? " avant la dernière vie" : ""}.</p><p className="mt-8 text-6xl font-bold tracking-[-0.04em] tabular-nums">{percentage}<span className="text-3xl">%</span></p><p className="mx-auto mt-7 max-w-xs text-base leading-6 text-muted-foreground">{finalJoke(score, lineup.length)}</p><div className="mt-10 grid gap-3"><Button type="button" onClick={restart} className="h-14 rounded-2xl text-base"><RefreshCw className="size-4" />Nouvelle partie</Button><Button asChild variant="outline" className="h-14 rounded-2xl text-base"><Link href="/catalog">Retour au catalogue</Link></Button></div></section></main>;
  }

  if (screen === "setup") {
    const advancedRules = [
      ["Sans titres", "Informations de fiche seulement.", withoutTitles, setWithoutTitles],
      ["Plan flash", "Le plan disparaît après 6 secondes.", flashMode, setFlashMode],
      ["Sprint", "15 secondes fixes par plan.", sprintMode, setSprintMode],
      ["Noir cinéma", "Plan en noir et blanc, contraste réduit.", noirMode, setNoirMode],
      ["Plan inversé", "L’image est retournée horizontalement.", mirrorMode, setMirrorMode],
      ["Une chance", "Une erreur met immédiatement fin à la partie.", oneChanceMode, setOneChanceMode],
    ] as const;
    return <main id="main-content" className="zen-soft-in mx-auto flex h-[100dvh] w-full max-w-md flex-col overflow-hidden px-5 pb-28 pt-[max(1.5rem,env(safe-area-inset-top))]"><header><h1 className="text-[2.1rem] font-bold leading-none tracking-[-0.04em]">Le quiz cinéma</h1><p className="mt-3 text-[0.95rem] leading-6 text-muted-foreground">Retrouve un film à partir de deux plans. Le premier se révèle peu à peu.</p></header>{isCatalogLoading ? <div className="mt-8 space-y-3"><div className="h-16 animate-pulse rounded-2xl bg-muted" /><div className="h-16 animate-pulse rounded-2xl bg-muted" /></div> : <section className="mt-8"><p className="text-sm font-semibold text-muted-foreground">PARCOURS</p><div className="mt-2 grid grid-cols-2 rounded-xl bg-muted p-1"><button type="button" onClick={() => setGameMode("memory")} className={`min-h-11 rounded-[0.6rem] text-sm font-semibold ${gameMode === "memory" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>Défi mémoire</button><button type="button" onClick={() => setGameMode("survival")} className={`min-h-11 rounded-[0.6rem] text-sm font-semibold ${gameMode === "survival" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>Survie · 3 vies</button></div><div className="mt-7 overflow-hidden rounded-xl bg-muted">{([15, 30, 50, "all"] as QuizLength[]).map((length) => { const count = length === "all" ? catalog.length : length; const active = selectedLength === length; return <button key={length} type="button" disabled={catalog.length < count} onClick={() => setSelectedLength(length)} className={`flex min-h-12 w-full items-center justify-between border-b border-border/60 px-4 last:border-0 disabled:opacity-35 ${active ? "bg-primary/10" : ""}`}><span className="font-semibold">{length === "all" ? "Tout le catalogue" : `${length} films`}</span><span>{active && <Check className="size-4 text-primary" />}</span></button>; })}</div><button type="button" onClick={() => setAdvancedOpen(true)} className="mt-5 flex min-h-12 w-full items-center gap-2 px-1 text-sm font-medium text-muted-foreground"><SlidersHorizontal className="size-4" />Règles avancées</button><Button type="button" disabled={!selectedLength} onClick={startGame} className="mt-5 h-14 w-full rounded-xl"><Clapperboard className="size-5" />{selectedCount ? `Commencer · ${selectedCount} films` : "Choisis une durée"}</Button>{advancedOpen && <div className="fixed inset-0 z-[60] flex items-end bg-black/45 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" role="dialog" aria-modal="true"><section className="w-full rounded-[1.25rem] bg-card p-5 shadow-2xl"><div className="mx-auto h-1 w-9 rounded-full bg-muted-foreground/30" /><h2 className="mt-5 text-xl font-bold">Règles avancées</h2><div className="mt-4 divide-y divide-border">{advancedRules.map(([title, description, checked, setChecked]) => <label key={title} className="flex min-h-14 items-center justify-between gap-4 py-2"><span><span className="block text-sm font-semibold">{title}</span><span className="block text-xs leading-4 text-muted-foreground">{description}</span></span><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} className="size-5 shrink-0 accent-primary" /></label>)}</div><Button type="button" onClick={() => setAdvancedOpen(false)} className="mt-5 h-12 w-full rounded-xl">Terminé</Button></section></div>}</section>}</main>;
    return (
      <main id="main-content" className="zen-soft-in mx-auto flex h-[100dvh] w-full max-w-md flex-col overflow-hidden px-5 pb-28 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <header>
          <h1 className="text-[2.1rem] font-bold leading-none tracking-[-0.04em]">Le quiz cinéma</h1>
          <p className="mt-3 text-[0.95rem] leading-6 text-muted-foreground">Retrouve un film à partir de deux plans. Le premier se révèle peu à peu.</p>
        </header>
        {isCatalogLoading ? <div className="mt-8 space-y-3" aria-label="Chargement du catalogue"><div className="h-16 animate-pulse rounded-2xl bg-muted" /><div className="h-16 animate-pulse rounded-2xl bg-muted" /></div> : loadError ? <section role="alert" className="mt-8 rounded-2xl bg-muted p-5"><p className="font-semibold">Catalogue indisponible</p><Button type="button" variant="outline" onClick={() => void loadCatalog()} className="mt-4 rounded-xl">Réessayer</Button></section> : <section className="mt-8"><p className="text-sm font-semibold text-muted-foreground">PARCOURS</p><div className="mt-2 grid grid-cols-2 rounded-xl bg-muted p-1"><button type="button" onClick={() => setGameMode("memory")} aria-pressed={gameMode === "memory"} className={`min-h-11 rounded-[0.6rem] text-sm font-semibold ${gameMode === "memory" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>Défi mémoire</button><button type="button" onClick={() => setGameMode("survival")} aria-pressed={gameMode === "survival"} className={`min-h-11 rounded-[0.6rem] text-sm font-semibold ${gameMode === "survival" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>Survie · 3 vies</button></div><div className="mt-7"><p className="text-sm font-semibold text-muted-foreground">NOMBRE DE FILMS</p><div className="mt-2 overflow-hidden rounded-xl bg-muted">{([15, 30, 50, "all"] as QuizLength[]).map((length) => { const count = length === "all" ? catalog.length : length; const active = selectedLength === length; return <button key={length} type="button" disabled={catalog.length < count} onClick={() => setSelectedLength(length)} aria-pressed={active} className={`flex min-h-12 w-full items-center justify-between border-b border-border/60 px-4 last:border-0 disabled:opacity-35 ${active ? "bg-primary/10" : ""}`}><span className="font-semibold">{length === "all" ? "Tout le catalogue" : `${length} films`}</span><span className="flex items-center gap-2 text-sm text-muted-foreground">{length === "all" ? `${catalog.length} disponibles` : ""}{active && <Check className="size-4 text-primary" />}</span></button>; })}</div></div><button type="button" onClick={() => setAdvancedOpen(true)} className="mt-5 flex min-h-12 w-full items-center justify-between rounded-xl px-1 text-sm font-medium text-muted-foreground"><span className="flex items-center gap-2"><SlidersHorizontal className="size-4" />Règles avancées</span><span>{[withoutTitles && "Sans titres", flashMode && "Plan flash", sprintMode && "Sprint"].filter(Boolean).join(" · ") || "Par défaut"}</span></button><Button type="button" disabled={!selectedLength} onClick={startGame} className="mt-5 h-14 w-full rounded-xl text-base"><Clapperboard className="size-5" />{selectedCount ? `Commencer · ${selectedCount} films` : "Choisis une durée"}</Button>{advancedOpen && <div className="fixed inset-0 z-[60] flex items-end bg-black/45 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" role="dialog" aria-modal="true"><section className="w-full rounded-[1.25rem] bg-card p-5 shadow-2xl"><div className="mx-auto h-1 w-9 rounded-full bg-muted-foreground/30" /><h2 className="mt-5 text-xl font-bold tracking-[-0.03em]">Règles avancées</h2><label className="mt-5 flex min-h-14 items-center justify-between"><span><span className="block font-semibold">Sans titres</span><span className="text-sm text-muted-foreground">Informations de fiche seulement.</span></span><input type="checkbox" checked={withoutTitles} onChange={(event) => setWithoutTitles(event.target.checked)} className="size-5 accent-primary" /></label><label className="mt-3 flex min-h-14 items-center justify-between"><span><span className="block font-semibold">Plan flash</span><span className="text-sm text-muted-foreground">Le plan disparaît après 6 secondes.</span></span><input type="checkbox" checked={flashMode} onChange={(event) => setFlashMode(event.target.checked)} className="size-5 accent-primary" /></label><label className="mt-3 flex min-h-14 items-center justify-between"><span><span className="block font-semibold">Sprint</span><span className="text-sm text-muted-foreground">15 secondes fixes par plan.</span></span><input type="checkbox" checked={sprintMode} onChange={(event) => setSprintMode(event.target.checked)} className="size-5 accent-primary" /></label><Button type="button" onClick={() => setAdvancedOpen(false)} className="mt-5 h-12 w-full rounded-xl">Terminé</Button></section></div>}</section>}
      </main>
    );
    return <main id="main-content" className="zen-soft-in mx-auto flex h-[100dvh] w-full max-w-md flex-col overflow-hidden px-5 pb-28 pt-[max(1.5rem,env(safe-area-inset-top))]"><header><h1 className="text-[2.1rem] font-bold leading-none tracking-[-0.04em]">Le quiz cinéma</h1><p className="mt-3 text-[0.95rem] leading-6 text-muted-foreground">Retrouve un film à partir de deux plans. Le premier se révèle peu à peu.</p></header>{isCatalogLoading ? <div className="mt-8 space-y-3" aria-label="Chargement du catalogue"><div className="h-16 animate-pulse rounded-2xl bg-muted" /><div className="h-16 animate-pulse rounded-2xl bg-muted" /></div> : loadError ? <section role="alert" className="mt-8 rounded-2xl bg-muted p-5"><p className="font-semibold">Catalogue indisponible</p><Button type="button" variant="outline" onClick={() => void loadCatalog()} className="mt-4 rounded-xl">Réessayer</Button></section> : <section className="mt-8">{noTextFreeVisuals && <p role="alert" className="mb-4 text-sm text-destructive">Deux plans sans texte sont nécessaires pour lancer une partie.</p>}<p className="text-sm font-semibold text-muted-foreground">PARCOURS</p><div className="mt-2 grid grid-cols-2 rounded-xl bg-muted p-1"><button type="button" onClick={() => setGameMode("memory")} aria-pressed={gameMode === "memory"} className={`min-h-11 rounded-[0.6rem] text-sm font-semibold transition-colors ${gameMode === "memory" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>Défi mémoire</button><button type="button" onClick={() => setGameMode("survival")} aria-pressed={gameMode === "survival"} className={`min-h-11 rounded-[0.6rem] text-sm font-semibold transition-colors ${gameMode === "survival" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>Survie · 3 vies</button></div><p className="mt-3 text-sm leading-5 text-muted-foreground">{gameMode === "memory" ? "Le temps descend progressivement de 60 à 20 secondes." : "Trois erreurs, ou trois délais écoulés, terminent la partie."}</p><div className="mt-7"><p className="text-sm font-semibold text-muted-foreground">NOMBRE DE FILMS</p><div className="mt-2 overflow-hidden rounded-xl bg-muted">{([15, 30, 50, "all"] as QuizLength[]).map((length) => { const count = length === "all" ? eligibleCatalog.length : length; const active = selectedLength === length; return <button key={length} type="button" disabled={eligibleCatalog.length < count} onClick={() => setSelectedLength(length)} aria-pressed={active} className={`flex min-h-12 w-full items-center justify-between border-b border-border/60 px-4 text-left last:border-0 disabled:opacity-35 ${active ? "bg-primary/10 text-foreground" : "text-foreground"}`}><span className="font-semibold">{length === "all" ? "Tout le catalogue" : `${length} films`}</span><span className="flex items-center gap-2 text-sm text-muted-foreground">{length === "all" ? `${eligibleCatalog.length} disponibles` : ""}{active && <Check className="size-4 text-primary" />}</span></button>; })}</div></div><button type="button" onClick={() => setAdvancedOpen(true)} className="mt-5 flex min-h-12 w-full items-center justify-between rounded-xl px-1 text-left text-sm font-medium text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><span className="flex items-center gap-2"><SlidersHorizontal className="size-4" />Règles avancées</span><span>{[withoutTitles && "Sans titres", directorMystery && "Réalisateur mystère"].filter(Boolean).join(" · ") || "Par défaut"}</span></button><Button type="button" disabled={!selectedLength} onClick={startGame} className="mt-auto h-14 w-full rounded-xl text-base"><Clapperboard className="size-5" />{selectedCount ? `Commencer · ${selectedCount} films` : "Choisis une durée"}</Button>{advancedOpen && <div className="fixed inset-0 z-[60] flex items-end bg-black/45 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" role="dialog" aria-modal="true" aria-label="Règles avancées"><section className="w-full rounded-[1.25rem] bg-card p-5 shadow-2xl"><div className="mx-auto h-1 w-9 rounded-full bg-muted-foreground/30" /><h2 className="mt-5 text-xl font-bold tracking-[-0.03em]">Règles avancées</h2><p className="mt-1 text-sm leading-5 text-muted-foreground">Pour transformer la partie en mode expert.</p><label className="mt-5 flex min-h-14 items-center justify-between"><span><span className="block font-semibold">Sans titres</span><span className="text-sm text-muted-foreground">Année et informations de fiche seulement.</span></span><input type="checkbox" checked={withoutTitles} onChange={(event) => setWithoutTitles(event.target.checked)} className="size-5 accent-primary" /></label><label className="mt-3 flex min-h-14 items-center justify-between"><span><span className="block font-semibold">Réalisateur mystère</span><span className="text-sm text-muted-foreground">Les quatre films viennent du même cinéaste.</span></span><input type="checkbox" checked={directorMystery} onChange={(event) => setDirectorMystery(event.target.checked)} className="size-5 accent-primary" /></label><p className="mt-3 text-xs text-muted-foreground">{directorMystery ? `${eligibleCatalog.length} films compatibles.` : "Les faux choix sont déjà rapprochés par genre et époque."}</p><Button type="button" onClick={() => setAdvancedOpen(false)} className="mt-5 h-12 w-full rounded-xl">Terminé</Button></section></div>}</section>}</main>;
  }

  const resolvedCorrectly = Boolean(resolution && resolution.selectedId === question?.target.tmdbId);
  const timerDanger = timeLeft <= 10;
  const revealing = question?.stage === "detail" && timeLeft <= Math.max(0, activeTimeLimit - 20);
  const imageScale = question?.stage === "detail" ? (revealing ? "scale-[1.4]" : "scale-[2.25]") : "scale-[1.12]";
  const nextAction = gameMode === "survival" && !resolvedCorrectly && lives <= 0 ? "Voir mon résultat" : lineup.length === questionLimit ? "Voir mon résultat" : "Continuer";

  return <main id="main-content" className="zen-soft-in mx-auto flex h-[100dvh] w-full max-w-md flex-col overflow-hidden px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"><header className="flex items-center gap-3"><Link href="/catalog" aria-label="Quitter le quiz" className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><X className="size-5" /></Link><div className="min-w-0 flex-1" aria-label={`Progression : film ${questionIndex + 1} sur ${questionLimit}`}><div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out" style={{ width: `${progressPercentage}%` }} /></div><span className="sr-only">Film {questionIndex + 1} sur {questionLimit}</span></div>{gameMode === "survival" && <div className="inline-flex shrink-0 items-center gap-0.5 text-destructive" aria-label={`${lives} vies restantes`}>{Array.from({ length: MAX_LIVES }, (_, index) => <Heart key={index} className={`size-4 ${index < lives ? "fill-current" : "opacity-20"}`} />)}</div>}<div className={`inline-flex min-w-14 shrink-0 items-center justify-center gap-1 rounded-xl px-2.5 py-2 text-sm font-bold tabular-nums ${timerDanger ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}><Timer className="size-4" />{timeLeft}s</div></header>{isQuestionLoading || !question ? <section className="flex flex-1 flex-col justify-center" aria-live="polite"><div className="aspect-[16/10] animate-pulse rounded-2xl bg-muted" /><div className="mt-7 grid grid-cols-2 gap-3"><div className="h-[4.65rem] animate-pulse rounded-2xl bg-muted" /><div className="h-[4.65rem] animate-pulse rounded-2xl bg-muted" /><div className="h-[4.65rem] animate-pulse rounded-2xl bg-muted" /><div className="h-[4.65rem] animate-pulse rounded-2xl bg-muted" /></div><p className="mt-5 flex items-center justify-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Préparation des deux plans…</p></section> : <section className="flex min-h-0 flex-1 flex-col pt-6" aria-labelledby="quiz-question-title"><div><h1 id="quiz-question-title" className="text-[1.75rem] font-bold leading-[1.05] tracking-[-0.04em]">{question.stage === "detail" ? "Quel film cache ce détail ?" : "Et ce second plan ?"}</h1><p className="mt-2 text-sm leading-5 text-muted-foreground">{question.stage === "detail" ? revealing ? "Le cadre s’ouvre. À toi de relier les indices." : "Le plan s’ouvrira après 20 secondes." : "Valide ton souvenir avec une autre scène du même film."}</p></div><div className="relative mt-5 aspect-[16/10] overflow-hidden rounded-2xl bg-muted"><MoviePoster src={question.images[question.stage === "detail" ? 0 : 1]} alt="Plan de film à identifier" sizes="(max-width: 767px) 92vw, 430px" priority className={`${imageScale} object-cover transition-transform duration-700 ease-out`} style={{ objectPosition: question.cropOrigin }} /></div><div className="mt-5 grid grid-cols-2 gap-3" role="group" aria-label={withoutTitles ? "Propositions anonymes de films" : "Propositions de films proches"}>{question.choices.map((choice, index) => { const correct = choice.tmdbId === question.target.tmdbId; const selected = resolution?.selectedId === choice.tmdbId; const state = resolution ? correct ? "border-emerald-600 bg-emerald-600 text-white shadow-sm" : selected ? "border-destructive bg-destructive text-destructive-foreground shadow-sm" : "border-border bg-background text-muted-foreground opacity-45" : "border-border bg-card active:scale-[0.98] active:bg-muted"; const label = withoutTitles ? question.choiceHints[choice.tmdbId] ?? metadata(choice, directorMystery) : choice.title; return <button key={choice.id} type="button" onClick={() => answer(choice.tmdbId)} disabled={Boolean(resolution)} aria-label={`Choix ${String.fromCharCode(65 + index)} : ${label}`} className={`relative min-h-[4.75rem] rounded-2xl border-2 p-3 pr-8 text-left text-sm font-bold leading-5 transition-[background-color,border-color,transform,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-default ${state}`}><span className={`mb-1.5 flex size-5 items-center justify-center rounded-full text-[0.68rem] font-bold ${resolution && (correct || selected) ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>{String.fromCharCode(65 + index)}</span><span className="line-clamp-2">{label}</span>{resolution && correct && <Check className="absolute right-3 top-3 size-5" />}{resolution && selected && !correct && <X className="absolute right-3 top-3 size-5" />}</button>; })}</div><div className="mt-auto pt-5">{resolution ? <div role="status" className={`-mx-5 -mb-[max(1.25rem,env(safe-area-inset-bottom))] rounded-t-[1.75rem] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 ${resolvedCorrectly ? "bg-emerald-600 text-white" : "bg-destructive text-destructive-foreground"}`}><p className="text-lg font-bold">{resolvedCorrectly ? question.stage === "detail" ? "Premier plan validé." : "Exactement !" : resolution.timedOut ? "Temps écoulé." : "Pas cette fois."}</p><p className="mt-1 text-sm leading-5 opacity-90">{resolvedCorrectly && question.stage === "detail" ? "Un deuxième plan du même film t’attend." : <>La bonne réponse est <span className="font-bold">{question.target.title}</span>.</>}</p>{gameMode === "survival" && !resolvedCorrectly && <p className="mt-1 text-sm font-bold">{lives > 0 ? `${lives} vie${lives > 1 ? "s" : ""} restante${lives > 1 ? "s" : ""}.` : "Plus de vie : la partie s’arrête ici."}</p>}<Button type="button" onClick={continueGame} className="mt-4 h-14 w-full rounded-2xl bg-background text-foreground shadow-none hover:bg-background/90"><span>{nextAction}</span><ChevronRight className="size-4" /></Button></div> : <Button type="button" disabled className="h-14 w-full rounded-2xl text-base disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100">Choisis une réponse</Button>}</div></section>}</main>;
}
