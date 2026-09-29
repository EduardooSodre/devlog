/**
 * POST /api/reports/export/xlsx — recebe o mesmo payload devolvido por
 * /api/reports/generate (não recalcula nada, não chama IA de novo) e devolve o
 * arquivo .xlsx pronto pra download.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { buildReportWorkbook } from "@/lib/reports-excel";
import { formatDateOnly } from "@/lib/report-labels";

const cardSchema = z.object({
  id: z.string(),
  title: z.string(),
  boardName: z.string(),
  priority: z.string(),
  difficulty: z.string(),
  status: z.string(),
  description: z.string(),
  completionNotes: z.string().nullable(),
  startDate: z.coerce.date().nullable(),
  completedAt: z.coerce.date().nullable(),
  dueDate: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  subtasks: z.array(z.object({ title: z.string(), isDone: z.boolean() })),
});

const bodySchema = z.object({
  data: z.object({
    period: z.object({ start: z.string(), end: z.string() }),
    stats: z.object({ completed: z.number(), inProgress: z.number(), docs: z.number() }),
    completedCards: z.array(cardSchema),
    inProgressCards: z.array(cardSchema),
    docs: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        type: z.string(),
        summary: z.string().nullable(),
        content: z.string(),
        createdAt: z.coerce.date(),
      })
    ),
  }),
  meta: z.object({ userName: z.string().nullable(), workspaceName: z.string() }),
  aiSummary: z.string().nullable(),
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

  const { data, meta, aiSummary } = parsed.data;
  const buffer = await buildReportWorkbook(data, { userName: meta.userName, workspaceName: meta.workspaceName, aiSummary });

  const fileName = `relatorio_${formatDateOnly(data.period.start).replace(/\//g, "-")}_a_${formatDateOnly(data.period.end).replace(/\//g, "-")}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
