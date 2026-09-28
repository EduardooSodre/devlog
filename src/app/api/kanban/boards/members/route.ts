/**
 * GET    /api/kanban/boards/members?boardId=xxx — Quem foi adicionado ao board.
 * POST   /api/kanban/boards/members — { boardId, email }: se a pessoa já está no
 *   workspace, entra no board na hora (sem convite, sem e-mail pra clicar); se não está,
 *   recebe convite que, ao ser aceito, já a coloca no workspace E no board.
 * DELETE /api/kanban/boards/members?boardId=xxx&userId=yyy — Tira do board.
 * Adicionar/remover: só quem criou o board ou owner/admin.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { boardMembers, kanbanBoards, users, workspaceMembers } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { canAccessBoard, canManageBoard, checkPlanLimit, verifyWorkspaceAccess } from "@/lib/workspace";
import { createOrRefreshInvite } from "@/lib/invites";
import { notifyUser } from "@/lib/notify";
import { escapeHtml } from "@/lib/mail";

async function loadBoardForManager(userId: string, boardId: string) {
  const board = await db.query.kanbanBoards.findFirst({ where: eq(kanbanBoards.id, boardId) });
  if (!board) return null;
  const member = await verifyWorkspaceAccess(userId, board.workspaceId);
  if (!member || !canManageBoard(userId, board, member.role)) return null;
  return board;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const boardId = req.nextUrl.searchParams.get("boardId");
  if (!boardId) return NextResponse.json({ error: "boardId obrigatório" }, { status: 400 });

  const board = await db.query.kanbanBoards.findFirst({ where: eq(kanbanBoards.id, boardId) });
  if (!board || !(await canAccessBoard(session.user.id, board))) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const members = await db.query.boardMembers.findMany({
    where: eq(boardMembers.boardId, boardId),
    with: { user: { columns: { id: true, name: true, email: true, image: true } } },
    orderBy: (m, { asc }) => [asc(m.createdAt)],
  });
  const creator = await db.query.users.findFirst({
    where: eq(users.id, board.createdById),
    columns: { id: true, name: true, email: true, image: true },
  });

  return NextResponse.json({ success: true, data: { creator, members: members.map((m) => m.user) } });
}

const addSchema = z.object({ boardId: z.string(), email: z.string().email() });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const parsed = addSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
  }

  const board = await loadBoardForManager(session.user.id, parsed.data.boardId);
  if (!board) {
    return NextResponse.json({ error: "Só quem criou o board ou um administrador pode adicionar pessoas" }, { status: 403 });
  }

  const email = parsed.data.email.toLowerCase();
  const target = await db.query.users.findFirst({ where: sql`lower(${users.email}) = ${email}` });
  const targetInWorkspace =
    target &&
    (await db.query.workspaceMembers.findFirst({
      where: and(eq(workspaceMembers.workspaceId, board.workspaceId), eq(workspaceMembers.userId, target.id)),
    }));

  if (target && targetInWorkspace) {
    if (target.id === board.createdById) {
      return NextResponse.json({ error: "Essa pessoa criou o board — já tem acesso" }, { status: 409 });
    }
    await db
      .insert(boardMembers)
      .values({ boardId: board.id, userId: target.id, addedById: session.user.id })
      .onConflictDoNothing();

    const actorName = session.user.name ?? session.user.email ?? "Alguém";
    await notifyUser(target.id, {
      title: `${actorName} te adicionou a um projeto`,
      body: board.name,
      url: `/projetos?board=${board.id}`,
      email: {
        subject: `${actorName} te adicionou ao projeto ${board.name}`,
        html: `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;"><p><strong>${escapeHtml(actorName)}</strong> te adicionou ao projeto <strong>${escapeHtml(board.name)}</strong> no DevLog.</p></div>`,
      },
    });
    return NextResponse.json({ success: true, data: { status: "added" } }, { status: 201 });
  }

  // Não está no workspace: convida (entrar = novo assento, então respeita o limite do plano).
  const limit = await checkPlanLimit(board.workspaceId, "members");
  if (!limit.allowed) {
    return NextResponse.json({ error: limit.message }, { status: 403 });
  }

  const { inviteUrl, emailSent } = await createOrRefreshInvite({
    workspaceId: board.workspaceId,
    email,
    boardId: board.id,
    invitedById: session.user.id,
    inviterName: session.user.name ?? session.user.email ?? "Alguém",
  });

  return NextResponse.json({ success: true, data: { status: "invited", inviteUrl, emailSent } }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const boardId = req.nextUrl.searchParams.get("boardId");
  const userId = req.nextUrl.searchParams.get("userId");
  if (!boardId || !userId) {
    return NextResponse.json({ error: "boardId e userId obrigatórios" }, { status: 400 });
  }

  const board = await loadBoardForManager(session.user.id, boardId);
  if (!board) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  await db.delete(boardMembers).where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, userId)));
  return NextResponse.json({ success: true });
}
