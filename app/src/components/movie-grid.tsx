"use client";

import { useLoadingLine } from "@/components/layout/loading-line-provider";
import MovieCard from "@/components/movie-card";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { movieApi, type Movie } from "@/lib/services/movie-api";
import { ArrowLeft, Home } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

export default function MovieGrid() {
  const { runAfterLoading } = useLoadingLine();
  const searchParams = useSearchParams();
  const router = useRouter();

  const searchQuery = searchParams.get("search") || "";
  const currentFilter = searchParams.get("filter") || "Récent";
  const currentGenre = searchParams.get("genre") || "";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  const [movies, setMovies] = React.useState<Movie[]>([]);
  const [totalPages, setTotalPages] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchMovies = React.useCallback(
    async (
      targetPage: number,
      query?: string,
      filter?: string,
      genre?: string,
    ) => {
      try {
        setIsLoading(true);
        setMovies([]); // Reset pour afficher les skeletons

        const response = await movieApi.getMovies(
          targetPage,
          32,
          query,
          filter,
          genre,
        );
        setMovies(response.data);
        setTotalPages(response.pagination.total_pages);
      } catch (error) {
        console.error("Failed to fetch movies:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Déclenché quand le texte de recherche, filtre, genre OU la page change dans l'URL
  React.useEffect(() => {
    fetchMovies(currentPage, searchQuery, currentFilter, currentGenre);
  }, [fetchMovies, searchQuery, currentFilter, currentGenre, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());

    runAfterLoading(async () => {
      router.push(`/?${params.toString()}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const resetSearch = () => {
    runAfterLoading(async () => {
      router.push("/");
    });
  };

  // État de chargement
  if (isLoading && movies.length === 0) {
    return (
      <section className="max-w-full mx-auto px-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-10">
          {Array.from({ length: 12 }).map((_, i) => (
            <MovieCard.Skeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-full mx-auto px-4">
      {movies.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="bg-muted rounded-full p-6 mb-4">
            <svg
              className="w-12 h-12 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold">Aucun résultat</h3>
          <p className="text-muted-foreground mt-2">
            Nous n'avons trouvé aucun film correspondant à "{searchQuery}"
          </p>
          <Button
            variant="outline"
            onClick={resetSearch}
            className="mt-8 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-10">
            {movies.map((m) => (
              <MovieCard
                key={m.id}
                id={m.id}
                image={`https://image.tmdb.org/t/p/w500${m.poster_path}`}
                title={m.title}
                author={m.director || "Inconnu"}
                palette={m.palette}
              />
            ))}
          </div>

          {/* Logique de pagination / bouton retour */}
          <div className="mt-16 mb-12 flex justify-center">
            {totalPages > 1 ? (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e: any) => {
                        e.preventDefault();
                        handlePageChange(currentPage - 1);
                      }}
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const num = idx + 1;
                    if (totalPages > 7) {
                      if (
                        num > 1 &&
                        num < totalPages &&
                        (num < currentPage - 1 || num > currentPage + 1)
                      ) {
                        if (
                          num === currentPage - 2 ||
                          num === currentPage + 2
                        ) {
                          return (
                            <PaginationItem
                              key={num}
                              className="hidden sm:inline-block"
                            >
                              ...
                            </PaginationItem>
                          );
                        }
                        return null;
                      }
                    }

                    return (
                      <PaginationItem key={num}>
                        <PaginationLink
                          href="#"
                          isActive={num === currentPage}
                          onClick={(e: any) => {
                            e.preventDefault();
                            handlePageChange(num);
                          }}
                        >
                          {String(num)}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e: any) => {
                        e.preventDefault();
                        handlePageChange(currentPage + 1);
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            ) : searchQuery ? (
              // Si une seule page en mode recherche, on affiche le bouton retour
              <Button variant="outline" onClick={resetSearch} className="gap-2">
                <Home className="w-4 h-4" />
                Retour à l'accueil
              </Button>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
