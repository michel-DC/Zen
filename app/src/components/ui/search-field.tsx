import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export function SearchField({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <div className="w-full min-w-0 flex-1 space-y-2"><Label htmlFor={id}>{label}</Label><div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id={id} type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder || "Titre ou réalisateur…"} className="pl-9" /></div></div>;
}
