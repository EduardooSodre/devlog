/**
 * GET /api/kanban/cards/activity?cardId=xxx — Histórico de atividade de um card
 * (criação, mudança de status, atribuição, comentários) em ordem cronológica.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cardActivity } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { assertCardAccess } from "@/lib/workspace";

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

  const activity = await db.query.cardActivity.findMany({
    where: eq(cardActivity.cardId, cardId),
    with: { actor: { columns: { id: true, name: true, image: true } } },
    orderBy: (a, { desc }) => [desc(a.createdAt)],
  });

  return NextResponse.json({ success: true, data: activity });
}
