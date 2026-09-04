/**
 * GET /api/kanban/cards/comments?cardId=xxx — Lista comentários de um card
 * POST /api/kanban/cards/comments — Adiciona comentário
 * DELETE /api/kanban/cards/comments?id=xxx — Remove comentário (apenas o próprio autor)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cardComments, kanbanCards, kanbanBoards } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { verifyWorkspaceAccess } from "@/lib/workspace";

const createCommentSchema = z.object({
  cardId: z.string(),
  content: z.string().min(1).max(4000),
});

/** Confirma que o usuário é membro do workspace dono do card — sem isso, qualquer
 * usuário autenticado poderia ler/escrever comentários em cards de outros workspaces
 * só sabendo (ou adivinhando) o cardId. */
async function assertCardAccess(userId: string, cardId: string) {
  const card = await db.query.kanbanCards.findFirst({ where: eq(kanbanCards.id, cardId) });
  if (!card) return null;

  const board = await db.query.kanbanBoards.findFirst({ where: eq(kanbanBoards.id, card.boardId) });
  if (!board) return null;

  const member = await verifyWorkspaceAccess(userId, board.workspaceId);
  return member ? card : null;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const cardId = req.nextUrl.searchParams.get("cardId");
  if (!cardId) {
    return NextResponse.json({ error: "cardId obrigatório" }, { status: 400 });
  }

  if (!(await assertCardAccess(session.user.id, cardId))) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const comments = await db.query.cardComments.findMany({
    where: eq(cardComments.cardId, cardId),
    with: { author: { columns: { id: true, name: true, image: true } } },
    orderBy: (c, { asc }) => [asc(c.createdAt)],
  });

  return NextResponse.json({ success: true, data: comments });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!(await assertCardAccess(session.user.id, parsed.data.cardId))) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const [comment] = await db
    .insert(cardComments)
    .values({
      cardId: parsed.data.cardId,
      authorId: session.user.id,
      content: parsed.data.content,
    })
    .returning();

  const withAuthor = await db.query.cardComments.findFirst({
    where: eq(cardComments.id, comment.id),
    with: { author: { columns: { id: true, name: true, image: true } } },
  });

  return NextResponse.json({ success: true, data: withAuthor }, { status: 201 });
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

  await db.delete(cardComments).where(and(eq(cardComments.id, id), eq(cardComments.authorId, session.user.id)));

  return NextResponse.json({ success: true });
}
