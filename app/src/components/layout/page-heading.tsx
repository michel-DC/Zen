import type { ReactNode } from "react";
export function PageHeading({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5"><div className="space-y-1"><h1 className="text-2xl font-semibold tracking-tight">{title}</h1>{description ? <p className="text-sm text-muted-foreground">{description}</p> : null}</div>{children}</div>;
}
