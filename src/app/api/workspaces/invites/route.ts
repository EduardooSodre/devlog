import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaceInvites, workspaceMembers, users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getActiveWorkspace, verifyWorkspaceAccess, checkPlanLimit } from "@/lib/workspace";
import { z } from "zod";
import { nanoid } from "nanoid";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).default("member"),
  workspaceId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let wsId = req.nextUrl.searchParams.get("workspaceId");
  if (wsId) {
    const member = await verifyWorkspaceAccess(session.user.id, wsId);
    if (!member) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  } else {
    const ctx = await getActiveWorkspace(session.user.id);
    wsId = ctx?.workspaceId ?? null;
  }

  if (!wsId) {
    return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 });
  }

  const invites = await db.query.workspaceInvites.findMany({
    where: and(eq(workspaceInvites.workspaceId, wsId), isNull(workspaceInvites.acceptedAt)),
    orderBy: (i, { desc }) => [desc(i.createdAt)],
  });

  return NextResponse.json({ success: true, data: invites });
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    let wsId = parsed.data.workspaceId;
    if (wsId) {
      const member = await verifyWorkspaceAccess(session.user.id, wsId);
      if (!member) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    } else {
      const ctx = await getActiveWorkspace(session.user.id);
      wsId = ctx?.workspaceId;
    }

    if (!wsId) {
      return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 });
    }

    const limit = await checkPlanLimit(wsId, "members");
    if (!limit.allowed) {
      return NextResponse.json({ error: limit.message }, { status: 403 });
    }

    const token = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const [invite] = await db
      .insert(workspaceInvites)
      .values({
        workspaceId: wsId,
        email: parsed.data.email.toLowerCase(),
        role: parsed.data.role,
        token,
        invitedById: session.user.id,
        expiresAt,
      })
      .returning();

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const inviteUrl = `${baseUrl}/invite/${token}`;

    return NextResponse.json(
      { success: true, data: { ...invite, inviteUrl } },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/workspaces/invites]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
