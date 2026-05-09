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
import * as React from "react";

const sampleMovie = {
  image:
    "https://media.themoviedb.org/t/p/w500/dBQuk2LkHjrDsSjueirPQg96GCc.jpg",
  title: "Bones and All",
  author: "Luca Guadagnino",
};

function randomHex() {
  return (
    "#" +
    Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, "0")
  );
}

export default function MovieGrid() {
  const { runAfterLoading } = useLoadingLine();
  const totalItems = 40;
  const perPage = 32;
  const pages = Math.max(1, Math.ceil(totalItems / perPage));

  const [page, setPage] = React.useState(1);

  const items = React.useMemo(() => {
    return Array.from({ length: totalItems }).map(() => ({
      ...sampleMovie,
      palette: Array.from({ length: 6 }).map(() => randomHex()),
    }));
  }, []);

  const handlePageChange = (newPage: number) => {
    if (newPage === page || newPage < 1 || newPage > pages) return;

    runAfterLoading(() => {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const start = (page - 1) * perPage;
  const pageItems = items.slice(start, start + perPage);

  return (
    <section className="max-w-full mx-auto px-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-10">
        {pageItems.map((m, i) => (
          <MovieCard
            key={i}
            image={m.image}
            title={m.title}
            author={m.author}
            palette={m.palette}
          />
        ))}
      </div>

      <div className="mt-6">
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

            {Array.from({ length: pages }).map((_, idx) => {
              const num = idx + 1;
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
    </section>
  );
}
