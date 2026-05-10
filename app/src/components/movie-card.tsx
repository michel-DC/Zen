"use client";

import Image from "next/image";
import { movieApi, type DetailedMovie } from "@/lib/services/movie-api";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

type MovieCardProps = {
  id: number;
  image: string;
  title: string;
  author: string;
  palette?: string[];
};

export function MovieCard({
  id,
  image,
  title,
  author,
  palette = [],
}: MovieCardProps) {
  return (
    <article className="group relative flex flex-col bg-transparent rounded-md">
      <Link href={`/movies/${id}`} className="relative overflow-hidden rounded-md transition-all group-hover:ring-1 group-hover:ring-foreground/50 block aspect-[2/3]">
        <Image
          src={image}
          alt={title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
          className="object-cover rounded-md"
        />
      </Link>

      <div className="mt-3 px-1 text-left flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Link href={`/movies/${id}`}>
            <h3 className="text-sm font-semibold text-foreground/90 leading-tight line-clamp-2 hover:text-primary transition-colors">
              {title}
            </h3>
          </Link>
          <p className="text-xs text-muted-foreground mt-1">Par {author}</p>
        </div>

        {palette && palette.length > 0 && (
          <div className="flex -space-x-1.5 mt-0.5 shrink-0">
            {palette.map((col, i) => (
              <span
                key={i}
                aria-hidden
                style={{ backgroundColor: col }}
                className="rounded-full w-3.5 h-3.5 border border-background shadow-sm"
              />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export default MovieCard;
