/**
 * DevLog — Stripe Setup
 * Docs: https://stripe.com/docs/billing/subscriptions
 */

import Stripe from "stripe";
import { PLANS, getPlanConfig } from "@/lib/plans";

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
}: {
  customerId: string;
  priceId: string;
  workspaceId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const stripe = getStripe();
  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { workspaceId },
    subscription_data: {
      metadata: { workspaceId },
    },
  });
}

export async function createBillingPortalSession(customerId: string, returnUrl: string) {
  const stripe = getStripe();
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}
