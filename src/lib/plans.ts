/**
 * Configuração central de planos — usada por billing, Stripe e enforcement de limites.
 */

export type PlanId = "free" | "pro" | "enterprise";

export const PLANS = {
  free: {
    id: "free" as const,
    name: "Gratuito",
    description: "Para uso pessoal",
    priceLabel: "R$ 0",
    priceMonthly: 0,
    stripePriceId: null as string | null,
    limits: {
      members: 1,
      boards: 1,
      docEntries: 50,
      storageMb: 100,
    },
    features: [
      "1 workspace",
      "1 board Kanban",
      "Até 50 documentações",
      "100 MB de armazenamento",
      "Uploads de imagens",
    ],
  },
  pro: {
    id: "pro" as const,
    name: "Pro",
    description: "Para equipes e uso profissional",
    priceLabel: "R$ 39/mês",
    priceMonthly: 39,
    stripePriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? null,
    limits: {
      members: 20,
      boards: Infinity,
      docEntries: Infinity,
      storageMb: 10240,
    },
    features: [
      "Workspaces ilimitados",
      "Boards ilimitados",
      "Documentações ilimitadas",
      "10 GB de armazenamento",
      "Exportar PDF/Markdown",
      "Suporte prioritário",
    ],
  },
  enterprise: {
    id: "enterprise" as const,
    name: "Enterprise",
    description: "Para organizações",
    priceLabel: "R$ 30/funcionário/mês",
    priceMonthly: 30,
    stripePriceId: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID ?? null,
    limits: {
      members: Infinity,
      boards: Infinity,
      docEntries: Infinity,
      storageMb: 51200,
    },
    features: [
      "Tudo do Pro",
      "Membros ilimitados — R$ 30/funcionário/mês, cobrado automaticamente",
      "SLA dedicado",
      "SSO (em breve)",
      "API pública avançada",
    ],
  },
} as const;

export function getPlanConfig(plan: string) {
  if (plan in PLANS) return PLANS[plan as PlanId];
  return PLANS.free;
}

export function isWithinLimit(used: number, limit: number): boolean {
  if (limit === Infinity || limit < 0) return true;
  return used < limit;
}
