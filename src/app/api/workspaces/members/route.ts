/**
 * GET    /api/workspaces/members?workspaceId=xxx — Membros do workspace (pra atribuir tarefas, etc).
 * PATCH  /api/workspaces/members — Muda o papel de alguém (member ↔ admin). Só owner/admin.
 * DELETE /api/workspaces/members?workspaceId=xxx&userId=yyy — Remove do workspace (e da
 *   cobrança por assento). Só owner/admin; o dono nunca pode ser removido/rebaixado.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaceMembers, workspaces } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getActiveWorkspaceId, isAdminRole, verifyWorkspaceAccess } from "@/lib/workspace";
import { onMemberRemoved } from "@/lib/members";
import { notifyUser } from "@/lib/notify";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const workspaceId =
    req.nextUrl.searchParams.get("workspaceId") ?? (await getActiveWorkspaceId(session.user.id));
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId obrigatório" }, { status: 400 });
  }

  if (!(await verifyWorkspaceAccess(session.user.id, workspaceId))) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const members = await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.workspaceId, workspaceId),
    with: {
      user: { columns: { id: true, name: true, email: true, image: true, jobTitle: true } },
    },
    orderBy: (m, { asc }) => [asc(m.joinedAt)],
  });

  return NextResponse.json({
    success: true,
    data: members.map((m) => ({ ...m.user, role: m.role, joinedAt: m.joinedAt })),
  });
}

/** Garante que quem chama é owner/admin e que o alvo existe e não é o dono. */
async function authorizeTarget(actorId: string, workspaceId: string, targetUserId: string) {
  const actor = await verifyWorkspaceAccess(actorId, workspaceId);
  if (!actor || !isAdminRole(actor.role)) return { error: "Só administradores podem fazer isso", status: 403 } as const;

  const target = await verifyWorkspaceAccess(targetUserId, workspaceId);
  if (!target) return { error: "Membro não encontrado", status: 404 } as const;
  if (target.role === "owner") return { error: "O dono do workspace não pode ser alterado", status: 403 } as const;

  return { target } as const;
}

const patchSchema = z.object({
  workspaceId: z.string(),
  userId: z.string(),
  role: z.enum(["admin", "member"]),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { workspaceId, userId, role } = parsed.data;

  const check = await authorizeTarget(session.user.id, workspaceId, userId);
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  await db
    .update(workspaceMembers)
    .set({ role })
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)));

  const workspace = await db.query.workspaces.findFirst({ where: eq(workspaces.id, workspaceId) });
  await notifyUser(userId, {
    title: role === "admin" ? "Você agora é administrador" : "Você não é mais administrador",
    body: workspace?.name ?? "",
    url: "/settings",
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const workspaceId = req.nextUrl.searchParams.get("workspaceId");
  const userId = req.nextUrl.searchParams.get("userId");
  if (!workspaceId || !userId) {
    return NextResponse.json({ error: "workspaceId e userId obrigatórios" }, { status: 400 });
  }
  if (userId === session.user.id) {
    return NextResponse.json({ error: "Você não pode remover a si mesmo" }, { status: 400 });
  }

  const check = await authorizeTarget(session.user.id, workspaceId, userId);
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  await db
    .delete(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)));
  await onMemberRemoved(workspaceId);

  return NextResponse.json({ success: true });
}
