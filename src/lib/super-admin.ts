/**
 * Acesso ao painel /admin — visão do SaaS inteiro (todos os workspaces), não de um
 * workspace específico. Lista de e-mails via env pra dar pra adicionar alguém sem
 * precisar mexer em código/deploy.
 */

const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS ?? "edduardooo2011@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isSuperAdmin(email: string | null | undefined): boolean {
  return !!email && SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}
