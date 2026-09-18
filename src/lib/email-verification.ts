/**
 * Verificação de e-mail para cadastro por senha — fecha o buraco descrito em
 * org-domain.ts: sem provar dono do e-mail, o cadastro por credenciais nunca agrupa
 * automaticamente por domínio corporativo. Depois que a pessoa clica no link e prova
 * que é dona daquele e-mail, promovemos o workspace dela pra "mestre" do domínio (se
 * for a primeira do domínio) ou a adicionamos no workspace mestre que já existe.
 *
 * Reaproveita `verificationTokens`, tabela do NextAuth já no schema — hoje sem uso real
 * porque nenhum provider "Email" (magic link) está configurado.
 */
import { db } from "@/lib/db";
import { users, workspaces, workspaceMembers, verificationTokens } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sendMail } from "@/lib/mail";
import { getEmailDomain, isCompanyDomain } from "@/lib/org-domain";
import { getUserWorkspaces, verifyWorkspaceAccess } from "@/lib/workspace";

const TOKEN_TTL_HOURS = 24;
const TRIAL_DAYS = 30;

export async function sendVerificationEmail(email: string, name: string): Promise<void> {
  // Remove tokens anteriores desse e-mail — só o link mais recente deve funcionar.
  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, email));

  const token = nanoid(32);
  const expires = new Date();
  expires.setHours(expires.getHours() + TOKEN_TTL_HOURS);

  await db.insert(verificationTokens).values({ identifier: email, token, expires });

  const baseUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const verifyUrl = `${baseUrl}/verify-email/${token}`;

  await sendMail({
    to: email,
    subject: "Confirme seu e-mail no DevLog",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Olá, ${name.split(" ")[0] || name}!</h2>
        <p>Confirme seu e-mail pra liberar o agrupamento automático com colegas da mesma empresa (se aplicável).</p>
        <p style="margin: 24px 0;">
          <a href="${verifyUrl}" style="background:#4f6ef7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Confirmar e-mail</a>
        </p>
        <p style="color:#888;font-size:12px;">Este link expira em ${TOKEN_TTL_HOURS}h. Se você não criou essa conta, ignore este e-mail.</p>
      </div>
    `,
  });
}

/**
 * Domínio corporativo já verificado: entra no workspace mestre existente, ou — se
 * ninguém desse domínio ainda tem um — promove o workspace pessoal atual da pessoa a
 * workspace mestre (em vez de criar um segundo workspace redundante).
 */
async function upgradeWorkspaceIfCorporate(userId: string, email: string): Promise<void> {
  const domain = getEmailDomain(email);
  if (!isCompanyDomain(domain)) return;

  const existing = await db.query.workspaces.findFirst({ where: eq(workspaces.domain, domain) });

  if (existing) {
    if (!(await verifyWorkspaceAccess(userId, existing.id))) {
      await db.insert(workspaceMembers).values({ workspaceId: existing.id, userId, role: "member" });
      const { syncSeatQuantity } = await import("@/lib/stripe");
      await syncSeatQuantity(existing.id);
    }
    return;
  }

  const memberships = await getUserWorkspaces(userId);
  const personal = memberships.find((m) => m.role === "owner" && !m.workspace.domain);
  if (!personal) return;

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  await db
    .update(workspaces)
    .set({ domain, plan: "enterprise", trialEndsAt })
    .where(eq(workspaces.id, personal.workspaceId));
}

export type VerifyEmailResult = { ok: true } | { ok: false; error: string };

export async function verifyEmailToken(token: string): Promise<VerifyEmailResult> {
  const record = await db.query.verificationTokens.findFirst({
    where: and(eq(verificationTokens.token, token), gt(verificationTokens.expires, new Date())),
  });
  if (!record) {
    return { ok: false, error: "Link inválido ou expirado" };
  }

  const user = await db.query.users.findFirst({ where: eq(users.email, record.identifier) });
  if (!user) {
    return { ok: false, error: "Usuário não encontrado" };
  }

  await db.update(users).set({ emailVerified: new Date() }).where(eq(users.id, user.id));
  await db.delete(verificationTokens).where(eq(verificationTokens.token, token));
  await upgradeWorkspaceIfCorporate(user.id, user.email);

  return { ok: true };
}
