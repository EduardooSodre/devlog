"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Kanban, FileText, Settings, CreditCard, Plus, Building2, Search,
} from "lucide-react";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import type { WorkspaceOption } from "@/components/layout/WorkspaceSwitcher";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projetos", href: "/projetos", icon: Kanban },
  { label: "Documentação", href: "/docs", icon: FileText },
  { label: "Configurações", href: "/settings", icon: Settings },
  { label: "Plano & Billing", href: "/settings/billing", icon: CreditCard },
];

interface Props {
  workspaces: WorkspaceOption[];
  activeWorkspaceId: string;
  /** Esconde o botão de gatilho visível (ex.: sidebar recolhida) — o atalho ⌘K continua ativo. */
  hideTrigger?: boolean;
}

export function CommandPalette({ workspaces, activeWorkspaceId, hideTrigger }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  async function switchWorkspace(id: string) {
    setOpen(false);
    await fetch("/api/workspaces/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: id }),
    });
    router.refresh();
  }

  if (!open) {
    if (hideTrigger) return null;
    return (
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground bg-card border border-border rounded-lg px-3 py-1.5 transition-colors"
      >
        <Search className="w-3.5 h-3.5" />
        Buscar…
        <kbd className="ml-4 text-[10px] font-mono bg-background border border-border rounded px-1.5 py-0.5">⌘K</kbd>
      </button>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] animate-fade-in" onClick={() => setOpen(false)} />
      <div className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-lg z-[70] animate-slide-up">
        <Command shouldFilter className="border border-border shadow-2xl">
          <CommandInput autoFocus placeholder="Ir para… ou trocar de workspace" />
          <CommandList>
            <CommandEmpty>Nada encontrado.</CommandEmpty>
            <CommandGroup heading="Navegação">
              {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
                <CommandItem key={href} value={label} onSelect={() => go(href)}>
                  <Icon />
                  {label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Ações rápidas">
              <CommandItem value="Nova documentação" onSelect={() => go("/docs/new")}>
                <Plus />
                Nova documentação
              </CommandItem>
            </CommandGroup>
            {workspaces.length > 1 && (
              <CommandGroup heading="Workspaces">
                {workspaces.map((w) => (
                  <CommandItem key={w.id} value={w.name} onSelect={() => switchWorkspace(w.id)}>
                    <Building2 className={w.id === activeWorkspaceId ? "!text-primary" : undefined} />
                    {w.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </div>
    </>
  );
}
