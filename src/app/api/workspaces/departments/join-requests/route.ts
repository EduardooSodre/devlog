/**
 * POST /api/workspaces/departments/join-requests — Solicita entrada num departamento
 *   (nunca entra direto: fica "pending" até o criador do departamento aprovar).
 * GET  /api/workspaces/departments/join-requests?departmentId=xxx — Pedidos pendentes
 *   de um departamento que EU criei (pra eu aprovar/rejeitar).
 * GET  /api/workspaces/departments/join-requests?mine=1 — Meus próprios pedidos.
 * PATCH /api/workspaces/departments/join-requests — Aprova ou rejeita um pedido
 *   (só quem criou o departamento pode decidir).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { departments, departmentMembers, departmentJoinRequests, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { notifyUser } from "@/lib/notify";
import { escapeHtml } from "@/lib/mail";
import { joinOrRequestDepartment } from "@/lib/department-requests";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  if (req.nextUrl.searchParams.get("mine") === "1") {
    const mine = await db.query.departmentJoinRequests.findMany({
      where: eq(departmentJoinRequests.userId, session.user.id),
      with: { department: { columns: { id: true, name: true } } },
      orderBy: (r, { desc }) => [desc(r.createdAt)],
    });
    return NextResponse.json({ success: true, data: mine });
  }

  const departmentId = req.nextUrl.searchParams.get("departmentId");
  if (!departmentId) {
    return NextResponse.json({ error: "departmentId obrigatório" }, { status: 400 });
  }

  const dept = await db.query.departments.findFirst({ where: eq(departments.id, departmentId) });
  if (!dept || dept.createdById !== session.user.id) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const pending = await db.query.departmentJoinRequests.findMany({
    where: and(eq(departmentJoinRequests.departmentId, departmentId), eq(departmentJoinRequests.status, "pending")),
    with: { user: { columns: { id: true, name: true, email: true, image: true } } },
    orderBy: (r, { asc }) => [asc(r.createdAt)],
  });

  return NextResponse.json({ success: true, data: pending });
}

const createSchema = z.object({ departmentId: z.string() });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const dept = await db.query.departments.findFirst({ where: eq(departments.id, parsed.data.departmentId) });
  if (!dept || !(await verifyWorkspaceAccess(session.user.id, dept.workspaceId))) {
    return NextResponse.json({ error: "Departamento inválido" }, { status: 403 });
  }

  const result = await joinOrRequestDepartment(dept, session.user.id);
  if (result === "already_member") {
    return NextResponse.json({ error: "Você já faz parte deste departamento" }, { status: 409 });
  }

  return NextResponse.json({ success: true, data: { status: result } }, { status: 201 });
}

const decideSchema = z.object({ id: z.string(), action: z.enum(["approve", "reject"]) });

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const parsed = decideSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const request = await db.query.departmentJoinRequests.findFirst({
    where: eq(departmentJoinRequests.id, parsed.data.id),
  });
  if (!request || request.status !== "pending") {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  const dept = await db.query.departments.findFirst({ where: eq(departments.id, request.departmentId) });
  if (!dept || dept.createdById !== session.user.id) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const status = parsed.data.action === "approve" ? "approved" : "rejected";
  await db
    .update(departmentJoinRequests)
    .set({ status, decidedById: session.user.id, decidedAt: new Date() })
    .where(eq(departmentJoinRequests.id, request.id));

  if (status === "approved") {
    const already = await db.query.departmentMembers.findFirst({
      where: and(eq(departmentMembers.departmentId, dept.id), eq(departmentMembers.userId, request.userId)),
    });
    if (!already) {
      await db.insert(departmentMembers).values({ departmentId: dept.id, userId: request.userId });
    }
  }

  const requestedUser = await db.query.users.findFirst({ where: eq(users.id, request.userId) });
  if (requestedUser) {
    const approved = status === "approved";
    await notifyUser(requestedUser.id, {
      title: approved ? "Pedido aprovado!" : "Pedido recusado",
      body: approved
        ? `Você agora faz parte do departamento ${dept.name}`
        : `Seu pedido para entrar em ${dept.name} foi recusado`,
      url: "/settings",
      email: {
        subject: approved ? `Você entrou em ${dept.name}` : `Pedido para ${dept.name} recusado`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <p>${approved
              ? `Seu pedido para entrar no departamento <strong>${escapeHtml(dept.name)}</strong> foi aprovado. Já dá pra ver os quadros dele no DevLog.`
              : `Seu pedido para entrar no departamento <strong>${escapeHtml(dept.name)}</strong> foi recusado.`}</p>
          </div>
        `,
      },
    });
  }

  return NextResponse.json({ success: true });
}
