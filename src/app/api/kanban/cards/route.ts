/**
 * GET /api/kanban/cards?boardId=xxx — Lista cards de um board
 * POST /api/kanban/cards — Cria novo card
 * PATCH /api/kanban/cards — Atualiza card (move, conclui, edita)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { kanbanCards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const createCardSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueDate: z.string().optional(),
  columnId: z.string(),
  boardId: z.string(),
  order: z.number().default(0),
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
});

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

    const { title, description, priority, dueDate, columnId, boardId, order } = parsed.data;

    const [card] = await db
      .insert(kanbanCards)
      .values({
        title,
        description,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        columnId,
        boardId,
        order,
        createdById: session.user.id,
      })
      .returning();

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

    // Prepara dados para update
    const updateData: Partial<typeof kanbanCards.$inferInsert> = {};

    if (updates.title) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.priority) updateData.priority = updates.priority;
    if (updates.status) updateData.status = updates.status;
    if (updates.columnId) updateData.columnId = updates.columnId;
    if (updates.order !== undefined) updateData.order = updates.order;
    if (updates.completionNotes) updateData.completionNotes = updates.completionNotes;

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

    await db.delete(kanbanCards).where(eq(kanbanCards.id, cardId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/kanban/cards]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
