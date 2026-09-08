import { Search } from "lucide-react";
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export function SearchField({ id, label, value, onChange, placeholder, compact = false }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder?: string; compact?: boolean }) {
  return <div className="w-full min-w-0 flex-1 space-y-2"><Label htmlFor={id} className={compact ? "sr-only" : undefined}>{label}</Label><ButtonGroup className="w-full"><ButtonGroupText aria-hidden="true" className="bg-background px-3"><Search /></ButtonGroupText><Input id={id} type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder || "Titre ou réalisateur…"} className="min-w-0 flex-1" style={{ width: 0 }} /></ButtonGroup></div>;
}
