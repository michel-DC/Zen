"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getColorName } from "@/lib/color-names";
import { Copy } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

type MovieCardProps = {
  id: number;
  image: string;
  title: string;
  author: string;
  palette?: (string | { hex: string; name: string; percentage: number })[];
};

export function MovieCard({
  id,
  image,
  title,
  author,
  palette = [],
}: MovieCardProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copié : ${text}`, {
      description: "Le code couleur a été ajouté à votre presse-papier.",
    });
  };

  const normalizedPalette = palette.map((col) =>
    typeof col === "string"
      ? { hex: col, name: getColorName(col), percentage: 0 }
      : col,
  );

  return (
    <article className="group relative flex flex-col bg-transparent rounded-md">
      <Link
        href={`/movies/${id}`}
        className="relative overflow-hidden rounded-xl transition-all group-hover:ring-1 group-hover:ring-foreground/50 block aspect-[2/3] shadow-sm hover:shadow-md"
      >
        <Image
          src={image}
          alt={title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
          className="object-cover rounded-xl"
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

        {normalizedPalette.length > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="flex -space-x-1 mt-1 shrink-0 outline-none hover:scale-110 transition-transform active:scale-95 cursor-pointer p-0.5"
                title="Voir la palette"
              >
                {normalizedPalette.slice(0, 3).map((col, i) => (
                  <span
                    key={i}
                    aria-hidden
                    style={{ backgroundColor: col.hex }}
                    className="rounded-full w-3 h-3 border border-background shadow-sm first:z-30 [&:nth-child(2)]:z-20 [&:nth-child(3)]:z-10"
                  />
                ))}
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md p-6 gap-6">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  Palette de couleurs
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Couleurs extraites de{" "}
                  <span className="font-semibold text-foreground">{title}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-2">
                {normalizedPalette.map((col, i) => (
                  <button
                    key={i}
                    onClick={() => copyToClipboard(col.hex)}
                    className="group/color flex items-center gap-4 p-2.5 rounded-xl hover:bg-muted/50 transition-colors active:scale-[0.99] text-left outline-none"
                  >
                    <div
                      className="size-11 rounded-lg shadow-sm shrink-0 transition-transform group-hover/color:scale-105"
                      style={{ backgroundColor: col.hex }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-mono font-bold uppercase tracking-wider">
                          {col.hex}
                        </span>
                        <div className="flex items-center gap-1.5 opacity-0 group-hover/color:opacity-100 transition-opacity">
                          <span className="text-[10px] font-medium text-muted-foreground uppercase">
                            Copier
                          </span>
                          <Copy className="size-3.5 text-muted-foreground" />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium truncate">
                        {col.name}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </article>
  );
}

MovieCard.Skeleton = function MovieCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-[2/3] w-full rounded-xl" />
      <div className="space-y-2 px-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
};

export default MovieCard;
