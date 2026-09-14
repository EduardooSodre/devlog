/**
 * POST /api/kanban/cards/boards — Vincula um card a um board extra (além do board dono)
 * DELETE /api/kanban/cards/boards?cardId=&boardId= — Remove o vínculo
 *
 * O board dono (kanbanCards.boardId/columnId) continua definindo onde o card aparece
 * nas colunas — isto é só uma referência cruzada, exibida no card, pra "esta tarefa
 * também faz parte do projeto X".
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cardBoards, kanbanCards, kanbanBoards } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { canAccessBoard } from "@/lib/workspace";

const schema = z.object({ cardId: z.string(), boardId: z.string() });

async function assertAccess(userId: string, cardId: string, boardId: string) {
  const card = await db.query.kanbanCards.findFirst({ where: eq(kanbanCards.id, cardId) });
  const targetBoard = await db.query.kanbanBoards.findFirst({ where: eq(kanbanBoards.id, boardId) });
  if (!card || !targetBoard) return false;

  const ownerBoard = await db.query.kanbanBoards.findFirst({ where: eq(kanbanBoards.id, card.boardId) });
  if (!ownerBoard) return false;

  // Precisa enxergar tanto o board dono do card quanto o board que está sendo vinculado.
  return (await canAccessBoard(userId, ownerBoard)) && (await canAccessBoard(userId, targetBoard));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { cardId, boardId } = parsed.data;

  if (!(await assertAccess(session.user.id, cardId, boardId))) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  await db.insert(cardBoards).values({ cardId, boardId }).onConflictDoNothing();

  const board = await db.query.kanbanBoards.findFirst({
    where: eq(kanbanBoards.id, boardId),
    columns: { id: true, name: true, color: true },
  });
  return NextResponse.json({ success: true, data: board }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const cardId = req.nextUrl.searchParams.get("cardId");
  const boardId = req.nextUrl.searchParams.get("boardId");
  if (!cardId || !boardId) {
    return NextResponse.json({ error: "cardId e boardId obrigatórios" }, { status: 400 });
  }

  if (!(await assertAccess(session.user.id, cardId, boardId))) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  await db.delete(cardBoards).where(and(eq(cardBoards.cardId, cardId), eq(cardBoards.boardId, boardId)));
  return NextResponse.json({ success: true });
}
