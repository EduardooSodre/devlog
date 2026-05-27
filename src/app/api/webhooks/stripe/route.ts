/**
 * POST /api/webhooks/stripe — Recebe eventos do Stripe
 *
 * Eventos tratados:
 *  - checkout.session.completed → ativa assinatura Pro
 *  - customer.subscription.updated → atualiza status
 *  - customer.subscription.deleted → downgrade para Free
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { subscriptions, workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook não configurado" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[Stripe Webhook] Assinatura inválida:", err);
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.metadata?.workspaceId;
        if (!workspaceId) break;

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

        await db
          .insert(subscriptions)
          .values({
            workspaceId,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer as string,
            stripePriceId: subscription.items.data[0].price.id,
            status: subscription.status as any,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          })
          .onConflictDoUpdate({
            target: subscriptions.stripeSubscriptionId,
            set: { status: subscription.status as any },
          });

        await db
          .update(workspaces)
          .set({ plan: "pro" })
          .where(eq(workspaces.id, workspaceId));
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const workspaceId = sub.metadata?.workspaceId;
        if (!workspaceId) break;

        await db
          .update(subscriptions)
          .set({
            status: sub.status as any,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.stripeSubscriptionId, sub.id));
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const workspaceId = sub.metadata?.workspaceId;
        if (!workspaceId) break;

        await db
          .update(subscriptions)
          .set({ status: "canceled", updatedAt: new Date() })
          .where(eq(subscriptions.stripeSubscriptionId, sub.id));

        await db
          .update(workspaces)
          .set({ plan: "free" })
          .where(eq(workspaces.id, workspaceId));
        break;
      }

      default:
        console.log(`[Stripe Webhook] Evento não tratado: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Erro ao processar evento:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
