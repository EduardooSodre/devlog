/**
 * Datas sempre em "YYYY-MM-DD" no fuso de Brasília, nunca no fuso local do processo —
 * servidor em produção costuma rodar em UTC, e isso bagunçaria qualquer comparação de
 * prazo ("vence hoje/amanhã") perto da virada do dia.
 */

export function dateOnlyInBrasilia(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(date);
}

export function todayInBrasilia(): string {
  return dateOnlyInBrasilia(new Date());
}

export function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
