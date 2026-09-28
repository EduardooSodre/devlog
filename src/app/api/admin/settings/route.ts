/**
 * GET/PUT /api/admin/settings — configuração ajustável pelo super admin (hoje só o
 * limite diário de relatórios com IA). Protegida por isSuperAdmin, não por role de
 * workspace — é config do SaaS inteiro.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/super-admin";
import { getAiReportDailyLimit, setAiReportDailyLimit } from "@/lib/ai-report-limit";

async function requireSuperAdmin() {
  const session = await auth();
  if (!isSuperAdmin(session?.user?.email)) return null;
  return session!;
}

export async function GET() {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const aiReportDailyLimit = await getAiReportDailyLimit();
  return NextResponse.json({ aiReportDailyLimit });
}

const bodySchema = z.object({ aiReportDailyLimit: z.number().int().min(1).max(100) });

export async function PUT(req: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await setAiReportDailyLimit(parsed.data.aiReportDailyLimit, session.user.email!);
  return NextResponse.json({ ok: true });
}
