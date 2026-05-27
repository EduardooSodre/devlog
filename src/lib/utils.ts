import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

// ── Tailwind class merging ──
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Date formatting ──
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isToday(d)) return "Hoje";
  if (isYesterday(d)) return "Ontem";
  return format(d, "dd MMM yyyy", { locale: ptBR });
}

export function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

// ── String utils ──
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "…";
}

export function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// ── File utils ──
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Color utils para prioridade do card ──
export const priorityConfig = {
  low: {
    label: "Baixa",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/30",
    dot: "bg-emerald-400",
  },
  medium: {
    label: "Média",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
    dot: "bg-amber-400",
  },
  high: {
    label: "Alta",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/30",
    dot: "bg-orange-400",
  },
  urgent: {
    label: "Urgente",
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/30",
    dot: "bg-red-400",
  },
} as const;

export const docTypeConfig = {
  refactoring: {
    label: "Refatoração",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/30",
    icon: "🔧",
  },
  feature: {
    label: "Feature",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/30",
    icon: "✨",
  },
  bugfix: {
    label: "Bugfix",
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/30",
    icon: "🐛",
  },
  adjustment: {
    label: "Ajuste",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/30",
    icon: "⚙️",
  },
  note: {
    label: "Nota",
    color: "text-slate-400",
    bg: "bg-slate-400/10",
    border: "border-slate-400/30",
    icon: "📝",
  },
  meeting: {
    label: "Reunião",
    color: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/30",
    icon: "💬",
  },
} as const;
