import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaceInvites, workspaces, departments } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getActiveWorkspace, verifyWorkspaceAccess, checkPlanLimit } from "@/lib/workspace";
import { sendMail } from "@/lib/mail";
import { z } from "zod";
import { nanoid } from "nanoid";

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

    let department: { id: string; name: string } | undefined;
    if (parsed.data.departmentId) {
      const dept = await db.query.departments.findFirst({ where: eq(departments.id, parsed.data.departmentId) });
      if (!dept || dept.workspaceId !== wsId) {
        return NextResponse.json({ error: "Departamento inválido" }, { status: 403 });
      }
      department = dept;
    }

    const token = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const [invite] = await db
      .insert(workspaceInvites)
      .values({
        workspaceId: wsId,
        departmentId: parsed.data.departmentId,
        email: parsed.data.email.toLowerCase(),
        role: parsed.data.role,
        token,
        invitedById: session.user.id,
        expiresAt,
      })
      .returning();

    const baseUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const inviteUrl = `${baseUrl}/invite/${token}`;

    const workspace = await db.query.workspaces.findFirst({ where: eq(workspaces.id, wsId) });
    const inviterName = session.user.name ?? session.user.email ?? "Alguém";
    const destination = department ? `${workspace?.name} · ${department.name}` : workspace?.name;
    const emailSent = await sendMail({
      to: invite.email,
      subject: `${inviterName} te convidou para o ${destination} no DevLog`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Você foi convidado(a)!</h2>
          <p><strong>${inviterName}</strong> te convidou para participar de <strong>${destination}</strong> no DevLog.</p>
          <p style="margin: 24px 0;">
            <a href="${inviteUrl}" style="background:#4f6ef7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Aceitar convite</a>
          </p>
          <p style="color:#888;font-size:12px;">Este convite expira em 7 dias. Se você não esperava este e-mail, pode ignorá-lo.</p>
        </div>
      `,
    });

    return NextResponse.json(
      { success: true, data: { ...invite, inviteUrl, emailSent } },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/workspaces/invites]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
