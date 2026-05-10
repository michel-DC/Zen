"use client";

import MovieCard from "@/components/movie-card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useLoadingLine } from "@/components/layout/loading-line-provider";
import { movieApi, type Movie } from "@/lib/services/movie-api";
import { useSearchParams } from "next/navigation";
import * as React from "react";

export default function MovieGrid() {
  const { runAfterLoading } = useLoadingLine();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  
  const [movies, setMovies] = React.useState<Movie[]>([]);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchMovies = React.useCallback(async (targetPage: number, query?: string) => {
    try {
      setIsLoading(true);
      const response = await movieApi.getMovies(targetPage, 32, query);
      setMovies(response.data);
      setTotalPages(response.pagination.total_pages);
      setPage(response.pagination.page);
    } catch (error) {
      console.error("Failed to fetch movies:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Chargement initial et lors du changement de recherche
  React.useEffect(() => {
    fetchMovies(1, searchQuery);
  }, [fetchMovies, searchQuery]);

  const handlePageChange = (newPage: number) => {
    if (newPage === page || newPage < 1 || newPage > totalPages) return;

    runAfterLoading(async () => {
      await fetchMovies(newPage, searchQuery);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  if (isLoading && movies.length === 0) {
    return (
      <div className="max-w-full mx-auto px-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-10 opacity-50">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <section className="max-w-full mx-auto px-4">
      {movies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg text-muted-foreground">Aucun film trouvé pour "{searchQuery}"</p>
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

          {totalPages > 1 && (
            <div className="mt-12 mb-8">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e: any) => {
                        e.preventDefault();
                        handlePageChange(page - 1);
                      }}
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const num = idx + 1;
                    if (totalPages > 7) {
                      if (num > 1 && num < totalPages && (num < page - 1 || num > page + 1)) {
                        if (num === page - 2 || num === page + 2) {
                           return <PaginationItem key={num} className="hidden sm:inline-block">...</PaginationItem>;
                        }
                        return null;
                      }
                    }

                    return (
                      <PaginationItem key={num}>
                        <PaginationLink
                          href="#"
                          isActive={num === page}
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
                        handlePageChange(page + 1);
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </section>
  );
}
