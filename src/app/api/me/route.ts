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

  const [membership, dbUser] = await Promise.all([
    db.query.workspaceMembers.findFirst({ where: eq(workspaceMembers.userId, session.user.id) }),
    db.query.users.findFirst({ where: eq(users.id, session.user.id) }),
  ]);

  return NextResponse.json({
    user: { ...session.user, jobTitle: dbUser?.jobTitle ?? null },
    workspaceId: membership?.workspaceId ?? null,
    role: membership?.role ?? null,
  });
}

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  jobTitle: z.string().max(100).optional().nullable(),
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

    const { name, jobTitle } = parsed.data;
    const [updated] = await db
      .update(users)
      .set({
        ...(name !== undefined && { name }),
        ...(jobTitle !== undefined && { jobTitle }),
      })
      .where(eq(users.id, session.user.id))
      .returning();

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error("[PATCH /api/me]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
