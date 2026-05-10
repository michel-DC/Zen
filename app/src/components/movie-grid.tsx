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
      // On vide la liste si c'est une nouvelle recherche pour afficher les skeletons
      setMovies([]); 
      
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

  // État de chargement initial ou transition de recherche
  if (isLoading && movies.length === 0) {
    return (
      <section className="max-w-full mx-auto px-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-10 opacity-50">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
               <div className="aspect-[2/3] bg-foreground/10 animate-pulse rounded-md" />
               <div className="space-y-2">
                 <div className="h-4 w-3/4 bg-foreground/10 animate-pulse rounded" />
                 <div className="h-3 w-1/2 bg-foreground/10 animate-pulse rounded" />
               </div>
            </div>
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
            <svg className="w-12 h-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold">Aucun résultat</h3>
          <p className="text-muted-foreground mt-2">Nous n'avons trouvé aucun film correspondant à "{searchQuery}"</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="mt-6 text-sm font-medium text-primary hover:underline"
          >
            Retour à l'accueil
          </button>
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
            <div className="mt-16 mb-12">
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
