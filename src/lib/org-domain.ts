/**
 * Licenciamento por organização — agrupa cadastros do mesmo domínio de e-mail
 * corporativo num único workspace "mestre", com trial de 30 dias.
 *
 * Domínios de webmail pessoal (gmail, hotmail, etc.) ficam de fora: cada
 * cadastro nesses domínios continua ganhando seu próprio workspace pessoal,
 * como sempre — misturar estranhos que só compartilham "@gmail.com" no mesmo
 * workspace seria um vazamento de dados entre contas completamente alheias.
 */

import { db } from "@/lib/db";
import { workspaces, workspaceMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { slugify } from "@/lib/utils";
import freeEmailDomains from "free-email-domains";
import disposableEmailDomains from "disposable-email-domains";

// Listas mantidas por terceiros (gmail/outlook/etc. + provedores descartáveis tipo
// mailinator) em vez de uma lista própria — cobre muito mais provedores regionais e
// evita falso-positivo de domínio "empresarial" que na verdade é webmail pessoal ou
// e-mail temporário, que é exatamente o tipo de coisa que gera erro de sincronização
// no agrupamento por organização.
const PUBLIC_EMAIL_DOMAINS = new Set([...freeEmailDomains, ...disposableEmailDomains]);

const TRIAL_DAYS = 30;

export function getEmailDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase().trim() ?? "";
}

export function isCompanyDomain(domain: string): boolean {
  return domain.length > 0 && !PUBLIC_EMAIL_DOMAINS.has(domain);
}

/**
 * Resolve (ou cria) o workspace em que um usuário recém-cadastrado deve entrar.
 * - Domínio pessoal (gmail, etc.) → sempre cria um workspace novo (comportamento de sempre).
 * - Domínio corporativo já com workspace mestre → adiciona o usuário como membro.
 * - Domínio corporativo sem workspace ainda → cria o workspace mestre em trial de 30 dias.
 *
 * `verifiedEmail` é obrigatório e precisa vir de uma fonte que realmente provou que o
 * usuário é dono do endereço (ex.: OAuth do GitHub/Google). Sem isso, qualquer pessoa
 * poderia digitar "alguem@empresa-alheia.com" no cadastro por e-mail/senha — que não
 * verifica e-mail — e ou entrar direto no workspace de uma empresa real, ou (pior)
 * cadastrar-se primeiro e virar "owner" do workspace mestre daquele domínio antes de
 * qualquer funcionário de verdade. Por isso o cadastro por credenciais sempre cai no
 * workspace pessoal, e o agrupamento por domínio fica restrito ao login OAuth.
 */
export async function resolveSignupWorkspace(
  userId: string,
  userName: string,
  email: string,
  verifiedEmail: boolean
) {
  const domain = getEmailDomain(email);

  if (verifiedEmail && isCompanyDomain(domain)) {
    const existing = await db.query.workspaces.findFirst({
      where: eq(workspaces.domain, domain),
    });

    if (existing) {
      await db.insert(workspaceMembers).values({
        workspaceId: existing.id,
        userId,
        role: "member",
      });
      // Cobrança por assento (R$30/funcionário) acompanha o time automaticamente.
      const { syncSeatQuantity } = await import("@/lib/stripe");
      await syncSeatQuantity(existing.id);
      return { workspace: existing, joinedExisting: true };
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    const orgName = domain.split(".")[0];
    const [workspace] = await db
      .insert(workspaces)
      .values({
        name: `${orgName.charAt(0).toUpperCase()}${orgName.slice(1)}`,
        slug: `${slugify(orgName)}-${userId.slice(0, 6)}`,
        ownerId: userId,
        plan: "enterprise",
        domain,
        trialEndsAt,
      })
      .returning();

    await db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId,
      role: "owner",
    });

    return { workspace, joinedExisting: false };
  }

  // Domínio pessoal — workspace individual, como sempre.
  const slug = slugify(userName || email.split("@")[0]);
  const [workspace] = await db
    .insert(workspaces)
    .values({
      name: `${userName}'s Workspace`,
      slug: `${slug}-${userId.slice(0, 6)}`,
      ownerId: userId,
      plan: "free",
    })
    .returning();

  await db.insert(workspaceMembers).values({
    workspaceId: workspace.id,
    userId,
    role: "owner",
  });

  return { workspace, joinedExisting: false };
}

/** Trial de organização vencido e sem plano pago ativo → acesso deve ser bloqueado. */
export function isTrialExpired(workspace: { trialEndsAt: Date | null; plan: string }): boolean {
  if (!workspace.trialEndsAt) return false;
  return workspace.trialEndsAt.getTime() < Date.now();
}
