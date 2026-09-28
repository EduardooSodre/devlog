/**
 * DevLog — Stripe Setup
 * Docs: https://stripe.com/docs/billing/subscriptions
 */

import Stripe from "stripe";
import { PLANS, getPlanConfig } from "@/lib/plans";
import { db } from "@/lib/db";
import { subscriptions, workspaceMembers } from "@/lib/db/schema";
import { eq, and, count, inArray } from "drizzle-orm";

function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY não configurada");
  }
  return key;
}

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(getStripeSecretKey(), {
      apiVersion: "2024-04-10",
      typescript: true,
    });
  }
  return _stripe;
}

export { PLANS, getPlanConfig };

export async function getOrCreateStripeCustomer(
  email: string,
  workspaceId: string,
  workspaceName: string
): Promise<string> {
  const stripe = getStripe();
  const existing = await stripe.customers.list({ email, limit: 1 });

  if (existing.data.length > 0) {
    return existing.data[0].id;
  }

  const customer = await stripe.customers.create({
    email,
    name: workspaceName,
    metadata: { workspaceId },
  });

  return customer.id;
}

export async function createCheckoutSession({
  customerId,
  priceId,
  workspaceId,
  successUrl,
  cancelUrl,
  quantity = 1,
  plan,
}: {
  customerId: string;
  priceId: string;
  workspaceId: string;
  successUrl: string;
  cancelUrl: string;
  quantity?: number;
  plan: "pro" | "enterprise";
}) {
  const stripe = getStripe();
  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { workspaceId, plan },
    subscription_data: {
      metadata: { workspaceId, plan },
    },
    // Stripe Tax não está disponível para contas registradas no Brasil (erro
    // stripe_tax_inactive) — não cobre ICMS/ISS/PIS/COFINS mesmo nos países
    // suportados, então desativado não perde nada hoje. Ativar exige uma conta
    // Stripe registrada em país suportado (US, UE, UK, Canadá etc).
    tax_id_collection: { enabled: true },
    customer_update: { address: "auto", name: "auto" },
  });
}

/**
 * Sincroniza a quantidade de assentos (R$30/funcionário) da assinatura Enterprise no
 * Stripe com o número atual de membros do workspace. Chamado sempre que alguém entra
 * (auto-join por domínio ou convite aceito) — automático, sem intervenção manual.
 * Silenciosamente não faz nada se o Stripe não estiver configurado ou não houver
 * assinatura ativa: sincronizar cobrança nunca deve travar o fluxo de entrada no time.
 */
export async function syncSeatQuantity(workspaceId: string): Promise<void> {
  if (!process.env.STRIPE_SECRET_KEY) return;

  try {
    const sub = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.workspaceId, workspaceId),
        inArray(subscriptions.status, ["active", "trialing"])
      ),
    });
    if (!sub?.stripeSubscriptionId) return;

    const [{ value: memberCount }] = await db
      .select({ value: count() })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId));

    const stripe = getStripe();
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
    const item = stripeSub.items.data[0];
    if (!item || item.quantity === memberCount) return;

    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      items: [{ id: item.id, quantity: memberCount }],
      proration_behavior: "always_invoice",
    });
  } catch (error) {
    console.error("[syncSeatQuantity]", error);
  }
}

export type InvoiceSummary = {
  id: string;
  number: string | null;
  createdAt: Date;
  amount: number; // em reais
  status: string | null;
  pdfUrl: string | null;
  hostedUrl: string | null;
};

/**
 * Faturas já emitidas + a próxima cobrança prevista, pra área de pagamentos mostrar
 * "quanto vou pagar" e os PDFs pra quem fatura o pagamento na empresa. Retorna vazio
 * (sem quebrar a página) se o Stripe não estiver configurado ou der erro.
 */
export async function getBillingOverview(customerId: string): Promise<{
  invoices: InvoiceSummary[];
  upcoming: { amount: number; date: Date | null } | null;
}> {
  if (!process.env.STRIPE_SECRET_KEY) return { invoices: [], upcoming: null };
  const stripe = getStripe();

  let invoices: InvoiceSummary[] = [];
  try {
    const list = await stripe.invoices.list({ customer: customerId, limit: 24 });
    invoices = list.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      createdAt: new Date(inv.created * 1000),
      amount: inv.total / 100,
      status: inv.status,
      pdfUrl: inv.invoice_pdf ?? null,
      hostedUrl: inv.hosted_invoice_url ?? null,
    }));
  } catch (error) {
    console.error("[getBillingOverview] invoices", error);
  }

  let upcoming: { amount: number; date: Date | null } | null = null;
  try {
    const next = await stripe.invoices.retrieveUpcoming({ customer: customerId });
    upcoming = {
      amount: next.total / 100,
      date: next.next_payment_attempt ? new Date(next.next_payment_attempt * 1000) : null,
    };
  } catch {
    // Sem assinatura ativa não existe "próxima fatura" — normal, não é erro.
  }

  return { invoices, upcoming };
}

export async function createBillingPortalSession(customerId: string, returnUrl: string) {
  const stripe = getStripe();
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}
