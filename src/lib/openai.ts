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

const short = (t: string, n: number) => (t.length > n ? t.slice(0, n) + "…" : t);

/** Descrição do card sem o ruído técnico (período, repositório, contagem de commits/linhas, hashes). */
function cleanDescription(text: string): string {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !/^(Período|Repositório|Commits|O que foi entregue)\b/i.test(l) && !/commit\(s\)|\blinhas\b|\b[0-9a-f]{7}\s*$/i.test(l))
    .join(" ");
}

type AnyCard = ReportData["completedCards"][number];

function cardLine(c: AnyCard): string {
  const desc = cleanDescription(c.description);
  const subs = c.subtasks
    .slice(0, 12)
    .map((s) => short(s.title.replace(/^(feat|fix|chore|refactor|perf|test|style)(\([^)]*\))?:\s*/i, ""), 90))
    .join("; ");
  return (
    `- "${c.title}" [prioridade: ${c.priority}]` +
    (c.completionNotes ? ` — obs: ${c.completionNotes}` : "") +
    (desc ? ` — detalhes: ${short(desc, 350)}` : "") +
    (subs ? ` — passos: ${subs}` : "")
  );
}

/** Dados do relatório em texto, agrupados por projeto (board) — só o que existe no banco. */
function buildDataSummary(data: ReportData): string {
  const groupBy = (cards: AnyCard[]) => {
    const m = new Map<string, AnyCard[]>();
    for (const c of cards) m.set(c.boardName, [...(m.get(c.boardName) ?? []), c]);
    return [...m.entries()].map(([board, list]) => `Projeto ${board}:\n${list.map(cardLine).join("\n")}`).join("\n\n");
  };

  const lines: string[] = [];
  lines.push("ENTREGAS CONCLUÍDAS NO PERÍODO:", data.completedCards.length ? groupBy(data.completedCards) : "(nenhuma)");
  if (data.inProgressCards.length) lines.push("", "EM ANDAMENTO:", groupBy(data.inProgressCards));
  if (data.docs.length) {
    lines.push("", "DOCUMENTAÇÕES ESCRITAS:");
    for (const d of data.docs) lines.push(`- "${d.title}"${d.summary ? ` — ${d.summary}` : ""}${d.content ? ` — ${short(d.content.replace(/\s+/g, " "), 300)}` : ""}`);
  }
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
    `Você redige o resumo de trabalho de um(a) ${role} para o gestor dele(a), que NÃO é da área de tecnologia. ` +
    `Estilo: direto, prático e profissional. Português do Brasil, frases curtas, palavras simples, na primeira pessoa do passado ("Criei", "Corrigi", "Implantei"). ` +
    `Cada tópico diz O QUE foi feito e o RESULTADO prático, em no máximo 25 palavras. ` +
    `NÃO escreva opinião, sentimento, elogio ou frase de encerramento (nada de "estou feliz", "isso torna tudo melhor", "foi um mês produtivo"). ` +
    `NÃO escreva introdução genérica, NÃO cite números de tarefas/commits/linhas e NÃO crie seção para o que não existe (se nada está em andamento, omita). ` +
    `PROIBIDO jargão técnico: git, commit, deploy, build, merge, branch, API, refactor, bug, endpoint, banco de dados, arquivos, hashes. Traduza para o efeito prático ("corrigi a falha que travava o login"). ` +
    `Use SOMENTE as informações fornecidas; nunca invente. ` +
    `Agrupe por projeto, com no máximo 4 tópicos por projeto (junte itens parecidos, priorize o que mais importa para o negócio). ` +
    `FORMATO EXATO, sem nenhum outro texto e sem negrito: ` +
    `uma linha "## Nome do projeto" seguida de linhas começando com "- ". Se houver itens em andamento, use no fim "## Em andamento" com tópicos no mesmo estilo.`;

  const userPrompt = `Nome: ${userName ?? "não informado"}\nPeríodo: ${periodLabel}\n\n${buildDataSummary(data)}`;

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 1200,
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI não retornou conteúdo");
  return text;
}
