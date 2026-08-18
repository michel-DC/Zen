"use client";

import { useLoadingLine } from "@/components/layout/loading-line-provider";
import MoviePoster from "@/components/movie-poster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { movieApi, type DetailedMovie } from "@/lib/services/movie-api";
import { catalogApi } from "@/lib/services/catalog-api";
import { ArrowLeft, Star, User } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { startLoading, stopLoading } = useLoadingLine();

  const [movie, setMovie] = useState<DetailedMovie | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!params.id) return;

      try {
        setIsLoading(true);
        const data = await movieApi.getMovieDetail(Number(params.id));
        setMovie(data);
      } catch (err) {
        console.error(err);
        setError("Impossible de charger les détails du film.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [params.id]);

  const handleBack = () => {
    router.back();
  };
  const addTo = async (target: "catalog" | "watchlist") => {
    if (!movie) return;
    const payload = { title: movie.title, release_year: movie.release_year, director: movie.director, overview: movie.overview, poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null, tmdb_id: movie.id, genres: movie.genres, watched_at: null, rating: null, favorite: false, notes: null };
    try {
      if (target === "catalog") await catalogApi.createMovie(payload); else await catalogApi.createWatchlistMovie(payload);
      toast.success(target === "catalog" ? "Film ajouté au catalogue" : "Film ajouté à À voir");
    } catch (error: any) { toast.error(error?.message || "Impossible d’ajouter ce film"); }
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
    <main className="min-h-screen pb-20">
      <div className="max-w-7/8 mx-auto px-8 pt-8">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mb-8 hover:bg-transparent p-0 text-muted-foreground hover:text-foreground transition-colors"
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
          <div className="flex flex-col">
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
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
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
                  <div className="mt-6 flex gap-2"><Button onClick={() => addTo("watchlist")} variant="outline">Ajouter à voir</Button><Button onClick={() => addTo("catalog")}>Ajouter au catalogue</Button></div>
                </div>

                <div className="mt-10">
                  <h2 className="text-lg font-semibold mb-3">Synopsis</h2>
                  <p className="text-muted-foreground leading-relaxed max-w-3xl">
                    {movie?.overview ||
                      "Aucune description disponible pour ce film."}
                  </p>
                </div>

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
    </main>
  );
}
