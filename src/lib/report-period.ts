/**
 * Cálculo do intervalo de datas (YYYY-MM-DD) pros presets do seletor de período do
 * relatório. Extraído do componente pra dar pra testar sem precisar montar UI.
 */

import { addDaysToDateStr } from "@/lib/date-brasilia";

export type PeriodKind = "today" | "week" | "month" | "custom";

export const PERIOD_OPTIONS: { id: PeriodKind; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Últimos 7 dias" },
  { id: "month", label: "Este mês" },
  { id: "custom", label: "Personalizado" },
];

export function monthStart(dateStr: string): string {
  return `${dateStr.slice(0, 7)}-01`;
}

export function rangeFor(
  kind: PeriodKind,
  today: string,
  customStart: string,
  customEnd: string
): { start: string; end: string } {
  if (kind === "today") return { start: today, end: today };
  if (kind === "week") return { start: addDaysToDateStr(today, -6), end: today };
  if (kind === "month") return { start: monthStart(today), end: today };
  return { start: customStart, end: customEnd };
}
