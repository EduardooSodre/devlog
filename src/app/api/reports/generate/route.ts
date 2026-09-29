/**
 * POST /api/reports/generate — monta os dados do relatório de trabalho do usuário
 * logado no período pedido e, opcionalmente, um resumo com IA (limitado a N/dia,
 * checado no servidor — ver src/lib/ai-report-limit.ts). Nunca falha por causa do
 * limite de IA: se já foi usado hoje, devolve o relatório normalmente sem IA.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, workspaces, savedReports } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { getReportData } from "@/lib/reports";
import { isOpenAiConfigured, generateWorkReportSummary } from "@/lib/openai";
import { claimAiReportSlot, releaseAiReportSlot, getAiReportStatus } from "@/lib/ai-report-limit";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");

const bodySchema = z.object({
  workspaceId: z.string(),
  start: dateStr,
  end: dateStr,
  useAI: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { workspaceId, start, end, useAI } = parsed.data;

  if (start > end) {
    return NextResponse.json({ error: "Período inválido" }, { status: 400 });
  }
  if (!(await verifyWorkspaceAccess(session.user.id, workspaceId))) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const [data, user, workspace] = await Promise.all([
    getReportData({ userId: session.user.id, workspaceId, start, end }),
    db.query.users.findFirst({ where: eq(users.id, session.user.id), columns: { name: true, jobTitle: true } }),
    db.query.workspaces.findFirst({ where: eq(workspaces.id, workspaceId), columns: { name: true } }),
  ]);

  let aiSummary: string | null = null;
  let aiUsed = false;

  if (useAI && isOpenAiConfigured()) {
    const claim = await claimAiReportSlot(session.user.id, workspaceId);
    if (claim) {
      try {
        aiSummary = await generateWorkReportSummary({ jobTitle: user?.jobTitle ?? null, userName: user?.name ?? null, data });
        aiUsed = true;
      } catch (error) {
        console.error("[reports/generate] IA falhou, liberando slot", error);
        await releaseAiReportSlot(claim.id);
      }
    }
  }

  const aiStatus = isOpenAiConfigured() ? await getAiReportStatus(session.user.id) : { limit: 0, usedToday: 0, remaining: 0 };

  const meta = { userName: user?.name ?? null, workspaceName: workspace?.name ?? "" };

  // Guarda o relatório pra reabrir depois. Falha ao salvar não derruba a geração.
  let savedId: string | null = null;
  try {
    const [row] = await db
      .insert(savedReports)
      .values({ userId: session.user.id, workspaceId, periodStart: start, periodEnd: end, aiUsed, payload: { data, meta, aiSummary } })
      .returning({ id: savedReports.id });
    savedId = row.id;
  } catch (error) {
    console.error("[reports/generate] não salvou o relatório", error);
  }

  return NextResponse.json({ data, meta, aiSummary, aiUsed, aiRemainingToday: aiStatus.remaining, savedId });
}
