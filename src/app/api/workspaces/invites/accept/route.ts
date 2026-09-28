/**
 * GET  /api/workspaces/invites/accept?token=xxx — Dados do convite pra página de aceite
 *   (e-mail convidado, workspace, quem convidou). O token no link é o segredo — quem
 *   não tem o link não descobre nada.
 * POST /api/workspaces/invites/accept — Aceita e já define o workspace convidado como
 *   ativo, pra pessoa cair direto nele (antes caía no workspace pessoal e parecia que o
 *   convite não tinha funcionado).
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaces, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { WORKSPACE_COOKIE } from "@/lib/workspace";
import { acceptInvite, findValidInviteByToken } from "@/lib/invites";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token obrigatório" }, { status: 400 });

  const invite = await findValidInviteByToken(token);
  if (!invite) {
    return NextResponse.json({ error: "Convite inválido, expirado ou já usado" }, { status: 404 });
  }

  const workspace = await db.query.workspaces.findFirst({ where: eq(workspaces.id, invite.workspaceId) });
  const inviter = await db.query.users.findFirst({ where: eq(users.id, invite.invitedById) });

  return NextResponse.json({
    success: true,
    data: {
      email: invite.email,
      workspaceName: workspace?.name ?? "",
      inviterName: inviter?.name ?? inviter?.email ?? "Alguém",
    },
  });
}

const schema = z.object({ token: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Faça login para aceitar o convite" }, { status: 401 });
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Token inválido" }, { status: 400 });
    }

    const invite = await findValidInviteByToken(parsed.data.token);
    if (!invite) {
      return NextResponse.json({ error: "Convite inválido ou expirado" }, { status: 404 });
    }

    if (invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return NextResponse.json(
        { error: `Este convite foi enviado para ${invite.email}. Entre com esse e-mail.` },
        { status: 403 }
      );
    }

    await acceptInvite(invite, session.user.id);

    const cookieStore = await cookies();
    cookieStore.set(WORKSPACE_COOKIE, invite.workspaceId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return NextResponse.json({ success: true, workspaceId: invite.workspaceId, boardId: invite.boardId });
  } catch (error) {
    console.error("[POST /api/workspaces/invites/accept]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
