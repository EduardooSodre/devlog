/**
 * Envio de e-mail via Gmail SMTP (nodemailer) — usado hoje só pra convites de workspace.
 * Precisa de uma senha de app do Gmail (não a senha normal da conta): myaccount.google.com
 * → Segurança → Verificação em duas etapas → Senhas de app.
 */

import nodemailer from "nodemailer";

/** Escapa valores interpolados em HTML de e-mail — nome de usuário e nomes de
 * workspace/departamento são texto livre definido pelo próprio usuário, então
 * entram em `sendMail({ html })` sem escape nenhum se o chamador não cuidar disso. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const BRAND = "#4f6ef7";
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Botão "à prova de Outlook": <td> com bgcolor em vez de padding no <a> (o Outlook
 * desktop ignora padding/border-radius em link). Embaixo vai o link em texto puro — se
 * o cliente desativar links (ex.: mensagem caiu em Lixo Eletrônico), dá pra copiar. */
export function emailButton(url: string, label: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 20px;">
      <tr>
        <td align="center" bgcolor="${BRAND}" style="border-radius:10px;">
          <a href="${url}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:${FONT};font-size:15px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;border-radius:10px;">${label}</a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 4px;font-size:12px;color:#8a8f98;">Se o botão não funcionar, copie e cole no navegador:</p>
    <p style="margin:0;font-size:12px;word-break:break-all;"><a href="${url}" style="color:${BRAND};">${url}</a></p>
  `;
}

/** Moldura comum de todo e-mail (cabeçalho com a marca, cartão branco, rodapé).
 * Aplicada dentro de `sendMail`, então nenhum chamador precisa lembrar dela. */
export function emailLayout(content: string): string {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#f4f5f7;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f4f5f7">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;">
        <tr><td style="padding:0 4px 20px;font-family:${FONT};font-size:18px;font-weight:700;color:#111827;">
          <span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;border-radius:8px;background:${BRAND};color:#fff;font-size:15px;margin-right:8px;">D</span>DevLog
        </td></tr>
        <tr><td bgcolor="#ffffff" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:32px;font-family:${FONT};font-size:15px;line-height:1.6;color:#374151;">
          ${content}
        </td></tr>
        <tr><td style="padding:20px 4px 0;font-family:${FONT};font-size:12px;line-height:1.5;color:#9ca3af;text-align:center;">
          Você recebeu este e-mail porque tem uma conta ou um convite no DevLog.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Versão texto puro (multipart): melhora a entrega — e-mail só-HTML pontua como spam. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(style|head)[\s\S]*?<\/\1>/gi, "")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => {
      const text = label.replace(/<[^>]+>/g, "").trim();
      return text === href ? href : `${text}: ${href}`;
    })
    .replace(/<\/(p|h\d|div|tr|li)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

let transporter:ReturnType<typeof nodemailer.createTransport> | null = null;

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
      // Remove quebras de linha — texto livre (nome do convidador, do workspace) cai
      // aqui, e CR/LF num header SMTP permite injetar headers extras (ex.: Bcc: oculto).
      subject: opts.subject.replace(/[\r\n]+/g, " "),
      html: emailLayout(opts.html),
      text: htmlToText(opts.html),
    });
    return true;
  } catch (error) {
    console.error("[mail] Falha ao enviar e-mail", error);
    return false;
  }
}
