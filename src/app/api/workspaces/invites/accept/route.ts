import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaceInvites, workspaceMembers } from "@/lib/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({ token: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Faça login para aceitar o convite" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Token inválido" }, { status: 400 });
    }

    const invite = await db.query.workspaceInvites.findFirst({
      where: and(
        eq(workspaceInvites.token, parsed.data.token),
        isNull(workspaceInvites.acceptedAt),
        gt(workspaceInvites.expiresAt, new Date())
      ),
    });

    if (!invite) {
      return NextResponse.json({ error: "Convite inválido ou expirado" }, { status: 404 });
    }

    if (invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return NextResponse.json(
        { error: "Este convite foi enviado para outro e-mail" },
        { status: 403 }
      );
    }

    const existing = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, invite.workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    });

    if (!existing) {
      await db.insert(workspaceMembers).values({
        workspaceId: invite.workspaceId,
        userId: session.user.id,
        role: invite.role,
      });
    }

    await db
      .update(workspaceInvites)
      .set({ acceptedAt: new Date() })
      .where(eq(workspaceInvites.id, invite.id));

    return NextResponse.json({ success: true, workspaceId: invite.workspaceId });
  } catch (error) {
    console.error("[POST /api/workspaces/invites/accept]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
