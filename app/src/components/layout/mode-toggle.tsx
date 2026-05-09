"use client";

import { useLoadingLine } from "@/components/layout/loading-line-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, Computer, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { BsFillMoonStarsFill } from "react-icons/bs";

export function ModeToggle() {
  const { setTheme, theme } = useTheme();
  const { runAfterLoading } = useLoadingLine();

  const handleThemeChange = async (nextTheme: "light" | "dark" | "system") => {
    if (theme === nextTheme) {
      return;
    }

    await runAfterLoading(() => {
      setTheme(nextTheme);
    }, 650);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          <Sun className="absolute h-4 w-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <BsFillMoonStarsFill className="h-4 w-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem
          onClick={() => handleThemeChange("light")}
          className="py-1.5"
        >
          <div className="flex w-full items-center">
            <Sun className="mr-2 h-4 w-4 shrink-0" />

            <span className="flex-1">Light</span>

            {theme === "light" && <Check className="h-4 w-4 shrink-0" />}
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleThemeChange("dark")}
          className="py-1.5"
        >
          <div className="flex w-full items-center">
            <BsFillMoonStarsFill className="mr-2 h-4 w-4 shrink-0" />

            <span className="flex-1">Dark</span>

            {theme === "dark" && <Check className="h-4 w-4 shrink-0" />}
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleThemeChange("system")}
          className="py-1.5"
        >
          <div className="flex w-full items-center">
            <Computer className="mr-2 h-4 w-4 shrink-0" />

            <span className="flex-1">System</span>

            {theme === "system" && <Check className="h-4 w-4 shrink-0" />}
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
