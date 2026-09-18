/**
 * Solicitação de entrada em departamento — compartilhado entre o onboarding e a rota
 * dedicada de join-requests, pra não duplicar a mesma checagem+notificação nos dois lugares.
 */
import { db } from "@/lib/db";
import { departmentMembers, departmentJoinRequests, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { notifyUser } from "@/lib/notify";
import { escapeHtml } from "@/lib/mail";

export type JoinDepartmentResult = "joined" | "requested" | "already_pending" | "already_member";

/**
 * Se `userId` já é o criador do departamento, entra direto. Caso contrário, abre (ou
 * reaproveita) uma solicitação pendente e notifica o criador por push + e-mail.
 */
export async function joinOrRequestDepartment(
  dept: { id: string; name: string; createdById: string },
  userId: string
): Promise<JoinDepartmentResult> {
  const already = await db.query.departmentMembers.findFirst({
    where: and(eq(departmentMembers.departmentId, dept.id), eq(departmentMembers.userId, userId)),
  });
  if (already) return "already_member";

  if (dept.createdById === userId) {
    await db.insert(departmentMembers).values({ departmentId: dept.id, userId });
    return "joined";
  }

  const existingPending = await db.query.departmentJoinRequests.findFirst({
    where: and(
      eq(departmentJoinRequests.departmentId, dept.id),
      eq(departmentJoinRequests.userId, userId),
      eq(departmentJoinRequests.status, "pending")
    ),
  });
  if (existingPending) return "already_pending";

  await db.insert(departmentJoinRequests).values({ departmentId: dept.id, userId });

  const requester = await db.query.users.findFirst({ where: eq(users.id, userId) });
  const creator = await db.query.users.findFirst({ where: eq(users.id, dept.createdById) });
  const requesterName = requester?.name ?? requester?.email ?? "Alguém";

  if (creator) {
    await notifyUser(creator.id, {
      title: "Novo pedido de entrada",
      body: `${requesterName} quer entrar no departamento ${dept.name}`,
      url: "/settings",
      email: {
        subject: `${requesterName} pediu para entrar no departamento ${dept.name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>Pedido de entrada</h2>
            <p><strong>${escapeHtml(requesterName)}</strong> pediu para entrar no departamento <strong>${escapeHtml(dept.name)}</strong>.</p>
            <p>Acesse Configurações → Departamentos no DevLog para aprovar ou recusar.</p>
          </div>
        `,
      },
    });
  }

  return "requested";
}
