/**
 * GET /api/workspaces/members?workspaceId=xxx — Lista membros do workspace (para atribuir tarefas)
 * Sem workspaceId, usa o workspace ativo do usuário.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaceMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getActiveWorkspaceId } from "@/lib/workspace";

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

  const isMember = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, session.user.id)
    ),
  });
  if (!isMember) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const members = await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.workspaceId, workspaceId),
    with: {
      user: { columns: { id: true, name: true, email: true, image: true } },
    },
  });

  return NextResponse.json({
    success: true,
    data: members.map((m) => ({ ...m.user, role: m.role })),
  });
}
