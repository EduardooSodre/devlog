"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkspaceOption = {
  id: string;
  name: string;
  plan: string;
};

interface WorkspaceSwitcherProps {
  workspaces: WorkspaceOption[];
  activeId: string;
  collapsed?: boolean;
}

export function WorkspaceSwitcher({ workspaces, activeId, collapsed }: WorkspaceSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0];

  if (workspaces.length <= 1) {
    if (!active || collapsed) return null;
    return (
      <div className={cn("px-3 py-2 border-b border-border", collapsed && "hidden")}>
        <p className="text-xs text-muted-foreground truncate">{active.name}</p>
      </div>
    );
  }

  async function select(id: string) {
    await fetch("/api/workspaces/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: id }),
    });
    setOpen(false);
    router.refresh();
  }

  return (
    <div className={cn("relative px-2 py-2 border-b border-border", collapsed && "px-0 flex justify-center")}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title={active?.name}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:bg-card transition-colors",
          collapsed && "w-10 justify-center px-0"
        )}
      >
        <Building2 className="w-4 h-4 text-primary shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left truncate font-medium">{active?.name}</span>
            <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
          </>
        )}
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-label="Fechar" />
          <div className="absolute left-2 right-2 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-xl py-1 max-h-48 overflow-y-auto">
            {workspaces.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => select(w.id)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-primary/10 transition-colors",
                  w.id === activeId && "text-primary font-medium"
                )}
              >
                {w.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
