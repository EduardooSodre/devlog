/**
 * Dados do relatório de trabalho (Excel/PDF, com ou sem resumo de IA) — cards do
 * Kanban onde o usuário é criador ou responsável, e documentações que ele
 * escreveu, dentro de um período e escopados ao workspace ativo.
 */

import { db } from "@/lib/db";
import { kanbanCards, kanbanBoards, docEntries } from "@/lib/db/schema";
import { and, eq, or, gte, lte, desc } from "drizzle-orm";

export type ReportCard = {
  id: string;
  title: string;
  boardName: string;
  priority: string;
  difficulty: string;
  status: string;
  completionNotes: string | null;
  completedAt: Date | null;
  dueDate: Date | null;
  updatedAt: Date;
};

export type ReportDoc = {
  id: string;
  title: string;
  type: string;
  summary: string | null;
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

  const ownCards = await db
    .select({
      id: kanbanCards.id,
      title: kanbanCards.title,
      boardName: kanbanBoards.name,
      priority: kanbanCards.priority,
      difficulty: kanbanCards.difficulty,
      status: kanbanCards.status,
      completionNotes: kanbanCards.completionNotes,
      completedAt: kanbanCards.completedAt,
      dueDate: kanbanCards.dueDate,
      updatedAt: kanbanCards.updatedAt,
    })
    .from(kanbanCards)
    .innerJoin(kanbanBoards, eq(kanbanCards.boardId, kanbanBoards.id))
    .where(
      and(
        eq(kanbanBoards.workspaceId, workspaceId),
        eq(kanbanCards.isArchived, false),
        or(eq(kanbanCards.createdById, userId), eq(kanbanCards.assignedToId, userId))
      )
    )
    .orderBy(desc(kanbanCards.updatedAt));

  const completedCards = ownCards.filter(
    (c) => c.status === "done" && c.completedAt && c.completedAt >= rangeStart && c.completedAt <= rangeEnd
  );
  const inProgressCards = ownCards.filter((c) => c.status === "in_progress" || c.status === "todo");

  const docs = await db
    .select({
      id: docEntries.id,
      title: docEntries.title,
      type: docEntries.type,
      summary: docEntries.summary,
      createdAt: docEntries.createdAt,
    })
    .from(docEntries)
    .where(
      and(
        eq(docEntries.workspaceId, workspaceId),
        eq(docEntries.authorId, userId),
        gte(docEntries.createdAt, rangeStart),
        lte(docEntries.createdAt, rangeEnd)
      )
    )
    .orderBy(desc(docEntries.createdAt));

  return {
    period: { start, end },
    stats: { completed: completedCards.length, inProgress: inProgressCards.length, docs: docs.length },
    completedCards,
    inProgressCards,
    docs,
  };
}
