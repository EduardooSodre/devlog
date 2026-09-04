import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  workspaceMembers,
  workspaces,
  kanbanBoards,
  kanbanCards,
  docEntries,
  docAttachments,
  cardAttachments,
  subscriptions,
  departments,
  departmentMembers,
} from "@/lib/db/schema";
import { eq, and, count, sql, inArray, isNull, or, type SQL } from "drizzle-orm";
import { getPlanConfig, isWithinLimit, type PlanId } from "@/lib/plans";
import { isTrialExpired } from "@/lib/org-domain";

export const WORKSPACE_COOKIE = "devlog-workspace";

export async function getUserWorkspaces(userId: string) {
  return db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.userId, userId),
    with: { workspace: true },
  });
}

export async function getActiveWorkspaceId(userId: string): Promise<string | null> {
  const memberships = await getUserWorkspaces(userId);
  if (memberships.length === 0) return null;

  const cookieStore = await cookies();
  const preferred = cookieStore.get(WORKSPACE_COOKIE)?.value;
  if (preferred && memberships.some((m) => m.workspaceId === preferred)) {
    return preferred;
  }

  return memberships[0].workspaceId;
}

export async function getActiveWorkspace(userId: string) {
  const workspaceId = await getActiveWorkspaceId(userId);
  if (!workspaceId) return null;

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });

  const membership = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId)
    ),
  });

  if (!workspace || !membership) return null;

  return { workspace, membership, workspaceId };
}

export async function verifyWorkspaceAccess(userId: string, workspaceId: string) {
  return db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId)
    ),
  });
}

/**
 * Filtro SQL para "quais boards este usuário enxerga": dono/admin do workspace vê
 * tudo; membro comum só vê boards sem departamento (visíveis pro workspace inteiro)
 * ou de departamentos dos quais participa. `undefined` = sem filtro (vê tudo).
 */
export async function getBoardVisibilityFilter(
  userId: string,
  workspaceId: string,
  role: string
): Promise<SQL | undefined> {
  if (role === "owner" || role === "admin") return undefined;

  const rows = await db
    .select({ id: departments.id })
    .from(departments)
    .innerJoin(departmentMembers, eq(departmentMembers.departmentId, departments.id))
    .where(and(eq(departments.workspaceId, workspaceId), eq(departmentMembers.userId, userId)));
  const myDeptIds = rows.map((r) => r.id);

  return myDeptIds.length > 0
    ? or(isNull(kanbanBoards.departmentId), inArray(kanbanBoards.departmentId, myDeptIds))
    : isNull(kanbanBoards.departmentId);
}

export async function getWorkspaceUsage(workspaceId: string) {
  const [boardsResult] = await db
    .select({ value: count() })
    .from(kanbanBoards)
    .where(
      and(eq(kanbanBoards.workspaceId, workspaceId), eq(kanbanBoards.isArchived, false))
    );

  const [docsResult] = await db
    .select({ value: count() })
    .from(docEntries)
    .where(eq(docEntries.workspaceId, workspaceId));

  const [membersResult] = await db
    .select({ value: count() })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId));

  const docIds = await db
    .select({ id: docEntries.id })
    .from(docEntries)
    .where(eq(docEntries.workspaceId, workspaceId));

  const docIdList = docIds.map((d) => d.id);

  let docStorageBytes = 0;
  if (docIdList.length > 0) {
    const [docAtt] = await db
      .select({ total: sql<number>`coalesce(sum(${docAttachments.fileSize}), 0)` })
      .from(docAttachments)
      .where(inArray(docAttachments.docId, docIdList));
    docStorageBytes = Number(docAtt?.total ?? 0);
  }

  const boardIds = await db
    .select({ id: kanbanBoards.id })
    .from(kanbanBoards)
    .where(eq(kanbanBoards.workspaceId, workspaceId));

  let cardStorageBytes = 0;
  if (boardIds.length > 0) {
    const cards = await db
      .select({ id: kanbanCards.id })
      .from(kanbanCards)
      .where(
        inArray(
          kanbanCards.boardId,
          boardIds.map((b) => b.id)
        )
      );
    const cardIdList = cards.map((c) => c.id);
    if (cardIdList.length > 0) {
      const [cardAtt] = await db
        .select({ total: sql<number>`coalesce(sum(${cardAttachments.fileSize}), 0)` })
        .from(cardAttachments)
        .where(inArray(cardAttachments.cardId, cardIdList));
      cardStorageBytes = Number(cardAtt?.total ?? 0);
    }
  }

  const storageBytes = docStorageBytes + cardStorageBytes;
  const storageMb = Math.round((storageBytes / (1024 * 1024)) * 100) / 100;

  return {
    boards: boardsResult?.value ?? 0,
    docs: docsResult?.value ?? 0,
    members: membersResult?.value ?? 0,
    storageMb,
    storageBytes,
  };
}

export type LimitResource = "boards" | "docEntries" | "members" | "storageMb";

export async function checkPlanLimit(
  workspaceId: string,
  resource: LimitResource,
  increment = 1
): Promise<{ allowed: boolean; message?: string; plan: PlanId }> {
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });
  if (!workspace) {
    return { allowed: false, message: "Workspace não encontrado", plan: "free" };
  }

  if (isTrialExpired(workspace)) {
    const activeSub = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.workspaceId, workspaceId),
        inArray(subscriptions.status, ["active", "trialing"])
      ),
    });
    if (!activeSub) {
      return {
        allowed: false,
        plan: workspace.plan as PlanId,
        message: "O trial gratuito de 30 dias da sua organização terminou. Assine o plano Enterprise para continuar.",
      };
    }
  }

  const plan = getPlanConfig(workspace.plan);
  const usage = await getWorkspaceUsage(workspaceId);

  const limitMap: Record<LimitResource, number> = {
    boards: plan.limits.boards,
    docEntries: plan.limits.docEntries,
    members: plan.limits.members,
    storageMb: plan.limits.storageMb,
  };

  const usedMap: Record<LimitResource, number> = {
    boards: usage.boards,
    docEntries: usage.docs,
    members: usage.members,
    storageMb: usage.storageMb,
  };

  const limit = limitMap[resource];
  const used = usedMap[resource];

  if (!isWithinLimit(used + increment - 1, limit)) {
    const labels: Record<LimitResource, string> = {
      boards: "boards Kanban",
      docEntries: "documentações",
      members: "membros",
      storageMb: "armazenamento",
    };
    return {
      allowed: false,
      plan: workspace.plan as PlanId,
      message: `Limite do plano ${plan.name} atingido para ${labels[resource]}. Faça upgrade para continuar.`,
    };
  }

  return { allowed: true, plan: workspace.plan as PlanId };
}
