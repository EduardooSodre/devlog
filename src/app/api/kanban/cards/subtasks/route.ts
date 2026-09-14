/**
 * POST /api/kanban/cards/subtasks — Cria subtarefa
 * PATCH /api/kanban/cards/subtasks — Atualiza (título/concluída/responsável/prazo)
 * DELETE /api/kanban/cards/subtasks?id=xxx — Remove subtarefa
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cardSubtasks, kanbanCards, kanbanBoards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { canAccessBoard } from "@/lib/workspace";
import { sendPushToUser } from "@/lib/push";

/** Mesmo padrão de checagem de acesso usado em comments/attachments — sem isso,
 * qualquer usuário autenticado poderia ler/escrever subtarefas de cards de outros
 * workspaces, ou de boards restritos a um departamento do qual não participa. */
async function assertCardAccess(userId: string, cardId: string) {
  const card = await db.query.kanbanCards.findFirst({ where: eq(kanbanCards.id, cardId) });
  if (!card) return null;

  const board = await db.query.kanbanBoards.findFirst({ where: eq(kanbanBoards.id, card.boardId) });
  if (!board) return null;

  return (await canAccessBoard(userId, board)) ? { card, board } : null;
}

/** Mesmo motivo do `parseDateOnly` em cards/route.ts — fixa Brasília em vez da hora
 * local do processo, que em produção costuma ser UTC. */
function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00-03:00`);
}

async function notifySubtaskAssignee(cardTitle: string, subtaskTitle: string, boardId: string, assignedToId: string, actorId: string) {
  if (assignedToId === actorId) return;
  const board = await db.query.kanbanBoards.findFirst({ where: eq(kanbanBoards.id, boardId) });
  await sendPushToUser(assignedToId, {
    title: `Subtarefa atribuída a você em "${cardTitle}"`,
    body: subtaskTitle,
    url: board ? `/projetos?board=${board.id}` : "/projetos",
  });
}

const createSchema = z.object({
  cardId: z.string(),
  title: z.string().min(1).max(200),
  order: z.number().default(0),
});

const updateSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200).optional(),
  isDone: z.boolean().optional(),
  dueDate: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!(await assertCardAccess(session.user.id, parsed.data.cardId))) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const [subtask] = await db.insert(cardSubtasks).values(parsed.data).returning();
  return NextResponse.json({ success: true, data: subtask }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id, dueDate, ...rest } = parsed.data;
  const existing = await db.query.cardSubtasks.findFirst({ where: eq(cardSubtasks.id, id) });
  if (!existing) {
    return NextResponse.json({ error: "Subtarefa não encontrada" }, { status: 404 });
  }
  const access = await assertCardAccess(session.user.id, existing.cardId);
  if (!access) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const updateData: Partial<typeof cardSubtasks.$inferInsert> = { ...rest };
  if (dueDate !== undefined) updateData.dueDate = dueDate ? parseDateOnly(dueDate) : null;

  const [updated] = await db.update(cardSubtasks).set(updateData).where(eq(cardSubtasks.id, id)).returning();

  if (rest.assignedToId && rest.assignedToId !== existing.assignedToId) {
    await notifySubtaskAssignee(access.card.title, updated.title, access.card.boardId, rest.assignedToId, session.user.id);
  }

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }

  const existing = await db.query.cardSubtasks.findFirst({ where: eq(cardSubtasks.id, id) });
  if (!existing) {
    return NextResponse.json({ success: true }); // já removida
  }
  if (!(await assertCardAccess(session.user.id, existing.cardId))) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  await db.delete(cardSubtasks).where(eq(cardSubtasks.id, id));
  return NextResponse.json({ success: true });
}
