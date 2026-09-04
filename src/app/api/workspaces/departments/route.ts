/**
 * GET /api/workspaces/departments?workspaceId=xxx — Lista departamentos que o usuário
 *   enxerga (criados por ele, ou que ele foi adicionado) + membros de cada um.
 * POST /api/workspaces/departments — Cria um departamento e define quem enxerga.
 *   Qualquer membro do workspace pode criar um; ele já entra como membro automaticamente.
 * DELETE /api/workspaces/departments?id=xxx — Remove (só quem criou).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { departments, departmentMembers, workspaceMembers } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { getActiveWorkspaceId, verifyWorkspaceAccess } from "@/lib/workspace";

const createSchema = z.object({
  workspaceId: z.string().optional(),
  name: z.string().min(1).max(80),
  memberIds: z.array(z.string()).default([]),
});

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

  const all = await db.query.departments.findMany({
    where: eq(departments.workspaceId, workspaceId),
    with: {
      members: { with: { user: { columns: { id: true, name: true, image: true } } } },
    },
    orderBy: (d, { asc }) => [asc(d.createdAt)],
  });

  // Só devolve os que o usuário criou ou dos quais é membro — visibilidade por design.
  const visible = all.filter(
    (d) => d.createdById === session.user.id || d.members.some((m) => m.userId === session.user.id)
  );

  return NextResponse.json({ success: true, data: visible });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const workspaceId = parsed.data.workspaceId ?? (await getActiveWorkspaceId(session.user.id));
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 });
  }
  if (!(await verifyWorkspaceAccess(session.user.id, workspaceId))) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const [department] = await db
    .insert(departments)
    .values({ workspaceId, name: parsed.data.name, createdById: session.user.id })
    .returning();

  // Só aceita memberIds que realmente pertencem a este workspace — sem isso, dava pra
  // inserir qualquer userId (de outro workspace ou inventado) direto na tabela.
  const validMembers = parsed.data.memberIds.length
    ? await db
        .select({ id: workspaceMembers.userId })
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            inArray(workspaceMembers.userId, parsed.data.memberIds)
          )
        )
    : [];

  // O criador sempre enxerga o próprio departamento; os demais são quem ele escolheu.
  const memberIds = Array.from(new Set([session.user.id, ...validMembers.map((m) => m.id)]));
  await db.insert(departmentMembers).values(
    memberIds.map((userId) => ({ departmentId: department.id, userId }))
  );

  const withMembers = await db.query.departments.findFirst({
    where: eq(departments.id, department.id),
    with: { members: { with: { user: { columns: { id: true, name: true, image: true } } } } },
  });

  return NextResponse.json({ success: true, data: withMembers }, { status: 201 });
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

  await db.delete(departments).where(and(eq(departments.id, id), eq(departments.createdById, session.user.id)));

  return NextResponse.json({ success: true });
}
