"use client";

import MoviePoster from "@/components/movie-poster";
import { BookmarkPlus, Check, Library, Trash2, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";

type Props = {
  id: number;
  image?: string | null;
  title: string;
  year?: number | null;
  onCatalog?: () => void;
  onWatchlist?: () => void;
  onDelete?: () => void;
  onWatched?: () => void;
};

export default function MobileMovieTile({ id, image, title, year, onCatalog, onWatchlist, onDelete, onWatched }: Props) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
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
        <Link href={id ? `/movies/${id}` : "/catalog"} onPointerDown={start} onPointerUp={cancel} onPointerCancel={cancel} onPointerLeave={cancel} onContextMenu={(event) => { if (actions.length) { event.preventDefault(); setSheetOpen(true); } }} className="relative block aspect-[2/3] overflow-hidden rounded-[1.15rem] bg-muted shadow-[0_1px_2px_rgba(0,0,0,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.985]">
          <MoviePoster src={image} alt={title} sizes="(max-width: 767px) 48vw, 240px" />
        </Link>
        <Link href={id ? `/movies/${id}` : "/catalog"} className="mt-2.5 block px-0.5 focus-visible:outline-2 focus-visible:outline-ring">
          <h3 className="line-clamp-2 text-[0.94rem] font-semibold leading-[1.2] tracking-[-0.015em]">{title}</h3>
          {year && <p className="mt-1 text-[0.8rem] text-muted-foreground">{year}</p>}
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
