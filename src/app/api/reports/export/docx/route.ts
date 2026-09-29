/**
 * POST /api/reports/export/docx — recebe o mesmo payload devolvido por
 * /api/reports/generate (não recalcula nada, não chama IA de novo) e devolve o
 * arquivo .docx pronto pra download.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { buildReportDocx } from "@/lib/reports-word";

const cardSchema = z.object({
  id: z.string(),
  title: z.string(),
  boardName: z.string(),
  priority: z.string(),
  difficulty: z.string(),
  status: z.string(),
  description: z.string(),
  completionNotes: z.string().nullable(),
  startDate: z.string().nullable(),
  completedAt: z.string().nullable(),
  dueDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  subtasks: z.array(z.object({ title: z.string(), isDone: z.boolean() })),
});

const bodySchema = z.object({
  data: z.object({
    period: z.object({ start: z.string(), end: z.string() }),
    stats: z.object({ completed: z.number(), inProgress: z.number(), docs: z.number() }),
    completedCards: z.array(cardSchema),
    inProgressCards: z.array(cardSchema),
    docs: z.array(
      z.object({ id: z.string(), title: z.string(), type: z.string(), summary: z.string().nullable(), content: z.string(), createdAt: z.string() })
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

  const buffer = await buildReportDocx(parsed.data);
  const { start, end } = parsed.data.data.period;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="relatorio_${start}_a_${end}.docx"`,
    },
  });
}
