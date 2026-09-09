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
  const label = isLight ? "Modo escuro" : "Modo claro";

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setTheme(isLight ? "dark" : "light")}
        title={label}
        className="flex flex-col items-center justify-center gap-1 w-full min-w-0 py-2.5 rounded-xl text-center text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
      >
        {isLight ? <Moon className="w-[18px] h-[18px] shrink-0" /> : <Sun className="w-[18px] h-[18px] shrink-0" />}
        <span className="w-full text-[10px] font-medium leading-tight line-clamp-2 break-words px-0.5">{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(isLight ? "dark" : "light")}
      title={label}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-background transition-colors w-full"
    >
      {isLight ? <Moon className="w-4 h-4 shrink-0" /> : <Sun className="w-4 h-4 shrink-0" />}
      {label}
    </button>
  );
}
