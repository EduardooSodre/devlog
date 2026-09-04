import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cardAttachments, kanbanCards, kanbanBoards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { verifyWorkspaceAccess } from "@/lib/workspace";

const createAttachmentSchema = z.object({
  cardId: z.string(),
  type: z.enum(["screenshot", "before", "after"]),
  fileName: z.string(),
  fileUrl: z.string().url(),
  fileKey: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createAttachmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const card = await db.query.kanbanCards.findFirst({ where: eq(kanbanCards.id, parsed.data.cardId) });
    if (!card) {
      return NextResponse.json({ error: "Card não encontrado" }, { status: 404 });
    }
    const board = await db.query.kanbanBoards.findFirst({ where: eq(kanbanBoards.id, card.boardId) });
    if (!board || !(await verifyWorkspaceAccess(session.user.id, board.workspaceId))) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const [attachment] = await db
      .insert(cardAttachments)
      .values({
        ...parsed.data,
        uploadedById: session.user.id,
      })
      .returning();

    return NextResponse.json({ success: true, data: attachment });
  } catch (error) {
    console.error("[POST /api/kanban/cards/attachments]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
