/**
 * Modelo único do relatório "pro gestor": a pré-visualização, o PDF e o Word desenham
 * a partir dele, então os três sempre mostram a mesma coisa — compacta, agrupada por
 * projeto, sem detalhe técnico (commits, hashes, linhas). O detalhe completo (descrição,
 * subtarefas) continua salvo em cada card e no relatório guardado; só não vai pro papel.
 * Sem imports de banco: usado no cliente e no servidor.
 */

import type { ReportPayload } from "@/components/reports/ReportPreview";
import { PRIORITY_LABELS, STATUS_LABELS, DOC_TYPE_LABELS, formatDateOnly } from "@/lib/report-labels";

export type SummaryBlock = { kind: "heading" | "bullet" | "text"; text: string };

/** Texto da IA → blocos. Formato esperado: "## Projeto" (título), "- item" (tópico), resto é texto. */
export function parseSummary(text: string): SummaryBlock[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l): SummaryBlock => {
      if (/^#{1,3}\s+/.test(l)) return { kind: "heading", text: l.replace(/^#{1,3}\s+/, "").replace(/\*\*/g, "") };
      if (/^[-•*]\s+/.test(l)) return { kind: "bullet", text: l.replace(/^[-•*]\s+/, "").replace(/\*\*/g, "") };
      return { kind: "text", text: l.replace(/\*\*/g, "") };
    });
}

export type ModelRow = { title: string; info: string; priority: string | null; urgent: boolean };
export type ModelGroup = { name: string; rows: ModelRow[] };
export type ModelSection = { title: string; groups: ModelGroup[] };

export type ReportModel = {
  title: string;
  subtitle: string;
  stats: { label: string; value: number }[];
  summary: SummaryBlock[];
  sections: ModelSection[];
};

function groupByBoard<T extends { boardName: string }>(items: T[], toRow: (i: T) => ModelRow): ModelGroup[] {
  const map = new Map<string, ModelRow[]>();
  for (const i of items) map.set(i.boardName, [...(map.get(i.boardName) ?? []), toRow(i)]);
  return [...map.entries()].map(([name, rows]) => ({ name, rows }));
}

export function buildReportModel({ data, meta, aiSummary }: ReportPayload): ReportModel {
  const priorityOf = (p: string) => ({ priority: p === "medium" || p === "low" ? null : PRIORITY_LABELS[p] ?? p, urgent: p === "urgent" });

  // Concluídas em ordem cronológica dentro de cada projeto.
  const done = [...data.completedCards].sort((a, b) => (a.completedAt ?? "").localeCompare(b.completedAt ?? ""));
  const sections: ModelSection[] = [];

  if (done.length)
    sections.push({
      title: "Entregas concluídas",
      groups: groupByBoard(done, (c) => ({ title: c.title, info: c.completedAt ? formatDateOnly(c.completedAt) : "—", ...priorityOf(c.priority) })),
    });

  if (data.inProgressCards.length)
    sections.push({
      title: "Em andamento",
      groups: groupByBoard(data.inProgressCards, (c) => ({
        title: c.title,
        info: c.dueDate ? `prazo ${formatDateOnly(c.dueDate)}` : STATUS_LABELS[c.status] ?? c.status,
        ...priorityOf(c.priority),
      })),
    });

  if (data.docs.length)
    sections.push({
      title: "Documentações",
      groups: [{ name: "Documentos escritos", rows: data.docs.map((d) => ({ title: d.title, info: `${DOC_TYPE_LABELS[d.type] ?? d.type} · ${formatDateOnly(d.createdAt)}`, priority: null, urgent: false })) }],
    });

  const stats = [{ label: "Concluídas", value: data.stats.completed }];
  if (data.stats.inProgress) stats.push({ label: "Em andamento", value: data.stats.inProgress });
  if (data.stats.docs) stats.push({ label: "Documentações", value: data.stats.docs });

  const p = data.period;
  return {
    title: "Relatório de Trabalho",
    subtitle: `${meta.userName ?? "Colaborador"} · ${formatDateOnly(p.start)}${p.start === p.end ? "" : ` a ${formatDateOnly(p.end)}`}`,
    stats,
    summary: aiSummary ? parseSummary(aiSummary) : [],
    sections,
  };
}
