/**
 * DevLog — OpenAI setup (resumo de relatório com IA)
 * Mesmo padrão de src/lib/stripe.ts: client lazy, erro claro se a env não estiver
 * configurada, pra rota de API poder checar `isOpenAiConfigured()` antes de tentar.
 */

import OpenAI from "openai";
import type { ReportData } from "@/lib/reports";

export function isOpenAiConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

let _openai: OpenAI | null = null;

function getOpenAiClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY não configurada");
  }
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

function formatPeriodLabel(start: string, end: string): string {
  return start === end ? `dia ${start}` : `período de ${start} a ${end}`;
}

/** Monta um resumo em texto simples (sem markdown) dos dados do relatório, pra
 * servir de contexto pro modelo — só o que existe no banco, nada inventado. */
const short = (t: string, n: number) => (t.length > n ? t.slice(0, n) + "…" : t);
const withDetails = (c: ReportData["completedCards"][number]) =>
  (c.description ? ` — descrição: ${short(c.description.replace(/\s+/g, " "), 300)}` : "") +
  (c.subtasks.length ? ` — subtarefas: ${c.subtasks.slice(0, 15).map((s) => `${s.isDone ? "feita" : "pendente"}: ${short(s.title, 80)}`).join("; ")}` : "");

function buildDataSummary(data: ReportData): string {
  const lines: string[] = [];

  lines.push(`Tarefas concluídas no período (${data.completedCards.length}):`);
  for (const c of data.completedCards) {
    lines.push(`- "${c.title}" [board: ${c.boardName}, prioridade: ${c.priority}, dificuldade: ${c.difficulty}]${c.completionNotes ? ` — obs: ${c.completionNotes}` : ""}${withDetails(c)}`);
  }
  if (data.completedCards.length === 0) lines.push("- (nenhuma)");

  lines.push("", `Tarefas em andamento (${data.inProgressCards.length}):`);
  for (const c of data.inProgressCards) {
    lines.push(`- "${c.title}" [board: ${c.boardName}, prioridade: ${c.priority}]${withDetails(c)}`);
  }
  if (data.inProgressCards.length === 0) lines.push("- (nenhuma)");

  lines.push("", `Documentações registradas no período (${data.docs.length}):`);
  for (const d of data.docs) {
    lines.push(`- "${d.title}" [tipo: ${d.type}]${d.summary ? ` — ${d.summary}` : ""}${d.content ? ` — conteúdo: ${short(d.content.replace(/\s+/g, " "), 300)}` : ""}`);
  }
  if (data.docs.length === 0) lines.push("- (nenhuma)");

  return lines.join("\n");
}

export async function generateWorkReportSummary({
  jobTitle,
  userName,
  data,
}: {
  jobTitle: string | null;
  userName: string | null;
  data: ReportData;
}): Promise<string> {
  const client = getOpenAiClient();
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const role = jobTitle?.trim() || "profissional de tecnologia";
  const periodLabel = formatPeriodLabel(data.period.start, data.period.end);

  const systemPrompt =
    `Você ajuda um(a) ${role} a resumir o próprio trabalho para o gestor dele(a). ` +
    `Escreva em português do Brasil, em tom profissional e direto, adaptando o vocabulário à função de ${role}. ` +
    `Use SOMENTE as informações fornecidas — nunca invente entregas, números ou detalhes que não estejam nos dados. ` +
    `Estruture como: um parágrafo curto de abertura, seguido de bullet points agrupando as principais entregas por tema/impacto, ` +
    `e uma frase final sobre o que está em andamento. Seja objetivo, sem enrolação.`;

  const userPrompt =
    `Nome: ${userName ?? "não informado"}\nPeríodo do relatório: ${periodLabel}\n\n${buildDataSummary(data)}`;

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
    max_tokens: 900,
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI não retornou conteúdo");
  return text;
}
