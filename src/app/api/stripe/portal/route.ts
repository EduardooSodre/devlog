import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createBillingPortalSession, getOrCreateStripeCustomer } from "@/lib/stripe";
import { getActiveWorkspace } from "@/lib/workspace";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ctx = await getActiveWorkspace(session.user.id);
    if (!ctx) {
      return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 });
    }

    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.workspaceId, ctx.workspace.id),
    });

    const customerId =
      sub?.stripeCustomerId ??
      (await getOrCreateStripeCustomer(
        session.user.email,
        ctx.workspace.id,
        ctx.workspace.name
      ));

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const portal = await createBillingPortalSession(
      customerId,
      `${baseUrl}/settings/billing`
    );

    return NextResponse.json({ url: portal.url });
  } catch (error) {
    console.error("[POST /api/stripe/portal]", error);
    return NextResponse.json({ error: "Erro ao abrir portal" }, { status: 500 });
  }
}
