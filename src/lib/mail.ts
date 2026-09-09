/**
 * Envio de e-mail via Gmail SMTP (nodemailer) — usado hoje só pra convites de workspace.
 * Precisa de uma senha de app do Gmail (não a senha normal da conta): myaccount.google.com
 * → Segurança → Verificação em duas etapas → Senhas de app.
 */

import nodemailer from "nodemailer";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (transporter) return transporter;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return transporter;
}

export async function sendMail(opts: { to: string; subject: string; html: string }): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    // Sem credenciais configuradas — não derruba o fluxo (o link de convite ainda
    // funciona via cópia manual), só não manda o e-mail.
    console.warn("[mail] GMAIL_USER/GMAIL_APP_PASSWORD não configurados — e-mail não enviado.");
    return false;
  }

  try {
    await t.sendMail({
      from: `DevLog <${process.env.GMAIL_USER}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    return true;
  } catch (error) {
    console.error("[mail] Falha ao enviar e-mail", error);
    return false;
  }
}
