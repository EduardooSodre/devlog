/**
 * GET    /api/workspaces/invites?workspaceId=xxx — Convites pendentes (com link pra copiar).
 * POST   /api/workspaces/invites — Convida (ou reenvia, se já havia convite pendente).
 * DELETE /api/workspaces/invites?id=xxx — Cancela (quem convidou ou owner/admin).
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaceInvites, departments, users, workspaceMembers } from "@/lib/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { getActiveWorkspace, verifyWorkspaceAccess, checkPlanLimit, isAdminRole } from "@/lib/workspace";
import { createOrRefreshInvite, inviteUrlFor } from "@/lib/invites";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).default("member"),
  workspaceId: z.string().optional(),
  departmentId: z.string().optional(),
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

  return NextResponse.json({
    success: true,
    data: invites.map((i) => ({ ...i, inviteUrl: inviteUrlFor(i.token), expired: i.expiresAt < new Date() })),
  });
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const parsed = inviteSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    let wsId = parsed.data.workspaceId;
    let role: string | undefined;
    if (wsId) {
      const member = await verifyWorkspaceAccess(session.user.id, wsId);
      if (!member) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
      role = member.role;
    } else {
      const ctx = await getActiveWorkspace(session.user.id);
      wsId = ctx?.workspaceId;
      role = ctx?.membership.role;
    }

    if (!wsId) {
      return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 });
    }
    // Só owner/admin pode convidar já como admin — senão um membro comum se "promoveria"
    // por tabela convidando uma segunda conta sua como admin.
    if (parsed.data.role === "admin" && !isAdminRole(role)) {
      return NextResponse.json({ error: "Só administradores podem convidar outros administradores" }, { status: 403 });
    }

    const existingUser = await db.query.users.findFirst({
      where: sql`lower(${users.email}) = ${parsed.data.email.toLowerCase()}`,
    });
    if (existingUser) {
      const alreadyIn = await db.query.workspaceMembers.findFirst({
        where: and(eq(workspaceMembers.workspaceId, wsId), eq(workspaceMembers.userId, existingUser.id)),
      });
      if (alreadyIn) {
        return NextResponse.json({ error: "Essa pessoa já faz parte do workspace" }, { status: 409 });
      }
    }

    const limit = await checkPlanLimit(wsId, "members");
    if (!limit.allowed) {
      return NextResponse.json({ error: limit.message }, { status: 403 });
    }

    if (parsed.data.departmentId) {
      const dept = await db.query.departments.findFirst({ where: eq(departments.id, parsed.data.departmentId) });
      if (!dept || dept.workspaceId !== wsId) {
        return NextResponse.json({ error: "Departamento inválido" }, { status: 403 });
      }
    }

    const { invite, inviteUrl, emailSent } = await createOrRefreshInvite({
      workspaceId: wsId,
      email: parsed.data.email,
      role: parsed.data.role,
      departmentId: parsed.data.departmentId,
      invitedById: session.user.id,
      inviterName: session.user.name ?? session.user.email ?? "Alguém",
    });

    return NextResponse.json({ success: true, data: { ...invite, inviteUrl, emailSent } }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/workspaces/invites]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
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

  const invite = await db.query.workspaceInvites.findFirst({ where: eq(workspaceInvites.id, id) });
  if (!invite) return NextResponse.json({ success: true });

  const member = await verifyWorkspaceAccess(session.user.id, invite.workspaceId);
  if (!member || (invite.invitedById !== session.user.id && !isAdminRole(member.role))) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  await db.delete(workspaceInvites).where(eq(workspaceInvites.id, id));
  return NextResponse.json({ success: true });
}
