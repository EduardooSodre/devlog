/**
 * Convites de workspace — criar, aceitar e aceitar automaticamente.
 *
 * "Automático" aqui tem três caminhos, pra ninguém precisar reenviar convite:
 * 1. Clicou no link do e-mail logado com o mesmo e-mail → aceita sozinho ao abrir.
 * 2. Clicou no link sem conta → cria a conta já com o e-mail preenchido e volta pro
 *    link, que aceita sozinho.
 * 3. Nunca clicou no link, mas entrou no app com identidade verificada (Google/GitHub,
 *    ou e-mail confirmado) → `acceptPendingInvitesForUser` aceita tudo que estava pendente.
 */
import { db } from "@/lib/db";
import {
  workspaceInvites,
  workspaceMembers,
  departmentMembers,
  boardMembers,
  workspaces,
  users,
  accounts,
} from "@/lib/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sendMail, escapeHtml } from "@/lib/mail";
import { notifyUser } from "@/lib/notify";
import { onMemberJoined } from "@/lib/members";

const INVITE_TTL_DAYS = 7;

type Invite = typeof workspaceInvites.$inferSelect;

export function inviteUrlFor(token: string): string {
  const baseUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${baseUrl}/invite/${token}`;
}

/**
 * Cria o convite — ou, se já existe um pendente pra esse e-mail neste workspace,
 * renova a validade e reenvia o mesmo link (em vez de empilhar convites duplicados).
 */
export async function createOrRefreshInvite(opts: {
  workspaceId: string;
  email: string;
  role?: "admin" | "member";
  departmentId?: string;
  boardId?: string;
  invitedById: string;
  inviterName: string;
}): Promise<{ invite: Invite; inviteUrl: string; emailSent: boolean }> {
  const email = opts.email.trim().toLowerCase();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);

  const pending = await db.query.workspaceInvites.findFirst({
    where: and(
      eq(workspaceInvites.workspaceId, opts.workspaceId),
      eq(workspaceInvites.email, email),
      isNull(workspaceInvites.acceptedAt)
    ),
  });

  let invite: Invite;
  if (pending) {
    [invite] = await db
      .update(workspaceInvites)
      .set({
        expiresAt,
        departmentId: opts.departmentId ?? pending.departmentId,
        boardId: opts.boardId ?? pending.boardId,
        role: opts.role ?? pending.role,
      })
      .where(eq(workspaceInvites.id, pending.id))
      .returning();
  } else {
    [invite] = await db
      .insert(workspaceInvites)
      .values({
        workspaceId: opts.workspaceId,
        departmentId: opts.departmentId,
        boardId: opts.boardId,
        email,
        role: opts.role ?? "member",
        token: nanoid(32),
        invitedById: opts.invitedById,
        expiresAt,
      })
      .returning();
  }

  const workspace = await db.query.workspaces.findFirst({ where: eq(workspaces.id, opts.workspaceId) });
  const inviteUrl = inviteUrlFor(invite.token);
  // Texto livre (nome do convidador/workspace) — escapado contra injeção de HTML no e-mail.
  const emailSent = await sendMail({
    to: email,
    subject: `${opts.inviterName} te convidou para ${workspace?.name ?? "o DevLog"}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Você foi convidado(a)!</h2>
        <p><strong>${escapeHtml(opts.inviterName)}</strong> te convidou para participar de <strong>${escapeHtml(workspace?.name ?? "")}</strong> no DevLog.</p>
        <p style="margin: 24px 0;">
          <a href="${inviteUrl}" style="background:#4f6ef7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Aceitar convite</a>
        </p>
        <p style="color:#888;font-size:12px;">Ainda não tem conta? O link já leva pro cadastro. Expira em ${INVITE_TTL_DAYS} dias.</p>
      </div>
    `,
  });

  return { invite, inviteUrl, emailSent };
}

/** Efetiva o convite pra `userId`: workspace, departamento e board do convite. */
export async function acceptInvite(invite: Invite, userId: string): Promise<void> {
  const alreadyMember = await db.query.workspaceMembers.findFirst({
    where: and(eq(workspaceMembers.workspaceId, invite.workspaceId), eq(workspaceMembers.userId, userId)),
  });
  if (!alreadyMember) {
    await db.insert(workspaceMembers).values({ workspaceId: invite.workspaceId, userId, role: invite.role });
  }

  if (invite.departmentId) {
    await db
      .insert(departmentMembers)
      .values({ departmentId: invite.departmentId, userId })
      .onConflictDoNothing();
  }
  if (invite.boardId) {
    await db
      .insert(boardMembers)
      .values({ boardId: invite.boardId, userId, addedById: invite.invitedById })
      .onConflictDoNothing();
  }

  await db.update(workspaceInvites).set({ acceptedAt: new Date() }).where(eq(workspaceInvites.id, invite.id));

  if (!alreadyMember) await onMemberJoined(invite.workspaceId, userId);

  const accepted = await db.query.users.findFirst({ where: eq(users.id, userId) });
  await notifyUser(invite.invitedById, {
    title: "Convite aceito",
    body: `${accepted?.name ?? accepted?.email ?? "Alguém"} entrou pelo seu convite`,
    url: "/settings",
  });
}

export async function findValidInviteByToken(token: string) {
  return db.query.workspaceInvites.findFirst({
    where: and(
      eq(workspaceInvites.token, token),
      isNull(workspaceInvites.acceptedAt),
      gt(workspaceInvites.expiresAt, new Date())
    ),
  });
}

/**
 * Aceita todos os convites pendentes do e-mail do usuário — só se a identidade dele
 * estiver provada (login OAuth ou e-mail confirmado). Cadastro por senha sem
 * confirmação não prova dono do e-mail: aceitar aqui deixaria qualquer um "herdar" um
 * convite só digitando o e-mail convidado no cadastro. Esse caso segue pelo link do
 * convite (o token no link é a prova de que a pessoa recebeu o e-mail).
 */
export async function acceptPendingInvitesForUser(userId: string): Promise<number> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return 0;

  // Roda a cada abertura do app (layout do dashboard) — a busca de convites vem antes
  // da checagem de identidade porque quase sempre volta vazia, e aí para por aqui.
  const pending = await db.query.workspaceInvites.findMany({
    where: and(
      eq(workspaceInvites.email, user.email.toLowerCase()),
      isNull(workspaceInvites.acceptedAt),
      gt(workspaceInvites.expiresAt, new Date())
    ),
    with: { workspace: { columns: { name: true } } },
  });
  if (pending.length === 0) return 0;

  const hasOAuth = await db.query.accounts.findFirst({ where: eq(accounts.userId, userId) });
  if (!user.emailVerified && !hasOAuth) return 0;

  for (const invite of pending) {
    await acceptInvite(invite, userId);
    await notifyUser(userId, {
      title: `Você entrou em ${invite.workspace.name}`,
      body: "Troque de workspace no topo da barra lateral pra ver os projetos.",
      url: "/projetos",
    });
  }
  return pending.length;
}
