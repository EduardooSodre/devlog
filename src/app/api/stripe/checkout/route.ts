import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createCheckoutSession, getOrCreateStripeCustomer } from "@/lib/stripe";
import { PLANS } from "@/lib/plans";
import { getActiveWorkspace, verifyWorkspaceAccess } from "@/lib/workspace";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    let workspaceId = body.workspaceId as string | undefined;

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

    const priceId = PLANS.pro.stripePriceId;
    if (!priceId) {
      return NextResponse.json(
        { error: "Stripe não configurado. Defina STRIPE_PRO_MONTHLY_PRICE_ID." },
        { status: 503 }
      );
    }

    const customerId = await getOrCreateStripeCustomer(
      session.user.email,
      workspace.id,
      workspace.name
    );

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const checkout = await createCheckoutSession({
      customerId,
      priceId,
      workspaceId: workspace.id,
      successUrl: `${baseUrl}/settings/billing?success=1`,
      cancelUrl: `${baseUrl}/settings/billing?canceled=1`,
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error("[POST /api/stripe/checkout]", error);
    return NextResponse.json({ error: "Erro ao criar checkout" }, { status: 500 });
  }
}
