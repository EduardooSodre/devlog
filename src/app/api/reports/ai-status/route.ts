/**
 * GET /api/reports/ai-status — quanto resta do limite diário de IA pro usuário
 * logado, e se a OpenAI está configurada (a UI esconde o toggle de IA se não).
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isOpenAiConfigured } from "@/lib/openai";
import { getAiReportStatus } from "@/lib/ai-report-limit";

export async function GET() {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const configured = isOpenAiConfigured();
  if (!configured) {
    return NextResponse.json({ configured: false, limit: 0, usedToday: 0, remaining: 0 });
  }

  const status = await getAiReportStatus(session.user.id);
  return NextResponse.json({ configured: true, ...status });
}
