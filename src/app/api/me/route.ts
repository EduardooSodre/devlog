import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaceMembers, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const membership = await db.query.workspaceMembers.findFirst({
    where: eq(workspaceMembers.userId, session.user.id),
  });

  return NextResponse.json({
    user: session.user,
    workspaceId: membership?.workspaceId ?? null,
    role: membership?.role ?? null,
  });
}

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const [updated] = await db
      .update(users)
      .set({ name: parsed.data.name })
      .where(eq(users.id, session.user.id))
      .returning();

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error("[PATCH /api/me]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
