"use client";

import MoviePoster from "@/components/movie-poster";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { extractImagePalette, type ImagePaletteColor } from "@/lib/image-palette";
import { BookmarkPlus, Check, Library, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";

type Props = {
  id: number;
  image?: string | null;
  title: string;
  author?: string | null;
  year?: number | null;
  onCatalog?: () => void;
  onWatchlist?: () => void;
  onDelete?: () => void;
  onWatched?: () => void;
};

export default function MobileMovieTile({ id, image, title, author, year, onCatalog, onWatchlist, onDelete, onWatched }: Props) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [palette, setPalette] = React.useState<ImagePaletteColor[]>([]);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerOrigin = React.useRef<{ x: number; y: number } | null>(null);
  const preventNavigation = React.useRef(false);
  React.useEffect(() => {
    if (!image) { setPalette([]); return; }
    let active = true;
    void extractImagePalette(image, 3).then((colors) => { if (active) setPalette(colors); });
    return () => { active = false; };
  }, [image]);
  const cancelTimer = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  const start = (event: React.PointerEvent<HTMLAnchorElement>) => {
    pointerOrigin.current = { x: event.clientX, y: event.clientY };
    preventNavigation.current = false;
    timer.current = setTimeout(() => {
      preventNavigation.current = true;
      setSheetOpen(true);
      navigator.vibrate?.(18);
    }, 520);
  };
  const move = (event: React.PointerEvent<HTMLAnchorElement>) => {
    if (!pointerOrigin.current || !actions.length) return;
    const deltaX = event.clientX - pointerOrigin.current.x;
    const deltaY = event.clientY - pointerOrigin.current.y;
    if (deltaX < -48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      cancelTimer();
      preventNavigation.current = true;
      pointerOrigin.current = null;
      setSheetOpen(true);
      navigator.vibrate?.(12);
    }
  };
  const cancel = () => { cancelTimer(); pointerOrigin.current = null; };
  const actions = [
    onCatalog && { label: "Ajouter au catalogue", icon: Library, action: onCatalog },
    onWatchlist && { label: "Ajouter à voir", icon: BookmarkPlus, action: onWatchlist },
    onWatched && { label: "Marquer comme vu", icon: Check, action: onWatched },
    onDelete && { label: "Retirer", icon: Trash2, action: onDelete, destructive: true },
  ].filter(Boolean) as Array<{ label: string; icon: typeof Library; action: () => void; destructive?: boolean }>;

  return (
    <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
      <article className="relative min-w-0">
        <Link href={id ? `/movies/${id}` : "/catalog"} onPointerDown={start} onPointerMove={move} onPointerUp={cancel} onPointerCancel={cancel} onPointerLeave={cancel} onClick={(event) => { if (preventNavigation.current) { event.preventDefault(); preventNavigation.current = false; } }} onContextMenu={(event) => { if (actions.length) { event.preventDefault(); setSheetOpen(true); } }} className="relative block aspect-[2/3] overflow-hidden rounded-xl bg-muted shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.985]">
          <MoviePoster src={image} alt={title} sizes="(max-width: 767px) 48vw, 240px" />
        </Link>
        {actions.length > 0 && <button type="button" onClick={() => setSheetOpen(true)} aria-label={`Actions pour ${title}`} className="absolute right-2 top-2 flex size-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm active:scale-95"><MoreHorizontal className="size-5" /></button>}
        <Link href={id ? `/movies/${id}` : "/catalog"} className="mt-3 block px-1 focus-visible:outline-2 focus-visible:outline-ring">
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-foreground/90">{title}</h3>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-xs text-muted-foreground">{author ? `Par ${author}` : year ?? ""}</p>
            {palette.length > 0 && <span aria-label="Palette de l’affiche" className="flex shrink-0 -space-x-1">{palette.map((color, index) => <i key={color.hex} aria-hidden className={`size-3 rounded-full border border-background ${index === 0 ? "z-30" : index === 1 ? "z-20" : "z-10"}`} style={{ backgroundColor: color.hex }} />)}</span>}
          </div>
        </Link>
      </article>
      <DialogContent showCloseButton={false} className="gap-2 p-3 sm:max-w-sm">
        <div aria-hidden="true" className="mx-auto mb-1 h-1 w-9 rounded-full bg-border md:hidden" />
        <DialogHeader className="px-3 pb-2 pt-1">
          <DialogTitle className="truncate text-base">{title}</DialogTitle>
          <DialogDescription className="sr-only">Choisis une action pour ce film.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1">{actions.map(({ label, icon: Icon, action, destructive }) => <button key={label} onClick={() => { setSheetOpen(false); navigator.vibrate?.(10); action(); }} className={`flex min-h-14 w-full items-center gap-3 rounded-xl px-4 text-left text-base font-medium active:bg-muted ${destructive ? "text-destructive" : ""}`}><Icon className="size-5" />{label}</button>)}</div>
        <button type="button" onClick={() => setSheetOpen(false)} className="mt-1 min-h-12 w-full rounded-xl bg-muted text-sm font-semibold">Annuler</button>
      </DialogContent>
    </Dialog>
  );
}
