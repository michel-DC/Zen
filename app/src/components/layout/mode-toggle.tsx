"use client";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" className="size-11 md:size-8" aria-label="Changer le thème"><Sun className="dark:hidden" /><Moon className="hidden dark:block" /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-44"><DropdownMenuLabel>Apparence</DropdownMenuLabel><DropdownMenuSeparator />
      <DropdownMenuRadioGroup value={mounted ? theme : "system"} onValueChange={setTheme}>
        <DropdownMenuRadioItem value="light"><Sun />Clair</DropdownMenuRadioItem><DropdownMenuRadioItem value="dark"><Moon />Sombre</DropdownMenuRadioItem><DropdownMenuRadioItem value="system"><Monitor />Système</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>;
}
