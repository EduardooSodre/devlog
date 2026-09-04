"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  collapsed?: boolean;
}

export function ThemeToggle({ collapsed }: Props) {
  const { theme, setTheme } = useTheme();
  // Evita mismatch de hidratação — o tema real só é conhecido no cliente.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className={cn("h-9", collapsed ? "w-9" : "w-full")} />;
  }

  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={() => setTheme(isLight ? "dark" : "light")}
      title={isLight ? "Modo escuro" : "Modo claro"}
      className={cn(
        "flex items-center gap-2.5 px-2 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-card transition-colors",
        collapsed && "justify-center px-0"
      )}
    >
      {isLight ? <Moon className="w-4 h-4 shrink-0" /> : <Sun className="w-4 h-4 shrink-0" />}
      {!collapsed && (isLight ? "Modo escuro" : "Modo claro")}
    </button>
  );
}
