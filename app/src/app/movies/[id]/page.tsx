"use client";

import { useLoadingLine } from "@/components/layout/loading-line-provider";
import MoviePoster from "@/components/movie-poster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { movieApi, type DetailedMovie } from "@/lib/services/movie-api";
import { catalogApi } from "@/lib/services/catalog-api";
import type { CatalogMovie } from "@/lib/services/catalog-api";
import FilmJournal from "@/components/journal/film-journal";
import AfterFilmDialog, { type AfterFilmPayload } from "@/components/journal/after-film-dialog";
import { syncJourneyAfterViewing } from "@/lib/journey-progress";
import { extractImagePalette } from "@/lib/image-palette";
import { ArrowLeft, BookmarkPlus, Star, User } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const TMDB_IMAGE_URL = "https://image.tmdb.org/t/p/w780";

function StillsCarousel({ movie }: { movie: DetailedMovie }) {
  const backdropPaths = Array.from(new Set([movie.backdrop_path, ...(movie.images?.backdrops ?? []).map((backdrop) => backdrop.file_path)].filter((path): path is string => Boolean(path)))).slice(0, 8);
  if (!backdropPaths.length) return null;
  return (
    <section className="mt-10" aria-labelledby="stills-heading">
      <div className="flex items-baseline justify-between"><h2 id="stills-heading" className="text-lg font-semibold">Images du film</h2><span className="text-xs text-muted-foreground">Fais glisser</span></div>
      <div className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
        {backdropPaths.map((path, index) => <div key={path} className="relative aspect-[16/10] w-[78vw] max-w-sm shrink-0 snap-start overflow-hidden rounded-xl bg-muted"><MoviePoster src={`${TMDB_IMAGE_URL}${path}`} alt={`Image ${index + 1} de ${movie.title}`} sizes="(max-width: 767px) 78vw, 360px" /></div>)}
      </div>
    </section>
  );
}

function CastCarousel({ movie }: { movie: DetailedMovie }) {
  if (!movie.cast.length) return null;
  return (
    <section className="mt-10" aria-labelledby="cast-heading">
      <h2 id="cast-heading" className="text-lg font-semibold">Casting</h2>
      <div className="-mx-4 mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
        {movie.cast.slice(0, 10).map((actor) => <article key={actor.name} className="w-20 shrink-0 snap-start text-center"><div className="relative mx-auto aspect-square overflow-hidden rounded-full bg-muted">{actor.profile_path ? <Image src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`} alt={actor.name} fill sizes="80px" className="object-cover" /> : <User className="absolute inset-0 m-auto size-8 text-muted-foreground/50" />}</div><p className="mt-2 line-clamp-2 text-xs font-medium leading-4">{actor.name}</p></article>)}
      </div>
    </section>
  );
}

function ColorPalette({ movie }: { movie: DetailedMovie }) {
  if (!movie.palette.length) return null;
  return (
    <section className="mt-10" aria-labelledby="palette-heading">
      <h2 id="palette-heading" className="text-lg font-semibold">Couleurs</h2>
      <div className="mt-4 flex gap-3" role="list">{movie.palette.slice(0, 5).map((color) => <div key={color.hex} role="listitem" className="min-w-0 flex-1"><div className="aspect-square rounded-xl" style={{ backgroundColor: color.hex }} /><p className="mt-2 truncate text-[0.68rem] font-medium uppercase text-muted-foreground">{color.hex}</p></div>)}</div>
    </section>
  );
}

export default function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { startLoading, stopLoading } = useLoadingLine();

  const [movie, setMovie] = useState<DetailedMovie | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catalogIds, setCatalogIds] = useState<Set<number>>(new Set());
  const [catalogMovie, setCatalogMovie] = useState<CatalogMovie | null>(null);
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set());
  const [addingTo, setAddingTo] = useState<"catalog" | "watchlist" | null>(null);
  const [afterFilmOpen, setAfterFilmOpen] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!params.id) return;

      try {
        setIsLoading(true);
        const data = await movieApi.getMovieDetail(Number(params.id));
        const posterUrl = data.poster_path
          ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
          : null;
        const palette = posterUrl ? await extractImagePalette(posterUrl) : [];
        setMovie({ ...data, palette: palette.length ? palette : data.palette });
      } catch (err) {
        console.error(err);
        setError("Impossible de charger les détails du film.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [params.id]);

  useEffect(() => {
    let active = true;
    void catalogApi.getCatalog().then((document) => {
      if (!active) return;
      setCatalogIds(new Set(document.movies.map((item) => item.tmdb_id).filter((id): id is number => id !== null)));
      setWatchlistIds(new Set(document.watchlist.map((item) => item.tmdb_id).filter((id): id is number => id !== null)));
      setCatalogMovie(document.movies.find((item) => item.tmdb_id === Number(params.id)) ?? null);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const handleBack = () => {
    if (window.history.length > 1) router.back();
    else router.push("/catalog");
  };
  const isInCatalog = useMemo(() => Boolean(movie && catalogIds.has(movie.id)), [catalogIds, movie]);
  const isInWatchlist = useMemo(() => Boolean(movie && watchlistIds.has(movie.id)), [movie, watchlistIds]);

  const addTo = async (target: "catalog" | "watchlist") => {
    const alreadyInTarget = target === "catalog" ? isInCatalog : isInWatchlist;
    if (!movie || alreadyInTarget || addingTo) return;
    if (target === "catalog") { setAfterFilmOpen(true); return; }
    const payload = { title: movie.title, release_year: movie.release_year, director: movie.director, overview: movie.overview, poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null, tmdb_id: movie.id, genres: movie.genres, watched_at: null, rating: null, favorite: false, notes: null };
    try {
      setAddingTo(target);
      await catalogApi.createWatchlistMovie(payload);
      setWatchlistIds((ids) => new Set(ids).add(movie.id));
      toast.success("Film ajouté à À voir");
    } catch (error: unknown) { toast.error(error instanceof Error ? error.message : "Impossible d’ajouter ce film"); } finally { setAddingTo(null); }
  };
  const saveAfterFilm = async (reflection: AfterFilmPayload) => {
    if (!movie) return;
    const payload = { title: movie.title, release_year: movie.release_year, director: movie.director, overview: movie.overview, poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null, tmdb_id: movie.id, genres: movie.genres, watched_at: reflection.watched_at, rating: null, favorite: false, notes: null };
    try {
      setAddingTo("catalog");
      const record = await catalogApi.createMovie(payload);
      const result = await catalogApi.createViewing(record.id, { ...reflection, is_rewatch: false });
      setCatalogMovie(result.movie);
      void syncJourneyAfterViewing(result.movie, result.viewing.id).catch(() => undefined);
      setCatalogIds((ids) => new Set(ids).add(movie.id));
      setWatchlistIds((ids) => { const next = new Set(ids); next.delete(movie.id); return next; });
      toast.success("Film ajouté au catalogue");
    } catch (error: unknown) { toast.error(error instanceof Error ? error.message : "Impossible d’ajouter ce film"); throw error; }
    finally { setAddingTo(null); }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={handleBack} variant="outline">
          Retour
        </Button>
      </div>
    );
  }

  return (
    <main id="main-content" className="min-h-screen w-full overflow-x-clip px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] md:px-10 md:py-8 md:pb-20">
      <section className="mx-auto max-w-md md:hidden">
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-muted">
          <button onClick={handleBack} aria-label="Retour à la page précédente" className="absolute left-3 top-3 z-20 flex size-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md active:scale-95"><ArrowLeft className="size-5" /></button>
          {isLoading ? <Skeleton className="absolute inset-0" /> : <MoviePoster src={movie?.poster_path ? `https://image.tmdb.org/t/p/w780${movie.poster_path}` : null} alt={movie?.title || "Affiche du film"} priority sizes="100vw" />}
        </div>
        {isLoading ? <div className="space-y-3 py-6"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-5 w-1/2" /><Skeleton className="h-20 w-full" /></div> : movie && <div className="py-6">
          <h1 className="text-[1.9rem] font-bold leading-[1.08] tracking-[-0.04em]">{movie.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><span>{movie.release_year}</span><span aria-hidden="true">·</span><span>{movie.director || "Réalisateur inconnu"}</span><span aria-hidden="true">·</span><span className="flex items-center gap-1 text-foreground"><Star className="size-4 fill-current text-amber-500" />{movie.vote_average.toFixed(1)}</span></div>
          <div className="mt-4 flex flex-wrap gap-2">{movie.genres.slice(0, 3).map((genre) => <span key={genre} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{genre}</span>)}</div>
          <div className="mt-6 grid gap-2"><Button className="h-14 rounded-full text-base" disabled={isInCatalog || Boolean(addingTo)} onClick={() => addTo("catalog")}>{addingTo === "catalog" ? "Ajout en cours…" : isInCatalog ? "Déjà dans le catalogue" : "Ajouter au catalogue"}</Button><Button className="h-14 rounded-full text-base" variant="outline" disabled={isInWatchlist || Boolean(addingTo)} onClick={() => addTo("watchlist")}><BookmarkPlus />{addingTo === "watchlist" ? "Ajout en cours…" : isInWatchlist ? "Déjà dans À voir" : "Ajouter à voir"}</Button></div>
          <p className="mt-7 text-base leading-6 text-muted-foreground">{movie.overview || "Aucun synopsis disponible."}</p>
          <StillsCarousel movie={movie} /><CastCarousel movie={movie} /><ColorPalette movie={movie} />
          {catalogMovie && <FilmJournal movie={catalogMovie} onUpdated={setCatalogMovie} />}
        </div>}
      </section>
      <div className="mx-auto hidden md:block">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à la liste
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-[350px_1fr] gap-12">
          {/* Affiche */}
          <div className="relative aspect-[2/3] w-full max-w-[350px] mx-auto md:mx-0 rounded-xl overflow-hidden shadow-2xl ring-1 ring-foreground/10">
            {isLoading ? (
              <Skeleton className="absolute inset-0 bg-foreground/10" />
            ) : (
              <MoviePoster
                src={movie?.poster_path ? `https://image.tmdb.org/t/p/w780${movie.poster_path}` : null}
                alt={movie?.title || "Poster"}
                priority
                sizes="350px"
                className="object-cover"
              />
            )}
          </div>

          {/* Informations */}
          <div className="flex min-w-0 flex-col">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-3/4 bg-foreground/10" />
                <Skeleton className="h-6 w-1/4 bg-foreground/10" />
                <div className="flex gap-2 py-2">
                  <Skeleton className="h-6 w-20 bg-foreground/10 rounded-full" />
                  <Skeleton className="h-6 w-20 bg-foreground/10 rounded-full" />
                </div>
                <div className="space-y-2 pt-4">
                  <Skeleton className="h-4 w-full bg-foreground/10" />
                  <Skeleton className="h-4 w-full bg-foreground/10" />
                  <Skeleton className="h-4 w-2/3 bg-foreground/10" />
                </div>

                <div className="mt-12 pt-8 border-t border-border">
                  <Skeleton className="h-6 w-38 bg-foreground/10 mb-6" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex flex-col gap-3">
                        <Skeleton className="aspect-square rounded-xl bg-foreground/10" />
                        <div className="space-y-1.5 px-0.5">
                          <Skeleton className="h-3 w-3/4 bg-foreground/10" />
                          <Skeleton className="h-2.5 w-1/2 bg-foreground/10 opacity-70" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                    {movie?.title}
                    {movie?.release_year && (
                      <span className="ml-3 font-light text-muted-foreground">
                        ({movie.release_year})
                      </span>
                    )}
                  </h1>

                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center text-amber-500 font-semibold">
                      <Star className="w-5 h-5 fill-current mr-1" />
                      {movie?.vote_average.toFixed(1)}
                    </div>
                    <div className="flex items-center text-muted-foreground text-sm border-l border-border pl-4">
                      Par{" "}
                      <span className="font-medium text-foreground ml-1">
                        {movie?.director}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    {movie?.genres.map((genre) => (
                      <Badge
                        key={genre}
                        variant="secondary"
                        className="px-3 py-1 font-normal opacity-80"
                      >
                        {genre}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-6 flex gap-2"><Button disabled={isInWatchlist || Boolean(addingTo)} onClick={() => addTo("watchlist")} variant="outline">{addingTo === "watchlist" ? "Ajout en cours…" : isInWatchlist ? "Déjà dans À voir" : "Ajouter à voir"}</Button><Button disabled={isInCatalog || Boolean(addingTo)} onClick={() => addTo("catalog")}>{addingTo === "catalog" ? "Ajout en cours…" : isInCatalog ? "Déjà dans le catalogue" : "Ajouter au catalogue"}</Button></div>
                </div>

                <div className="mt-10">
                  <h2 className="text-lg font-semibold mb-3">Synopsis</h2>
                  <p className="text-muted-foreground leading-relaxed max-w-3xl">
                    {movie?.overview ||
                      "Aucune description disponible pour ce film."}
                  </p>
                </div>

                {catalogMovie && <FilmJournal movie={catalogMovie} onUpdated={setCatalogMovie} />}

                {movie && <StillsCarousel movie={movie} />}

                {/* Palette de couleurs (Directement sur la page) */}
                <div className="mt-12 pt-8 border-t border-border">
                  <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    Palette de couleurs
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                    {movie?.palette.map((col, i) => (
                      <div key={i} className="flex flex-col gap-3 group">
                        <div
                          className="aspect-square rounded-xl border border-border shadow-inner transition-transform group-hover:scale-105"
                          style={{ backgroundColor: col.hex }}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium truncate">
                            {col.name}
                          </span>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[11px] font-mono text-muted-foreground uppercase">
                              {col.hex}
                            </span>
                            <span className="text-[11px] bg-muted px-2 py-0.5 rounded-full font-medium">
                              {col.percentage}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Cast Section */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            Casting
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-6">
            {isLoading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <Skeleton className="aspect-square rounded-full bg-foreground/10" />
                    <Skeleton className="h-4 w-full bg-foreground/10" />
                  </div>
                ))
              : movie?.cast && movie.cast.length > 0
                ? movie.cast.map((actor, i) => (
                    <div
                      key={i}
                      className="flex flex-col items-center gap-3 text-center group"
                    >
                      <div className="relative aspect-square w-full rounded-full overflow-hidden border border-border bg-muted ring-offset-background group-hover:ring-2 ring-primary transition-all">
                        {actor.profile_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                            alt={actor.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <User className="absolute inset-0 m-auto w-1/2 h-1/2 text-muted-foreground/40" />
                        )}
                      </div>
                      <span className="text-[12px] font-medium leading-tight line-clamp-2 text-muted-foreground group-hover:text-foreground transition-colors">
                        {actor.name}
                      </span>
                    </div>
                  ))
                : null}
          </div>
        </div>
      </div>
      <AfterFilmDialog open={afterFilmOpen} title={movie?.title || "ce film"} onOpenChange={setAfterFilmOpen} onSave={saveAfterFilm} />
    </main>
  );
}
