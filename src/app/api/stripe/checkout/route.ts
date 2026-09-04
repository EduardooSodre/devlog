import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createCheckoutSession, getOrCreateStripeCustomer } from "@/lib/stripe";
import { PLANS } from "@/lib/plans";
import { getActiveWorkspace, verifyWorkspaceAccess } from "@/lib/workspace";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    let workspaceId = body.workspaceId as string | undefined;
    const targetPlan = body.plan === "enterprise" ? "enterprise" : "pro";

    if (workspaceId) {
      const member = await verifyWorkspaceAccess(session.user.id, workspaceId);
      if (!member) {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
      }
    } else {
      const ctx = await getActiveWorkspace(session.user.id);
      workspaceId = ctx?.workspaceId;
    }

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 });
    }

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 });
    }

    const priceId = PLANS[targetPlan].stripePriceId;
    if (!priceId) {
      const envVar = targetPlan === "enterprise" ? "STRIPE_ENTERPRISE_MONTHLY_PRICE_ID" : "STRIPE_PRO_MONTHLY_PRICE_ID";
      return NextResponse.json(
        { error: `Stripe não configurado. Defina ${envVar}.` },
        { status: 503 }
      );
    }

    const customerId = await getOrCreateStripeCustomer(
      session.user.email,
      workspace.id,
      workspace.name
    );

    // Enterprise é cobrado por assento (R$30/funcionário) — a quantidade acompanha o
    // número atual de membros do workspace automaticamente.
    let quantity = 1;
    if (targetPlan === "enterprise") {
      const [{ value }] = await db
        .select({ value: count() })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, workspace.id));
      quantity = Math.max(1, value);
    }

    const baseUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const checkout = await createCheckoutSession({
      customerId,
      priceId,
      workspaceId: workspace.id,
      successUrl: `${baseUrl}/settings/billing?success=1`,
      cancelUrl: `${baseUrl}/settings/billing?canceled=1`,
      quantity,
      plan: targetPlan,
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error("[POST /api/stripe/checkout]", error);
    return NextResponse.json({ error: "Erro ao criar checkout" }, { status: 500 });
  }
}
