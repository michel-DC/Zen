"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Heart, Star } from "lucide-react";
import * as React from "react";

const emotions = [
  ["bouleverse", "Bouleversé"], ["apaise", "Apaisé"], ["nostalgique", "Nostalgique"], ["joyeux", "Joyeux"],
  ["tendu", "Tendu"], ["melancolique", "Mélancolique"], ["inspire", "Inspiré"],
] as const;
const aspects = [
  ["histoire", "Histoire"], ["personnages", "Personnages"], ["mise_en_scene", "Mise en scène"], ["image", "Image"],
  ["musique", "Musique"], ["rythme", "Rythme"], ["dialogues", "Dialogues"], ["ambiance", "Ambiance"],
] as const;

export type AfterFilmPayload = {
  watched_at: string;
  rating?: number | null;
  favorite?: boolean;
  impression?: string | null;
  emotions?: string[];
  appreciated_aspects?: string[];
};

function localToday() {
  return new Date().toLocaleDateString("en-CA");
}

function toggle(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function RatingPicker({ value, onChange }: { value: number | null; onChange: (value: number) => void }) {
  return <div role="radiogroup" aria-label="Note sur cinq" className="flex items-center gap-1">
    {Array.from({ length: 5 }, (_, index) => {
      const fill = Math.max(0, Math.min(1, (value ?? 0) - index));
      return <span key={index} className="relative block size-8"><Star aria-hidden className="absolute inset-0 size-8 text-muted-foreground/35" strokeWidth={1.6} /><span aria-hidden className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}><Star className="size-8 fill-primary text-primary" strokeWidth={1.6} /></span><button type="button" className="absolute inset-y-0 left-0 w-1/2 focus-visible:outline-2 focus-visible:outline-ring" aria-label={`${index + 0.5} étoiles`} aria-pressed={value === index + 0.5} onClick={() => onChange(index + 0.5)} /><button type="button" className="absolute inset-y-0 right-0 w-1/2 focus-visible:outline-2 focus-visible:outline-ring" aria-label={`${index + 1} étoiles`} aria-pressed={value === index + 1} onClick={() => onChange(index + 1)} /></span>;
    })}
    <span className="ml-2 min-w-10 text-sm font-semibold tabular-nums">{value ? `${value.toLocaleString("fr-FR")}/5` : ""}</span>
  </div>;
}

export default function AfterFilmDialog({ open, title, onOpenChange, onSave }: { open: boolean; title: string; onOpenChange: (open: boolean) => void; onSave: (payload: AfterFilmPayload) => Promise<void> }) {
  const [rating, setRating] = React.useState<number | null>(null);
  const [favorite, setFavorite] = React.useState(false);
  const [impression, setImpression] = React.useState("");
  const [selectedEmotions, setSelectedEmotions] = React.useState<string[]>([]);
  const [selectedAspects, setSelectedAspects] = React.useState<string[]>([]);
  const [watchedAt, setWatchedAt] = React.useState(localToday());
  const [pending, setPending] = React.useState(false);
  const save = async (later: boolean) => {
    setPending(true);
    try {
      await onSave(later ? { watched_at: watchedAt } : { watched_at: watchedAt, rating, favorite, impression: impression.trim() || null, emotions: selectedEmotions, appreciated_aspects: selectedAspects });
      onOpenChange(false);
    } catch {
      // L'écran appelant présente déjà l'erreur dans un toast. Garder la
      // feuille ouverte permet de réessayer sans perdre la saisie.
    } finally { setPending(false); }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92dvh] overflow-y-auto border-0 bg-background p-5 md:max-w-lg"><div className="mx-auto -mt-1 mb-1 h-1 w-9 rounded-full bg-muted-foreground/25 md:hidden" aria-hidden="true" /><DialogHeader><DialogTitle>Après {title}</DialogTitle><DialogDescription>Garde une trace légère de ce que tu viens de voir. Tu pourras compléter plus tard.</DialogDescription></DialogHeader><div className="mt-2 space-y-6"><div className="flex items-end justify-between gap-4"><div className="min-w-0 flex-1"><label htmlFor="watched-at" className="text-sm font-medium">Visionné le</label><input id="watched-at" type="date" value={watchedAt} max={localToday()} onChange={(event) => setWatchedAt(event.target.value)} className="mt-2 block h-12 w-full rounded-xl bg-muted px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div><button type="button" onClick={() => setFavorite((value) => !value)} aria-pressed={favorite} className={`flex size-12 items-center justify-center rounded-full ${favorite ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`} aria-label={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}><Heart className={favorite ? "size-5 fill-current" : "size-5"} /></button></div><div><p className="text-sm font-medium">Ta note</p><div className="mt-2"><RatingPicker value={rating} onChange={setRating} /></div></div><div><label htmlFor="impression" className="text-sm font-medium">Ton impression</label><textarea id="impression" value={impression} onChange={(event) => setImpression(event.target.value)} placeholder="Ce qui t’est resté…" className="mt-2 min-h-24 w-full resize-y rounded-xl bg-muted p-4 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" /></div><div><p className="text-sm font-medium">Ce que tu as ressenti</p><div className="mt-2 flex flex-wrap gap-2">{emotions.map(([value, label]) => <button key={value} type="button" aria-pressed={selectedEmotions.includes(value)} onClick={() => setSelectedEmotions((current) => toggle(current, value))} className={`min-h-11 rounded-full px-3 text-sm font-medium ${selectedEmotions.includes(value) ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>{label}</button>)}</div></div><div><p className="text-sm font-medium">Ce que tu as aimé</p><div className="mt-2 flex flex-wrap gap-2">{aspects.map(([value, label]) => <button key={value} type="button" aria-pressed={selectedAspects.includes(value)} onClick={() => setSelectedAspects((current) => toggle(current, value))} className={`min-h-11 rounded-full px-3 text-sm font-medium ${selectedAspects.includes(value) ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>{label}</button>)}</div></div><div className="sticky -bottom-5 grid grid-cols-2 gap-3 bg-background pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-2"><button type="button" disabled={pending} onClick={() => void save(true)} className="min-h-12 rounded-full bg-muted px-4 text-sm font-semibold disabled:opacity-50">Plus tard</button><button type="button" disabled={pending} onClick={() => void save(false)} className="min-h-12 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">{pending ? "Enregistrement…" : "Enregistrer"}</button></div></div></DialogContent></Dialog>;
}
