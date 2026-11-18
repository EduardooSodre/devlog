/**
 * Workspaces públicos da empresa.
 *   GET  → os públicos cujo owner tem o mesmo domínio corporativo do usuário (e dos quais
 *          ele ainda não é membro)
 *   POST { workspaceId } → entra como "member"
 *
 * Só vale pra e-mail corporativo comprovado: domínio de webmail (gmail etc.) nunca
 * casa, e cadastro por senha precisa ter confirmado o e-mail (OAuth já provou).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, ilike, notInArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, workspaces, workspaceMembers } from "@/lib/db/schema";
import { getEmailDomain, isCompanyDomain } from "@/lib/org-domain";
import { checkPlanLimit, getUserWorkspaces, verifyWorkspaceAccess } from "@/lib/workspace";

async function companyDomainOf(userId: string): Promise<string | null> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return null;
  const verified = user.emailVerified !== null || user.password === null;
  const domain = getEmailDomain(user.email);
  return verified && isCompanyDomain(domain) ? domain : null;
}

async function listJoinable(userId: string, domain: string) {
  const mine = (await getUserWorkspaces(userId)).map((m) => m.workspaceId);
  return db
    .select({ id: workspaces.id, name: workspaces.name })
    .from(workspaces)
    .innerJoin(users, eq(users.id, workspaces.ownerId))
    .where(
      and(
        eq(workspaces.isPublic, true),
        // Domínio já validado como corporativo; "%" e "_" não aparecem em domínio de e-mail.
        ilike(users.email, `%@${domain}`),
        mine.length > 0 ? notInArray(workspaces.id, mine) : undefined,
      ),
    );
}

export async function GET() {
  const session = await auth();
  if (!session?.user.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const domain = await companyDomainOf(session.user.id);
  if (!domain) return NextResponse.json({ workspaces: [] });

  return NextResponse.json({ workspaces: await listJoinable(session.user.id, domain) });
}

const joinSchema = z.object({ workspaceId: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    const userId = session.user.id;

    const parsed = joinSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "workspaceId inválido" }, { status: 400 });
    const { workspaceId } = parsed.data;

    if (await verifyWorkspaceAccess(userId, workspaceId)) {
      return NextResponse.json({ success: true, workspaceId });
    }

    // Mesma regra do GET — não confia no id vindo do cliente.
    const domain = await companyDomainOf(userId);
    const joinable = domain ? await listJoinable(userId, domain) : [];
    if (!joinable.some((w) => w.id === workspaceId)) {
      return NextResponse.json({ error: "Este workspace não está aberto pra você" }, { status: 403 });
    }

    const limit = await checkPlanLimit(workspaceId, "members");
    if (!limit.allowed) return NextResponse.json({ error: limit.message }, { status: 403 });

    await db.insert(workspaceMembers).values({ workspaceId, userId, role: "member" }).onConflictDoNothing();
    const { onMemberJoined } = await import("@/lib/members");
    await onMemberJoined(workspaceId, userId);

    return NextResponse.json({ success: true, workspaceId });
  } catch (error) {
    console.error("[POST /api/workspaces/public]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
