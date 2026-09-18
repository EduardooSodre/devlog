/**
 * GET /api/me/notifications — Últimas notificações do usuário logado + contagem de não lidas.
 * PATCH /api/me/notifications — Marca como lida: { id } uma específica, ou { all: true } todas.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const list = await db.query.notifications.findMany({
    where: eq(notifications.userId, session.user.id),
    orderBy: (n, { desc }) => [desc(n.createdAt)],
    limit: 50,
  });

  const [unread] = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, session.user.id), eq(notifications.read, false)));

  return NextResponse.json({ success: true, data: list, unreadCount: unread?.value ?? 0 });
}

const patchSchema = z.union([z.object({ id: z.string() }), z.object({ all: z.literal(true) })]);

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if ("all" in parsed.data) {
    await db.update(notifications).set({ read: true }).where(eq(notifications.userId, session.user.id));
  } else {
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, parsed.data.id), eq(notifications.userId, session.user.id)));
  }

  return NextResponse.json({ success: true });
}
