/**
 * GET    /api/reports/saved/[id] — devolve o relatório salvo (mesmo formato da geração)
 * DELETE /api/reports/saved/[id] — apaga o relatório salvo
 * Só o dono enxerga/apaga: o filtro por userId da sessão vale pros dois.
 */

import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { savedReports } from "@/lib/db/schema";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const row = await db.query.savedReports.findFirst({
    where: and(eq(savedReports.id, id), eq(savedReports.userId, session.user.id)),
    columns: { payload: true },
  });
  if (!row) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json(row.payload);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  await db.delete(savedReports).where(and(eq(savedReports.id, id), eq(savedReports.userId, session.user.id)));
  return NextResponse.json({ success: true });
}
