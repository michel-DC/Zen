"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { movieApi, type DetailedMovie } from "@/lib/services/movie-api";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [details, setDetails] = useState<DetailedMovie | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenDetails = async (open: boolean) => {
    if (open && !details) {
      try {
        setIsLoading(true);
        const data = await movieApi.getMovieDetail(id);
        setDetails(data);
      } catch (error) {
        console.error("Failed to load movie details:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <article className="group relative flex flex-col bg-transparent rounded-md">
      <div className="relative overflow-hidden rounded-md transition-all group-hover:ring-1 group-hover:ring-foreground/50">
        <Image
          src={image}
          alt={title}
          width={400}
          height={600}
          className="w-full h-auto object-cover rounded-md"
        />
      </div>

      <div className="mt-3 px-1 text-left flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground/90 leading-tight line-clamp-2">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">Par {author}</p>
        </div>

        {palette && palette.length > 0 && (
          <Dialog onOpenChange={handleOpenDetails}>
            <DialogTrigger asChild>
              <button className="flex -space-x-1.5 mt-0.5 shrink-0 cursor-pointer hover:scale-110 transition-transform">
                {palette.map((col, i) => (
                  <span
                    key={i}
                    aria-hidden
                    style={{ backgroundColor: col }}
                    className="rounded-full w-3.5 h-3.5 border border-background shadow-sm"
                  />
                ))}
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="line-clamp-1">Palette — {title}</DialogTitle>
                <DialogDescription>
                  Détail des couleurs extraites par analyse d'image.
                </DialogDescription>
              </DialogHeader>
              
              {/* On fixe une hauteur min pour éviter le saut au chargement */}
              <div className="grid gap-4 py-4 min-h-[300px]">
                {isLoading ? (
                  // Skeletons plus visibles avec bg-foreground/10
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="w-12 h-12 rounded-lg bg-foreground/10" />
                      <div className="flex flex-col gap-2 flex-1">
                        <Skeleton className="h-4 w-3/4 bg-foreground/10" />
                        <Skeleton className="h-3 w-1/2 bg-foreground/10" />
                      </div>
                    </div>
                  ))
                ) : details && details.palette && details.palette.length > 0 ? (
                  details.palette.map((col, i) => (
                    <div key={i} className="flex items-center gap-4 group/item">
                      <div
                        className="w-12 h-12 rounded-lg border border-border shadow-inner transition-transform group-hover/item:scale-105"
                        style={{ backgroundColor: col.hex }}
                      />
                      <div className="flex flex-col flex-1">
                        <span className="font-semibold text-sm">
                          {col.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground font-mono uppercase">
                            {col.hex}
                          </span>
                          <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full font-medium">
                            {col.percentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                   <div className="flex flex-col items-center justify-center py-10 text-center">
                     <p className="text-sm text-muted-foreground italic">
                       Impossible de charger les couleurs détaillées.
                     </p>
                   </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </article>
  );
}

export default MovieCard;
