/**
 * POST /api/me/onboarding — Conclui o assistente de primeiro acesso: grava cargo,
 * opcionalmente entra num departamento já existente, e marca hasOnboarded=true.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, departmentMembers, departments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { verifyWorkspaceAccess } from "@/lib/workspace";

const schema = z.object({
  jobTitle: z.string().max(100).optional(),
  departmentId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { jobTitle, departmentId } = parsed.data;

  if (departmentId) {
    const dept = await db.query.departments.findFirst({ where: eq(departments.id, departmentId) });
    if (!dept || !(await verifyWorkspaceAccess(session.user.id, dept.workspaceId))) {
      return NextResponse.json({ error: "Departamento inválido" }, { status: 403 });
    }
    const already = await db.query.departmentMembers.findFirst({
      where: and(eq(departmentMembers.departmentId, departmentId), eq(departmentMembers.userId, session.user.id)),
    });
    if (!already) {
      await db.insert(departmentMembers).values({ departmentId, userId: session.user.id });
    }
  }

  await db
    .update(users)
    .set({ jobTitle: jobTitle || null, hasOnboarded: true })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ success: true });
}
