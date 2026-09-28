/**
 * Efeitos colaterais de alguém entrar/sair de um workspace — em UM lugar, pra todo
 * caminho de entrada (convite aceito, auto-join por domínio, e-mail verificado) cobrar
 * e avisar igual: sincroniza os assentos no Stripe e avisa o dono (quem paga).
 */
import { db } from "@/lib/db";
import { workspaces, workspaceMembers, users } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { notifyUser } from "@/lib/notify";
import { escapeHtml } from "@/lib/mail";
import { PLANS } from "@/lib/plans";

export async function countMembers(workspaceId: string): Promise<number> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId));
  return value;
}

export async function onMemberJoined(workspaceId: string, newUserId: string): Promise<void> {
  const { syncSeatQuantity } = await import("@/lib/stripe");
  await syncSeatQuantity(workspaceId);

  const workspace = await db.query.workspaces.findFirst({ where: eq(workspaces.id, workspaceId) });
  if (!workspace || workspace.ownerId === newUserId) return;

  const newUser = await db.query.users.findFirst({ where: eq(users.id, newUserId) });
  const name = newUser?.name ?? newUser?.email ?? "Alguém";
  const seats = await countMembers(workspaceId);

  const perSeat = workspace.plan === "enterprise";
  const total = seats * PLANS.enterprise.priceMonthly;
  const billingLine = perSeat
    ? `Agora são ${seats} assentos — R$ ${total}/mês (R$ ${PLANS.enterprise.priceMonthly} por pessoa).`
    : `Agora são ${seats} membros.`;

  await notifyUser(workspace.ownerId, {
    title: `${name} entrou em ${workspace.name}`,
    body: billingLine,
    url: "/settings/billing",
    email: perSeat
      ? {
          subject: `Novo membro em ${workspace.name} — ${seats} assentos`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2>Novo membro na sua organização</h2>
              <p><strong>${escapeHtml(name)}</strong> entrou em <strong>${escapeHtml(workspace.name)}</strong>.</p>
              <p>${escapeHtml(billingLine)}</p>
              <p style="color:#888;font-size:12px;">Você recebe este aviso porque é o responsável pelo pagamento. Dá pra remover membros em Configurações › Membros.</p>
            </div>
          `,
        }
      : undefined,
  });
}

export async function onMemberRemoved(workspaceId: string): Promise<void> {
  const { syncSeatQuantity } = await import("@/lib/stripe");
  await syncSeatQuantity(workspaceId);
}
