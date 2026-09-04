/**
 * GET /api/kanban/columns?boardId=xxx — Lista colunas de um board
 * POST /api/kanban/columns — Cria nova coluna
 * PATCH /api/kanban/columns — Atualiza coluna (nome, ordem, cor)
 * DELETE /api/kanban/columns — Deleta coluna
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { kanbanColumns, kanbanBoards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { canAccessBoard } from "@/lib/workspace";

const createColumnSchema = z.object({
  name: z.string().min(1).max(50),
  boardId: z.string(),
  order: z.number().default(0),
  color: z.string().optional(),
});

async function assertBoardAccess(userId: string, boardId: string) {
  const board = await db.query.kanbanBoards.findFirst({ where: eq(kanbanBoards.id, boardId) });
  if (!board) return false;
  return canAccessBoard(userId, board);
}

async function assertColumnAccess(userId: string, columnId: string) {
  const column = await db.query.kanbanColumns.findFirst({ where: eq(kanbanColumns.id, columnId) });
  if (!column) return null;
  return (await assertBoardAccess(userId, column.boardId)) ? column : null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createColumnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { name, boardId, order, color } = parsed.data;

    if (!(await assertBoardAccess(session.user.id, boardId))) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const [column] = await db
      .insert(kanbanColumns)
      .values({
        name,
        boardId,
        order,
        color,
      })
      .returning();

    return NextResponse.json({ success: true, data: column }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/kanban/columns]", error);
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
    const { id, name, order, color } = body;

    if (!id) {
      return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    }

    if (!(await assertColumnAccess(session.user.id, id))) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const [updated] = await db
      .update(kanbanColumns)
      .set({
        ...(name && { name }),
        ...(order !== undefined && { order }),
        ...(color !== undefined && { color }),
      })
      .where(eq(kanbanColumns.id, id))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[PATCH /api/kanban/columns]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    }

    if (!(await assertColumnAccess(session.user.id, id))) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    await db.delete(kanbanColumns).where(eq(kanbanColumns.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/kanban/columns]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
