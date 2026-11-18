/**
 * Workspaces públicos da empresa.
 *   GET  → os públicos cujo owner tem o mesmo domínio corporativo do usuário (e dos quais
 *          ele ainda não é membro)
 *   POST { workspaceId } → entra como "member"
 *
 * Os DOIS lados precisam ter provado o domínio (e-mail confirmado ou OAuth): quem entra
 * e o owner do workspace. Sem checar o owner, alguém cadastrado por senha como
 * ceo@empresa.com (sem confirmar) criaria um workspace "da empresa" e atrairia os colegas.
 * Quem foi removido do workspace não volta sozinho — só por convite.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, ilike, isNotNull, notInArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, workspaces, workspaceMembers, workspaceRemovals } from "@/lib/db/schema";
import { verifiedCompanyDomain } from "@/lib/org-domain";
import { checkPlanLimit, getUserWorkspaces, verifyWorkspaceAccess } from "@/lib/workspace";

async function listJoinable(userId: string, domain: string) {
  const mine = (await getUserWorkspaces(userId)).map((m) => m.workspaceId);
  const removedFrom = (
    await db.query.workspaceRemovals.findMany({ where: eq(workspaceRemovals.userId, userId), columns: { workspaceId: true } })
  ).map((r) => r.workspaceId);
  const exclude = [...mine, ...removedFrom];

  return db
    .select({ id: workspaces.id, name: workspaces.name })
    .from(workspaces)
    .innerJoin(users, eq(users.id, workspaces.ownerId))
    .where(
      and(
        eq(workspaces.isPublic, true),
        // Domínio já validado como corporativo; "%" e "_" não aparecem em domínio de e-mail.
        ilike(users.email, `%@${domain}`),
        // Owner também provou o domínio (link de confirmação ou provedor OAuth que confirmou).
        isNotNull(users.emailVerified),
        exclude.length > 0 ? notInArray(workspaces.id, exclude) : undefined,
      ),
    );
}

export async function GET() {
  const session = await auth();
  if (!session?.user.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const domain = await verifiedCompanyDomain(session.user.id);
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
    const domain = await verifiedCompanyDomain(userId);
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
