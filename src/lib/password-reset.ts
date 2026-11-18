/**
 * "Esqueci a senha" — reaproveita `verificationTokens` (mesma tabela da verificação de
 * e-mail) com identifier prefixado `reset:` pra não colidir com o token de verificação,
 * que é apagado por identifier = e-mail. No banco fica só o SHA-256 do token: quem lê a
 * tabela não consegue usar o link.
 */
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { users, verificationTokens } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { sendMail, escapeHtml } from "@/lib/mail";

const TOKEN_TTL_MINUTES = 60;
const COOLDOWN_MINUTES = 1;
const PREFIX = "reset:";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Silencioso quando o e-mail não existe — a resposta não pode revelar quem tem conta. */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) return;

  const identifier = PREFIX + user.email;

  // Anti-spam: no máximo 1 e-mail por minuto por conta. A tabela só tem `expires`,
  // então "criado há menos de 1 min" = expira depois de (agora + TTL - 1 min).
  const recent = await db.query.verificationTokens.findFirst({
    where: and(
      eq(verificationTokens.identifier, identifier),
      gt(verificationTokens.expires, new Date(Date.now() + (TOKEN_TTL_MINUTES - COOLDOWN_MINUTES) * 60_000)),
    ),
  });
  if (recent) return;

  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, identifier));

  const token = nanoid(32);
  const expires = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000);
  await db.insert(verificationTokens).values({ identifier, token: hashToken(token), expires });

  const baseUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password/${token}`;
  const firstName = escapeHtml((user.name ?? "").split(" ")[0] || "");

  await sendMail({
    to: user.email,
    subject: "Redefinir sua senha no DevLog",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Olá${firstName ? `, ${firstName}` : ""}!</h2>
        <p>Recebemos um pedido pra redefinir a senha da sua conta no DevLog.</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background:#4f6ef7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Redefinir senha</a>
        </p>
        <p style="color:#888;font-size:12px;">Este link expira em ${TOKEN_TTL_MINUTES} minutos e só funciona uma vez. Se não foi você, ignore este e-mail — sua senha continua a mesma.</p>
      </div>
    `,
  });
}

export type ResetPasswordResult = { ok: true } | { ok: false; error: string };

export async function resetPassword(token: string, password: string): Promise<ResetPasswordResult> {
  const record = await db.query.verificationTokens.findFirst({
    where: and(eq(verificationTokens.token, hashToken(token)), gt(verificationTokens.expires, new Date())),
  });
  if (!record || !record.identifier.startsWith(PREFIX)) {
    return { ok: false, error: "Link inválido ou expirado" };
  }

  const email = record.identifier.slice(PREFIX.length);
  const hashed = await bcrypt.hash(password, 12);
  const updated = await db
    .update(users)
    .set({ password: hashed })
    .where(eq(users.email, email))
    .returning({ id: users.id });

  // Uso único: apaga o token (e qualquer outro de reset desse e-mail).
  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, record.identifier));

  if (updated.length === 0) return { ok: false, error: "Usuário não encontrado" };
  return { ok: true };
}
