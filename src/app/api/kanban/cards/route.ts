/**
 * GET /api/kanban/cards?boardId=xxx — Lista cards de um board
 * POST /api/kanban/cards — Cria novo card
 * PATCH /api/kanban/cards — Atualiza card (move, conclui, edita)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { kanbanCards, kanbanBoards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { sendPushToUser } from "@/lib/push";
import { canAccessBoard } from "@/lib/workspace";

/**
 * Converte uma data "YYYY-MM-DD" (vinda do <input type="date">) em meia-noite LOCAL,
 * não UTC. `new Date("2026-09-04")` é sempre meia-noite UTC pela spec do JS — num fuso
 * atrás de UTC (ex.: Brasil) isso volta pro dia anterior ao formatar com hora local em
 * qualquer lugar do app (calendário, cronograma, etc.), fazendo o prazo "errar o dia".
 */
function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

/** Confirma acesso ao board (membro do workspace + visibilidade de departamento) —
 * sem isso, qualquer usuário autenticado poderia criar/editar/excluir cards de boards
 * de outros workspaces, ou de boards restritos a um departamento do qual não participa. */
async function assertBoardAccess(userId: string, boardId: string) {
  const board = await db.query.kanbanBoards.findFirst({ where: eq(kanbanBoards.id, boardId) });
  if (!board) return false;
  return canAccessBoard(userId, board);
}

const createCardSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueDate: z.string().optional(),
  columnId: z.string(),
  boardId: z.string(),
  order: z.number().default(0),
  assignedToId: z.string().optional().nullable(),
});

const updateCardSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  status: z.enum(["todo", "in_progress", "done", "cancelled"]).optional(),
  columnId: z.string().optional(), // mover entre colunas
  order: z.number().optional(),
  dueDate: z.string().optional().nullable(),
  completionNotes: z.string().optional(),
  completedAt: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
});

/** Notifica o novo responsável por push, quando a atribuição muda para outra pessoa. */
async function notifyAssignee(cardId: string, cardTitle: string, boardId: string, assignedToId: string, actorId: string) {
  if (assignedToId === actorId) return; // não notifica quem atribuiu a si mesmo
  const board = await db.query.kanbanBoards.findFirst({ where: eq(kanbanBoards.id, boardId) });
  await sendPushToUser(assignedToId, {
    title: "Nova tarefa atribuída a você",
    body: cardTitle,
    url: board ? `/projetos?board=${board.id}&card=${cardId}` : "/projetos",
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createCardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { title, description, priority, dueDate, columnId, boardId, order, assignedToId } = parsed.data;

    if (!(await assertBoardAccess(session.user.id, boardId))) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const [card] = await db
      .insert(kanbanCards)
      .values({
        title,
        description,
        priority,
        dueDate: dueDate ? parseDateOnly(dueDate) : undefined,
        columnId,
        boardId,
        order,
        assignedToId: assignedToId ?? undefined,
        createdById: session.user.id,
      })
      .returning();

    if (assignedToId) {
      await notifyAssignee(card.id, card.title, boardId, assignedToId, session.user.id);
    }

    return NextResponse.json({ success: true, data: card }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/kanban/cards]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = updateCardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { id, ...updates } = parsed.data;

    const existing = await db.query.kanbanCards.findFirst({ where: eq(kanbanCards.id, id) });
    if (!existing) {
      return NextResponse.json({ error: "Card não encontrado" }, { status: 404 });
    }

    if (!(await assertBoardAccess(session.user.id, existing.boardId))) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // Se estiver movendo o card para outro board, confere acesso ao destino também
    if (updates.columnId) {
      const destColumn = await db.query.kanbanColumns.findFirst({ where: (c, { eq }) => eq(c.id, updates.columnId!) });
      if (!destColumn || !(await assertBoardAccess(session.user.id, destColumn.boardId))) {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
      }
    }

    // Prepara dados para update
    const updateData: Partial<typeof kanbanCards.$inferInsert> = {};

    if (updates.title) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.priority) updateData.priority = updates.priority;
    if (updates.status) updateData.status = updates.status;
    if (updates.columnId) updateData.columnId = updates.columnId;
    if (updates.order !== undefined) updateData.order = updates.order;
    if (updates.completionNotes) updateData.completionNotes = updates.completionNotes;
    if (updates.assignedToId !== undefined) updateData.assignedToId = updates.assignedToId;
    if (updates.dueDate !== undefined) updateData.dueDate = updates.dueDate ? parseDateOnly(updates.dueDate) : null;

    // Ao concluir o card
    if (updates.status === "done" && !updates.completedAt) {
      updateData.completedAt = new Date();
    }
    if (updates.completedAt) {
      updateData.completedAt = updates.completedAt ? new Date(updates.completedAt) : null;
    }

    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(kanbanCards)
      .set(updateData)
      .where(eq(kanbanCards.id, id))
      .returning();

    if (
      updates.assignedToId &&
      updates.assignedToId !== existing.assignedToId
    ) {
      await notifyAssignee(updated.id, updated.title, updated.boardId, updates.assignedToId, session.user.id);
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[PATCH /api/kanban/cards]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const cardId = req.nextUrl.searchParams.get("id");
    if (!cardId) {
      return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    }

    const existing = await db.query.kanbanCards.findFirst({ where: eq(kanbanCards.id, cardId) });
    if (!existing) {
      return NextResponse.json({ error: "Card não encontrado" }, { status: 404 });
    }
    if (!(await assertBoardAccess(session.user.id, existing.boardId))) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    await db.delete(kanbanCards).where(eq(kanbanCards.id, cardId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/kanban/cards]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
