import type { ReactNode } from "react";
export function PageHeading({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-6"><div className="space-y-1.5"><h1 className="text-2xl font-semibold tracking-tight">{title}</h1><p className="text-sm text-muted-foreground">{description}</p></div>{children}</div>;
}
