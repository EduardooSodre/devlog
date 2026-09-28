/**
 * Rótulos em português usados tanto no preview (client) quanto na exportação
 * Excel (server) do relatório — sem nada de banco aqui, pra poder ser importado
 * dos dois lados sem puxar o driver do Neon pro bundle do cliente.
 */

export const PRIORITY_LABELS: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

export const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Fácil",
  medium: "Média",
  hard: "Difícil",
  very_hard: "Muito difícil",
};

export const STATUS_LABELS: Record<string, string> = {
  todo: "A fazer",
  in_progress: "Em progresso",
  done: "Concluído",
  cancelled: "Cancelado",
};

export const DOC_TYPE_LABELS: Record<string, string> = {
  refactoring: "Refatoração",
  feature: "Feature",
  bugfix: "Bugfix",
  adjustment: "Ajuste",
  note: "Nota",
  meeting: "Reunião",
};

export function formatDateOnly(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}
