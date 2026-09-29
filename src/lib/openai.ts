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
    `Você escreve, em primeira pessoa, o relatório de trabalho de um(a) ${role} para o gestor dele(a), que NÃO entende de tecnologia. ` +
    `Escreva em português do Brasil, de um jeito tão simples que uma criança de 5 anos entenderia: frases curtas, palavras do dia a dia, uma ideia por frase. ` +
    `Diga o que foi FEITO e o que isso MUDOU na prática (o que ficou mais rápido, mais fácil, mais seguro ou o que voltou a funcionar). ` +
    `PROIBIDO usar jargão: nada de git, commit, deploy, build, merge, pull request, branch, API, refactor, bug, endpoint, banco de dados, nomes de arquivos, hashes, números de linhas ou de commits. ` +
    `Se um dado for técnico, traduza (ex.: "corrigi um erro que travava a tela de login" em vez de "fix no middleware"). ` +
    `Os nomes dos sistemas da empresa (ex.: Obralyse, RoshSign) podem aparecer, sempre com uma explicação curta do que o sistema faz, se isso estiver nos dados. ` +
    `Use SOMENTE as informações fornecidas — nunca invente entregas, números ou detalhes. Ignore estatísticas técnicas presentes nos dados. ` +
    `Junte itens parecidos: no máximo 10 tópicos. ` +
    `Formato, sem markdown (sem #, ** ou tabelas): ` +
    `1) uma frase de abertura com o resumo do período; ` +
    `2) a linha "O que eu fiz:" seguida de tópicos, cada um começando com "- " e terminando com o resultado prático; ` +
    `3) se houver, a linha "O que ainda estou fazendo:" com tópicos no mesmo estilo; ` +
    `4) uma frase final curta.`;

  const userPrompt =
    `Nome: ${userName ?? "não informado"}\nPeríodo do relatório: ${periodLabel}\n\n${buildDataSummary(data)}`;

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
    max_tokens: 1200,
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI não retornou conteúdo");
  return text;
}
