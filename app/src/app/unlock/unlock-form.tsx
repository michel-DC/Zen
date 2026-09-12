"use client";

import { KeyRound } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

export default function UnlockForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true); setError(null);
    try {
      const response = await fetch("/api/auth/enroll", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
      const payload = await response.json() as { detail?: string };
      if (!response.ok) throw new Error(payload.detail || "Impossible d’activer cet appareil");
      const next = searchParams.get("next");
      router.replace(next?.startsWith("/") ? next : "/");
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Impossible d’activer cet appareil"); }
    finally { setPending(false); }
  };
  return <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-muted p-6"><div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"><KeyRound className="size-5" /></div><h1 className="mt-6 text-2xl font-bold tracking-[-0.04em]">Activer cet appareil</h1><p className="mt-2 text-sm leading-5 text-muted-foreground">Entre ton code personnel. Zen le mémorisera uniquement sur cet appareil.</p><label className="mt-6 block text-sm font-medium" htmlFor="activation-code">Code personnel</label><input id="activation-code" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="current-password" autoCapitalize="none" spellCheck={false} type="password" className="mt-2 h-12 w-full rounded-xl bg-background px-4 text-base outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring" required /><button disabled={pending} className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{pending ? "Activation…" : "Activer Zen"}</button>{error && <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}</form>;
}
