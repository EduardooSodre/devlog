/**
 * POST /api/me/onboarding — Conclui o assistente de primeiro acesso: grava cargo,
 * marca hasOnboarded=true e, se a pessoa escolheu um departamento JÁ existente (criado
 * por outra pessoa), abre uma solicitação de entrada em vez de inserir direto — quem
 * decide quem entra é sempre quem criou o departamento (ver /departments/join-requests).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, departments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { joinOrRequestDepartment } from "@/lib/department-requests";

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
  let result: Awaited<ReturnType<typeof joinOrRequestDepartment>> | undefined;

  if (departmentId) {
    const dept = await db.query.departments.findFirst({ where: eq(departments.id, departmentId) });
    if (!dept || !(await verifyWorkspaceAccess(session.user.id, dept.workspaceId))) {
      return NextResponse.json({ error: "Departamento inválido" }, { status: 403 });
    }
    result = await joinOrRequestDepartment(dept, session.user.id);
  }

  await db
    .update(users)
    .set({ jobTitle: jobTitle || null, hasOnboarded: true })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ success: true, joinRequested: result === "requested" });
}
