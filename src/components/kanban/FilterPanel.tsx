"use client";

import { useMemo, useState } from "react";
import { Filter as FilterIcon, X, Plus, ChevronDown } from "lucide-react";
import { addDays, endOfWeek, isWithinInterval, startOfWeek } from "date-fns";
import { cn, priorityConfig, difficultyConfig } from "@/lib/utils";
import type { CardDifficulty, CardPriority, KanbanCardWithDetails } from "@/types";

export interface CardFilters {
  quick: "" | "incomplete" | "done" | "dueThisWeek" | "dueNextWeek";
  priorities: CardPriority[];
  difficulties: CardDifficulty[];
  assigneeIds: string[];
  creatorIds: string[];
  createdAfter: string;
  createdBefore: string;
  updatedAfter: string;
  updatedBefore: string;
  completedAfter: string;
  completedBefore: string;
}

export const EMPTY_FILTERS: CardFilters = {
  quick: "",
  priorities: [],
  difficulties: [],
  assigneeIds: [],
  creatorIds: [],
  createdAfter: "",
  createdBefore: "",
  updatedAfter: "",
  updatedBefore: "",
  completedAfter: "",
  completedBefore: "",
};

export function isFiltersActive(f: CardFilters) {
  return (
    !!f.quick ||
    f.priorities.length > 0 ||
    f.difficulties.length > 0 ||
    f.assigneeIds.length > 0 ||
    f.creatorIds.length > 0 ||
    !!f.createdAfter || !!f.createdBefore ||
    !!f.updatedAfter || !!f.updatedBefore ||
    !!f.completedAfter || !!f.completedBefore
  );
}

export function applyCardFilters(card: KanbanCardWithDetails, f: CardFilters): boolean {
  if (f.quick === "incomplete" && card.status === "done") return false;
  if (f.quick === "done" && card.status !== "done") return false;
  if (f.quick === "dueThisWeek" || f.quick === "dueNextWeek") {
    if (!card.dueDate) return false;
    const now = new Date();
    const base = f.quick === "dueThisWeek" ? now : addDays(now, 7);
    const interval = { start: startOfWeek(base, { weekStartsOn: 1 }), end: endOfWeek(base, { weekStartsOn: 1 }) };
    if (!isWithinInterval(new Date(card.dueDate), interval)) return false;
  }
  if (f.priorities.length > 0 && !f.priorities.includes(card.priority)) return false;
  if (f.difficulties.length > 0 && !f.difficulties.includes(card.difficulty)) return false;
  if (f.assigneeIds.length > 0 && !(card.assignedToId && f.assigneeIds.includes(card.assignedToId))) return false;
  if (f.creatorIds.length > 0 && !f.creatorIds.includes(card.createdById)) return false;
  if (f.createdAfter && new Date(card.createdAt) < new Date(f.createdAfter)) return false;
  if (f.createdBefore && new Date(card.createdAt) > new Date(f.createdBefore + "T23:59:59")) return false;
  if (f.updatedAfter && new Date(card.updatedAt) < new Date(f.updatedAfter)) return false;
  if (f.updatedBefore && new Date(card.updatedAt) > new Date(f.updatedBefore + "T23:59:59")) return false;
  if (f.completedAfter && (!card.completedAt || new Date(card.completedAt) < new Date(f.completedAfter))) return false;
  if (f.completedBefore && (!card.completedAt || new Date(card.completedAt) > new Date(f.completedBefore + "T23:59:59"))) return false;
  return true;
}

const PRIORITIES: CardPriority[] = ["low", "medium", "high", "urgent"];
const DIFFICULTIES: CardDifficulty[] = ["easy", "medium", "hard", "very_hard"];
type ExtraFilter = "priority" | "difficulty" | "assignee" | "creator" | "createdAt" | "updatedAt" | "completedAt";
const EXTRA_FILTER_LABELS: Record<ExtraFilter, string> = {
  priority: "Prioridade",
  difficulty: "Dificuldade",
  assignee: "Responsável",
  creator: "Criador",
  createdAt: "Data de criação",
  updatedAt: "Data de modificação",
  completedAt: "Data de finalização",
};

interface Person { id: string; name: string | null; image: string | null }

interface Props {
  filters: CardFilters;
  onChange: (f: CardFilters) => void;
  people: Person[]; // opções pra Responsável/Criador, deduplicadas pelo caller
}

export function FilterPanel({ filters, onChange, people }: Props) {
  const [open, setOpen] = useState(false);
  const [activeExtras, setActiveExtras] = useState<ExtraFilter[]>(() => {
    const active: ExtraFilter[] = [];
    if (filters.priorities.length) active.push("priority");
    if (filters.difficulties.length) active.push("difficulty");
    if (filters.assigneeIds.length) active.push("assignee");
    if (filters.creatorIds.length) active.push("creator");
    if (filters.createdAfter || filters.createdBefore) active.push("createdAt");
    if (filters.updatedAfter || filters.updatedBefore) active.push("updatedAt");
    if (filters.completedAfter || filters.completedBefore) active.push("completedAt");
    return active;
  });
  const [showAddMenu, setShowAddMenu] = useState(false);

  const availableToAdd = useMemo(
    () => (Object.keys(EXTRA_FILTER_LABELS) as ExtraFilter[]).filter((k) => !activeExtras.includes(k)),
    [activeExtras]
  );

  function patch(p: Partial<CardFilters>) {
    onChange({ ...filters, ...p });
  }

  function toggleArrayValue<K extends "priorities" | "difficulties" | "assigneeIds" | "creatorIds">(key: K, value: string) {
    const arr = filters[key] as string[];
    patch({ [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] } as Partial<CardFilters>);
  }

  function removeExtra(extra: ExtraFilter) {
    setActiveExtras((prev) => prev.filter((e) => e !== extra));
    if (extra === "priority") patch({ priorities: [] });
    if (extra === "difficulty") patch({ difficulties: [] });
    if (extra === "assignee") patch({ assigneeIds: [] });
    if (extra === "creator") patch({ creatorIds: [] });
    if (extra === "createdAt") patch({ createdAfter: "", createdBefore: "" });
    if (extra === "updatedAt") patch({ updatedAfter: "", updatedBefore: "" });
    if (extra === "completedAt") patch({ completedAfter: "", completedBefore: "" });
  }

  function clearAll() {
    onChange(EMPTY_FILTERS);
    setActiveExtras([]);
  }

  const active = isFiltersActive(filters);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors",
          active ? "bg-primary/10 border-primary/40 text-primary font-medium" : "border-border text-muted-foreground hover:border-primary/30"
        )}
      >
        <FilterIcon className="w-3.5 h-3.5" />
        Filtrar
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 w-80 bg-card border border-border rounded-2xl shadow-xl z-50 p-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Filtros</p>
              {active && (
                <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Apagar
                </button>
              )}
            </div>

            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Filtros rápidos</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {([
                ["incomplete", "Tarefas por concluir"],
                ["done", "Tarefas concluídas"],
                ["dueThisWeek", "Previsto para esta semana"],
                ["dueNextWeek", "Previsto para a próxima semana"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => patch({ quick: filters.quick === value ? "" : value })}
                  className={cn(
                    "text-xs px-2.5 py-1.5 rounded-full border transition-colors",
                    filters.quick === value
                      ? "bg-primary/10 border-primary/40 text-primary font-medium"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {activeExtras.includes("priority") && (
                <FilterRow label="Prioridade" onRemove={() => removeExtra("priority")}>
                  <div className="flex flex-wrap gap-1.5">
                    {PRIORITIES.map((p) => (
                      <button
                        key={p}
                        onClick={() => toggleArrayValue("priorities", p)}
                        className={cn(
                          "flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-colors",
                          filters.priorities.includes(p)
                            ? `${priorityConfig[p].bg} ${priorityConfig[p].color} ${priorityConfig[p].border}`
                            : "border-border text-muted-foreground hover:border-primary/30"
                        )}
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full", priorityConfig[p].dot)} />
                        {priorityConfig[p].label}
                      </button>
                    ))}
                  </div>
                </FilterRow>
              )}

              {activeExtras.includes("difficulty") && (
                <FilterRow label="Dificuldade" onRemove={() => removeExtra("difficulty")}>
                  <div className="flex flex-wrap gap-1.5">
                    {DIFFICULTIES.map((d) => (
                      <button
                        key={d}
                        onClick={() => toggleArrayValue("difficulties", d)}
                        className={cn(
                          "flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-colors",
                          filters.difficulties.includes(d)
                            ? `${difficultyConfig[d].bg} ${difficultyConfig[d].color} ${difficultyConfig[d].border}`
                            : "border-border text-muted-foreground hover:border-primary/30"
                        )}
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full", difficultyConfig[d].dot)} />
                        {difficultyConfig[d].label}
                      </button>
                    ))}
                  </div>
                </FilterRow>
              )}

              {activeExtras.includes("assignee") && (
                <FilterRow label="Responsável" onRemove={() => removeExtra("assignee")}>
                  <PeoplePicker people={people} selected={filters.assigneeIds} onToggle={(id) => toggleArrayValue("assigneeIds", id)} />
                </FilterRow>
              )}

              {activeExtras.includes("creator") && (
                <FilterRow label="Criador" onRemove={() => removeExtra("creator")}>
                  <PeoplePicker people={people} selected={filters.creatorIds} onToggle={(id) => toggleArrayValue("creatorIds", id)} />
                </FilterRow>
              )}

              {activeExtras.includes("createdAt") && (
                <FilterRow label="Data de criação" onRemove={() => removeExtra("createdAt")}>
                  <DateRange after={filters.createdAfter} before={filters.createdBefore} onChange={(after, before) => patch({ createdAfter: after, createdBefore: before })} />
                </FilterRow>
              )}

              {activeExtras.includes("updatedAt") && (
                <FilterRow label="Data de modificação" onRemove={() => removeExtra("updatedAt")}>
                  <DateRange after={filters.updatedAfter} before={filters.updatedBefore} onChange={(after, before) => patch({ updatedAfter: after, updatedBefore: before })} />
                </FilterRow>
              )}

              {activeExtras.includes("completedAt") && (
                <FilterRow label="Data de finalização" onRemove={() => removeExtra("completedAt")}>
                  <DateRange after={filters.completedAfter} before={filters.completedBefore} onChange={(after, before) => patch({ completedAfter: after, completedBefore: before })} />
                </FilterRow>
              )}
            </div>

            {availableToAdd.length > 0 && (
              <div className="relative mt-3">
                <button
                  onClick={() => setShowAddMenu((v) => !v)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="w-4 h-4" /> Adicionar filtro <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {showAddMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)} />
                    <div className="absolute left-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-xl z-50 py-1">
                      {availableToAdd.map((extra) => (
                        <button
                          key={extra}
                          onClick={() => {
                            setActiveExtras((prev) => [...prev, extra]);
                            setShowAddMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10 transition-colors"
                        >
                          {EXTRA_FILTER_LABELS[extra]}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function FilterRow({ label, onRemove, children }: { label: string; onRemove: () => void; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <button onClick={onRemove} className="text-muted-foreground hover:text-red-400 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {children}
    </div>
  );
}

function PeoplePicker({ people, selected, onToggle }: { people: Person[]; selected: string[]; onToggle: (id: string) => void }) {
  if (people.length === 0) {
    return <p className="text-xs text-muted-foreground">Ninguém disponível ainda.</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {people.map((p) => (
        <button
          key={p.id}
          onClick={() => onToggle(p.id)}
          className={cn(
            "text-xs px-2.5 py-1 rounded-full border transition-colors",
            selected.includes(p.id) ? "bg-primary/10 border-primary/40 text-primary font-medium" : "border-border text-muted-foreground hover:border-primary/30"
          )}
        >
          {p.name ?? "Sem nome"}
        </button>
      ))}
    </div>
  );
}

function DateRange({ after, before, onChange }: { after: string; before: string; onChange: (after: string, before: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={after}
        onChange={(e) => onChange(e.target.value, before)}
        className="flex-1 h-8 bg-background border border-border rounded-lg px-2 text-xs focus:outline-none focus:border-primary transition-colors"
      />
      <span className="text-xs text-muted-foreground">até</span>
      <input
        type="date"
        value={before}
        onChange={(e) => onChange(after, e.target.value)}
        className="flex-1 h-8 bg-background border border-border rounded-lg px-2 text-xs focus:outline-none focus:border-primary transition-colors"
      />
    </div>
  );
}
