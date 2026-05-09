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
import { getColorName } from "@/lib/color-names";

type MovieCardProps = {
  image: string;
  title: string;
  author: string;
  palette?: string[];
};

export function MovieCard({
  image,
  title,
  author,
  palette = [],
}: MovieCardProps) {
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

        {palette.length > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex -space-x-1.5 mt-0.5 shrink-0 cursor-pointer hover:scale-105 transition-transform">
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
                <DialogTitle>Palette de couleurs — {title}</DialogTitle>
                <DialogDescription>
                  Détails des couleurs extraites de l'affiche du film.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {palette.map((col, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-md border border-border shadow-inner"
                      style={{ backgroundColor: col }}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">
                        {getColorName(col)}
                      </span>
                      <span className="text-xs text-muted-foreground uppercase">
                        {col}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </article>
  );
}

export default MovieCard;
