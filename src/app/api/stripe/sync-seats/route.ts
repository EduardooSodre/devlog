/**
 * POST /api/stripe/sync-seats { workspaceId } — o dono alinha os assentos cobrados com o
 * número real de pessoas (ex.: membros adicionados por script/seed, que não passam pelo
 * fluxo de entrada). A Stripe gera a cobrança/crédito proporcional aos dias restantes.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { syncSeatQuantity, getSeatSubscription } from "@/lib/stripe";

const schema = z.object({ workspaceId: z.string().min(1) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "workspaceId inválido" }, { status: 400 });

  const member = await verifyWorkspaceAccess(session.user.id, parsed.data.workspaceId);
  if (member?.role !== "owner") {
    return NextResponse.json({ error: "Só o responsável pelo pagamento pode ajustar a cobrança" }, { status: 403 });
  }

  await syncSeatQuantity(parsed.data.workspaceId);
  const seat = await getSeatSubscription(parsed.data.workspaceId);
  if (!seat) return NextResponse.json({ error: "Nenhuma assinatura ativa na Stripe para ajustar" }, { status: 404 });

  return NextResponse.json({ success: true, billedSeats: seat.billedSeats });
}
