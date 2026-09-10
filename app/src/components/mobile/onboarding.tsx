"use client";

import { Library, Search, Smartphone, X } from "lucide-react";
import * as React from "react";

const steps = [
  { icon: Library, title: "Ta cinémathèque, simplement", text: "Range les films vus, ceux à regarder et ton top 3 au même endroit." },
  { icon: Search, title: "Trouve le bon film", text: "Recherche un titre ou pars d’un film que tu aimes pour en découvrir d’autres." },
  { icon: Smartphone, title: "Toujours à portée de main", text: "Installe Zen sur ton écran d’accueil. Ton dernier catalogue reste consultable hors ligne." },
];

export default function Onboarding() {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState(0);
  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (window.matchMedia("(max-width: 767px)").matches && !localStorage.getItem("zen:onboarding-complete")) setOpen(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const close = () => { localStorage.setItem("zen:onboarding-complete", "1"); setOpen(false); };
  if (!open) return null;
  const current = steps[step];
  const Icon = current.icon;
  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-black/25 p-3 backdrop-blur-[2px] md:hidden">
      <section role="dialog" aria-modal="true" aria-labelledby="onboarding-title" className="zen-sheet-in relative w-full rounded-[2rem] bg-background px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 shadow-2xl">
        <button onClick={close} aria-label="Passer l’introduction" className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full bg-muted"><X className="size-5" /></button>
        <div className="flex min-h-[18rem] flex-col pt-12">
          <div className="mb-8 flex size-16 items-center justify-center rounded-[1.35rem] bg-primary/10 text-primary"><Icon className="size-7" /></div>
          <h2 id="onboarding-title" className="max-w-xs text-[1.75rem] font-bold leading-[1.08] tracking-[-0.035em]">{current.title}</h2>
          <p className="mt-3 max-w-sm text-base leading-6 text-muted-foreground">{current.text}</p>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <div className="flex flex-1 gap-1.5" aria-label={`Étape ${step + 1} sur ${steps.length}`}>{steps.map((_, index) => <span key={index} className={`h-1.5 rounded-full transition-all ${index === step ? "w-7 bg-primary" : "w-1.5 bg-border"}`} />)}</div>
          <button onClick={() => step === steps.length - 1 ? close() : setStep((value) => value + 1)} className="min-h-12 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground active:scale-[0.98]">{step === steps.length - 1 ? "Commencer" : "Continuer"}</button>
        </div>
      </section>
    </div>
  );
}
