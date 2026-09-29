/**
 * Dados do relatório de trabalho (Excel/PDF, com ou sem resumo de IA) — cards do
 * Kanban onde o usuário é criador, responsável ou responsável por alguma subtarefa
 * (incluindo arquivados — trabalho concluído e depois arquivado continua sendo
 * trabalho feito), e documentações que ele escreveu ou editou, dentro de um período e escopados ao workspace ativo.
 */

import { db } from "@/lib/db";
import { kanbanCards, kanbanBoards, docEntries, cardSubtasks } from "@/lib/db/schema";
import { and, eq, or, gte, lte, desc, inArray } from "drizzle-orm";
import { htmlToText } from "@/lib/report-labels";

export type ReportCard = {
  id: string;
  title: string;
  boardName: string;
  priority: string;
  difficulty: string;
  status: string;
  description: string;
  completionNotes: string | null;
  startDate: Date | null;
  completedAt: Date | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  subtasks: { title: string; isDone: boolean }[];
};

export type ReportDoc = {
  id: string;
  title: string;
  type: string;
  summary: string | null;
  content: string;
  createdAt: Date;
};

export type ReportData = {
  period: { start: string; end: string };
  stats: { completed: number; inProgress: number; docs: number };
  completedCards: ReportCard[];
  inProgressCards: ReportCard[];
  docs: ReportDoc[];
};

/** `start`/`end` no formato "YYYY-MM-DD" (limites inclusivos do dia, fuso Brasília —
 * a conversão pra Date já assume meia-noite de Brasília, mesmo padrão usado nos
 * prazos de card em src/app/api/kanban/cards/route.ts). */
function dayBoundsInBrasilia(dateStr: string, endOfDay: boolean): Date {
  return new Date(`${dateStr}T${endOfDay ? "23:59:59.999" : "00:00:00"}-03:00`);
}

export async function getReportData({
  userId,
  workspaceId,
  start,
  end,
}: {
  userId: string;
  workspaceId: string;
  start: string;
  end: string;
}): Promise<ReportData> {
  const rangeStart = dayBoundsInBrasilia(start, false);
  const rangeEnd = dayBoundsInBrasilia(end, true);

  const rows = await db
    .select({
      id: kanbanCards.id,
      title: kanbanCards.title,
      boardName: kanbanBoards.name,
      priority: kanbanCards.priority,
      difficulty: kanbanCards.difficulty,
      status: kanbanCards.status,
      description: kanbanCards.description,
      completionNotes: kanbanCards.completionNotes,
      startDate: kanbanCards.startDate,
      completedAt: kanbanCards.completedAt,
      dueDate: kanbanCards.dueDate,
      createdAt: kanbanCards.createdAt,
      updatedAt: kanbanCards.updatedAt,
      isArchived: kanbanCards.isArchived,
    })
    .from(kanbanCards)
    .innerJoin(kanbanBoards, eq(kanbanCards.boardId, kanbanBoards.id))
    .where(
      and(
        eq(kanbanBoards.workspaceId, workspaceId),
        or(
          eq(kanbanCards.createdById, userId),
          eq(kanbanCards.assignedToId, userId),
          inArray(kanbanCards.id, db.select({ id: cardSubtasks.cardId }).from(cardSubtasks).where(eq(cardSubtasks.assignedToId, userId)))
        )
      )
    )
    .orderBy(desc(kanbanCards.updatedAt));

  const subs = rows.length
    ? await db
        .select({ cardId: cardSubtasks.cardId, title: cardSubtasks.title, isDone: cardSubtasks.isDone })
        .from(cardSubtasks)
        .where(inArray(cardSubtasks.cardId, rows.map((r) => r.id)))
        .orderBy(cardSubtasks.order)
    : [];
  const subsByCard = new Map<string, { title: string; isDone: boolean }[]>();
  for (const st of subs) subsByCard.set(st.cardId, [...(subsByCard.get(st.cardId) ?? []), { title: st.title, isDone: st.isDone }]);

  const ownCards = rows.map(({ isArchived, ...c }) => ({
    card: { ...c, description: htmlToText(c.description), subtasks: subsByCard.get(c.id) ?? [] },
    isArchived,
  }));

  const completedCards = ownCards
    .map((o) => o.card)
    .filter((c) => c.status === "done" && c.completedAt && c.completedAt >= rangeStart && c.completedAt <= rangeEnd);
  const inProgressCards = ownCards
    .filter((o) => !o.isArchived && (o.card.status === "in_progress" || o.card.status === "todo"))
    .map((o) => o.card);

  const docs = await db
    .select({
      id: docEntries.id,
      title: docEntries.title,
      type: docEntries.type,
      summary: docEntries.summary,
      content: docEntries.content,
      createdAt: docEntries.createdAt,
    })
    .from(docEntries)
    .where(
      and(
        eq(docEntries.workspaceId, workspaceId),
        eq(docEntries.authorId, userId),
        or(
          and(gte(docEntries.createdAt, rangeStart), lte(docEntries.createdAt, rangeEnd)),
          and(gte(docEntries.updatedAt, rangeStart), lte(docEntries.updatedAt, rangeEnd))
        )
      )
    )
    .orderBy(desc(docEntries.createdAt));

  return {
    period: { start, end },
    stats: { completed: completedCards.length, inProgress: inProgressCards.length, docs: docs.length },
    completedCards,
    inProgressCards,
    docs: docs.map((d) => ({ ...d, content: htmlToText(d.content) })),
  };
}
