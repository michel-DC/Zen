"use client";

import MovieCard from "@/components/movie-card";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { PageHeading } from "@/components/layout/page-heading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import type { CatalogMovie } from "@/lib/services/catalog-api";
import { catalogApi } from "@/lib/services/catalog-api";
import { Search, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

type CatalogGroup = {
  key: string;
  label: string;
  movies: CatalogMovie[];
};

function formatDateLabel(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "Date inconnue";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function groupMoviesByAddedDate(movies: CatalogMovie[]): CatalogGroup[] {
  const grouped = new Map<string, CatalogMovie[]>();

  for (const movie of movies) {
    const key = formatDateLabel(movie.created_at);
    const current = grouped.get(key) || [];
    current.push(movie);
    grouped.set(key, current);
  }

  return Array.from(grouped.entries()).map(([key, value]) => ({
    key,
    label: key,
    movies: value,
  }));
}

export default function CatalogPage() {
  const [movies, setMovies] = React.useState<CatalogMovie[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [order, setOrder] = React.useState("recent");

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setIsLoading(true);
        const doc = await catalogApi.getCatalog();
        // catalogApi returns { movies: CatalogMovie[] }
        const list = doc.movies || [];
        if (!mounted) return;
        setMovies(list);
      } catch (err) {
        console.error("Failed to load catalog:", err);
        setMovies([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredMovies = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return movies;

    return movies.filter((movie) => {
      const title = movie.title.toLowerCase();
      const director = (movie.director || "").toLowerCase();
      return title.includes(normalizedQuery) || director.includes(normalizedQuery);
    });
  }, [movies, query]);

  const groupedMovies = React.useMemo(
    () => groupMoviesByAddedDate([...filteredMovies].sort((a, b) => order === "oldest" ? Date.parse(a.created_at) - Date.parse(b.created_at) : Date.parse(b.created_at) - Date.parse(a.created_at))),
    [filteredMovies, order],
  );

  const handleDelete = async (movieId: string) => {
    try {
      setDeletingId(movieId);
      await catalogApi.deleteMovie(movieId);
      setMovies((currentMovies) =>
        currentMovies.filter((movie) => movie.id !== movieId),
      );
      toast.success("Film supprimé du catalogue");
    } catch (error: any) {
      toast.error(error?.message || "Impossible de supprimer ce film");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading && movies.length === 0) {
    return (
      <main id="main-content" className="w-full px-4 py-8 sm:px-6 lg:px-8">
        <section className="space-y-8">
          <div className="space-y-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-7 w-36" />
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((__, index) => (
                    <div key={index} className="space-y-3">
                      <MovieCard.Skeleton />
                      <Skeleton className="h-8 w-24 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main id="main-content" className="w-full px-4 py-8 sm:px-6 lg:px-8">
      <section className="space-y-6">
        <PageHeading title="Catalogue" description={`${movies.length} film${movies.length > 1 ? "s" : ""}`}><Button asChild><Link href="/">Ajouter</Link></Button></PageHeading>
        <Label htmlFor="catalog-search" className="sr-only">Rechercher dans le catalogue</Label>
        <Label htmlFor="catalog-order" className="sr-only">Ordre d’ajout</Label>
        <ButtonGroup className="w-full">
          <ButtonGroupText aria-hidden="true" className="bg-background px-3"><Search /></ButtonGroupText>
          <Input id="catalog-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Titre ou réalisateur…" className="min-w-0 flex-1" style={{ width: 0 }} />
          <Select value={order} onValueChange={setOrder}><SelectTrigger id="catalog-order" className="h-9! w-40 shrink-0"><SelectValue /></SelectTrigger><SelectContent position="popper"><SelectItem value="recent">Plus récents</SelectItem><SelectItem value="oldest">Plus anciens</SelectItem></SelectContent></Select>
        </ButtonGroup>
        {movies.length === 0 ? (
          <div className="py-16 text-center">
            <h2 className="text-xl font-semibold">Catalogue vide</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Trouve un film depuis la recherche pour commencer ta collection.
            </p>
          </div>
        ) : groupedMovies.length === 0 ? (
          <div className="py-16 text-center">
            <h2 className="text-xl font-semibold">Aucun film trouvé</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Aucun film du catalogue ne correspond à "{query}".
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedMovies.map((group) => (
              <section key={group.key} className="space-y-4">
                <div className="border-b border-border pb-2">
                  <h2 className="text-lg font-semibold tracking-tight">
                    {group.label}
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {group.movies.map((movie) => (
                    <div key={movie.id} className="flex flex-col gap-3">
                      <MovieCard
                        id={movie.tmdb_id ? Number(movie.tmdb_id) : 0}
                        image={movie.poster_url}
                        title={movie.title}
                        author={movie.director || "Inconnu"}
                      />
                      <div className="flex items-center justify-between gap-3 px-1">
                        <span className="text-xs text-muted-foreground">
                          {movie.release_year || "Année inconnue"}
                        </span>
                        <Button
                          type="button"
                          onClick={() => handleDelete(movie.id)}
                          disabled={deletingId === movie.id}
                          aria-label={`Supprimer ${movie.title} du catalogue`}
                          title="Supprimer"
                          variant="destructive" size="icon"
                        >
                          <Trash2
                            className={`size-3.5 ${deletingId === movie.id ? "animate-pulse" : ""}`}
                          />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
