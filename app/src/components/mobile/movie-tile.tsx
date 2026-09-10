"use client";

import MoviePoster from "@/components/movie-poster";
import { extractImagePalette, type ImagePaletteColor } from "@/lib/image-palette";
import { BookmarkPlus, Check, Library, Trash2, X } from "lucide-react";
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
  React.useEffect(() => {
    if (!image) { setPalette([]); return; }
    let active = true;
    void extractImagePalette(image, 3).then((colors) => { if (active) setPalette(colors); });
    return () => { active = false; };
  }, [image]);
  const start = () => { timer.current = setTimeout(() => { setSheetOpen(true); navigator.vibrate?.(18); }, 520); };
  const cancel = () => { if (timer.current) clearTimeout(timer.current); };
  const actions = [
    onCatalog && { label: "Ajouter au catalogue", icon: Library, action: onCatalog },
    onWatchlist && { label: "Ajouter à voir", icon: BookmarkPlus, action: onWatchlist },
    onWatched && { label: "Marquer comme vu", icon: Check, action: onWatched },
    onDelete && { label: "Retirer", icon: Trash2, action: onDelete, destructive: true },
  ].filter(Boolean) as Array<{ label: string; icon: typeof Library; action: () => void; destructive?: boolean }>;

  return (
    <>
      <article className="min-w-0">
        <Link href={id ? `/movies/${id}` : "/catalog"} onPointerDown={start} onPointerUp={cancel} onPointerCancel={cancel} onPointerLeave={cancel} onContextMenu={(event) => { if (actions.length) { event.preventDefault(); setSheetOpen(true); } }} className="relative block aspect-[2/3] overflow-hidden rounded-xl bg-muted shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.985]">
          <MoviePoster src={image} alt={title} sizes="(max-width: 767px) 48vw, 240px" />
        </Link>
        <Link href={id ? `/movies/${id}` : "/catalog"} className="mt-3 block px-1 focus-visible:outline-2 focus-visible:outline-ring">
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-foreground/90">{title}</h3>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-xs text-muted-foreground">{author ? `Par ${author}` : year ?? ""}</p>
            {palette.length > 0 && <span aria-label="Palette de l’affiche" className="flex shrink-0 -space-x-1">{palette.map((color, index) => <i key={color.hex} aria-hidden className={`size-3 rounded-full border border-background ${index === 0 ? "z-30" : index === 1 ? "z-20" : "z-10"}`} style={{ backgroundColor: color.hex }} />)}</span>}
          </div>
        </Link>
      </article>
      {sheetOpen && (
        <div className="fixed inset-0 z-[70] flex items-end bg-black/25 p-3 backdrop-blur-[2px]" onClick={() => setSheetOpen(false)}>
          <section role="dialog" aria-modal="true" aria-label={`Actions pour ${title}`} className="zen-sheet-in w-full rounded-[1.75rem] bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between px-3 py-2"><p className="truncate pr-4 font-semibold">{title}</p><button className="flex size-11 items-center justify-center rounded-full bg-muted" onClick={() => setSheetOpen(false)} aria-label="Fermer"><X className="size-5" /></button></div>
            <div className="mt-1 space-y-1">{actions.map(({ label, icon: Icon, action, destructive }) => <button key={label} onClick={() => { setSheetOpen(false); action(); }} className={`flex min-h-14 w-full items-center gap-3 rounded-[1.1rem] px-4 text-left text-base font-medium active:bg-muted ${destructive ? "text-destructive" : ""}`}><Icon className="size-5" />{label}</button>)}</div>
          </section>
        </div>
      )}
    </>
  );
}
