"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Building2, Plus, Loader2, Globe, Lock, LogIn } from "lucide-react";
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
  const [joinable, setJoinable] = useState<{ id: string; name: string }[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0];

  function toggle() {
    const next = !open;
    setOpen(next);
    setCreating(false);
    if (next) {
      fetch("/api/workspaces/public")
        .then((r) => (r.ok ? r.json() : { workspaces: [] }))
        .then((d) => setJoinable(d.workspaces ?? []))
        .catch(() => setJoinable([]));
    }
  }

  async function post(url: string, body: object, key: string) {
    setBusy(key);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Não foi possível concluir");
      return data;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível concluir");
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function select(id: string) {
    if (await post("/api/workspaces/active", { workspaceId: id }, id)) {
      setOpen(false);
      router.refresh();
    }
  }

  async function join(id: string) {
    if (!(await post("/api/workspaces/public", { workspaceId: id }, id))) return;
    toast.success("Você entrou no workspace!");
    await select(id);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (!(await post("/api/workspaces", { name: name.trim(), isPublic }, "create"))) return;
    toast.success("Workspace criado!");
    setName("");
    setIsPublic(false);
    setOpen(false);
    router.refresh(); // continua na mesma página, já no workspace novo
  }

  if (!active) return null;

  return (
    <div className={cn("relative px-2 py-2 border-b border-border", collapsed && "px-0 flex justify-center")}>
      <button
        type="button"
        onClick={toggle}
        title={active.name}
        aria-expanded={open}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:bg-card transition-colors",
          collapsed && "w-10 justify-center px-0"
        )}
      >
        <Building2 className="w-4 h-4 text-primary shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left truncate font-medium">{active.name}</span>
            <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
          </>
        )}
      </button>

      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-label="Fechar" />
          <div
            className={cn(
              "absolute top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-xl py-1 max-h-[70vh] overflow-y-auto",
              collapsed ? "left-full ml-2 top-0 mt-0 w-64" : "left-2 right-2"
            )}
          >
            <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Seus workspaces</p>
            {workspaces.map((w) => (
              <button
                key={w.id}
                type="button"
                disabled={!!busy}
                onClick={() => (w.id === activeId ? setOpen(false) : select(w.id))}
                className={cn(
                  "w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-primary/10 transition-colors disabled:opacity-60",
                  w.id === activeId && "text-primary font-medium"
                )}
              >
                <span className="flex-1 truncate">{w.name}</span>
                {busy === w.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              </button>
            ))}

            {joinable.length > 0 && (
              <>
                <p className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground border-t border-border mt-1">
                  Da sua empresa
                </p>
                {joinable.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    disabled={!!busy}
                    onClick={() => join(w.id)}
                    className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-primary/10 transition-colors disabled:opacity-60"
                  >
                    <span className="flex-1 truncate">{w.name}</span>
                    {busy === w.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-primary">
                        <LogIn className="w-3 h-3" /> Entrar
                      </span>
                    )}
                  </button>
                ))}
              </>
            )}

            <div className="border-t border-border mt-1 pt-1">
              {!creating ? (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Novo workspace
                </button>
              ) : (
                <form onSubmit={create} className="p-3 space-y-3">
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                    placeholder="Nome do workspace"
                    aria-label="Nome do workspace"
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 text-sm focus:outline-none focus:border-primary"
                  />
                  <VisibilityPicker value={isPublic} onChange={setIsPublic} />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCreating(false)}
                      className="flex-1 h-8 text-xs rounded-lg border border-border hover:bg-background"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={!name.trim() || busy === "create"}
                      className="flex-1 h-8 text-xs rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {busy === "create" && <Loader2 className="w-3 h-3 animate-spin" />}
                      Criar
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Público/privado — usado aqui e nas configurações do workspace. */
export function VisibilityPicker({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const options = [
    { v: false, icon: Lock, label: "Privado", hint: "Só entra quem for convidado" },
    { v: true, icon: Globe, label: "Público", hint: "Colegas com o e-mail da empresa entram sozinhos" },
  ];
  return (
    <div role="radiogroup" aria-label="Visibilidade" className="grid grid-cols-2 gap-2">
      {options.map(({ v, icon: Icon, label, hint }) => (
        <button
          key={label}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          title={hint}
          className={cn(
            "flex flex-col items-start gap-1 rounded-lg border p-2 text-left transition-colors",
            value === v ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
          )}
        >
          <span className="flex items-center gap-1.5 text-xs font-medium">
            <Icon className="w-3.5 h-3.5" /> {label}
          </span>
          <span className="text-[10px] leading-tight text-muted-foreground">{hint}</span>
        </button>
      ))}
    </div>
  );
}
