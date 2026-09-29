/**
 * Seed: cria em /projetos os cards do trabalho de setembro/2026 (commits do Eduardo na org
 * Rosh-Participacoes), um card por ENTREGA, com cada commit como subtarefa concluída.
 *
 * Rodar:  npx tsx scripts/seed-setembro.ts          (dry-run, só mostra o plano)
 *         npx tsx scripts/seed-setembro.ts --apply  (grava no banco)
 *
 * Idempotente: pula card cujo título já existe no board.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "../src/lib/db";
import { users, workspaceMembers, kanbanBoards, kanbanColumns, kanbanCards, cardSubtasks } from "../src/lib/db/schema";
import { and, eq } from "drizzle-orm";

const USER_EMAIL = process.env.SEED_EMAIL ?? "eduardo.sodre@roshre.com.br";
const APPLY = process.argv.includes("--apply");

type C = { sha: string; repo: string; date: string; message: string; add: number; del: number; files: number };
type Prio = "low" | "medium" | "high" | "urgent";
type Diff = "easy" | "medium" | "hard" | "very_hard";
type Group = { board: string; title: string; prio: Prio; diff: Diff; summary: string[]; shas: string[] };

// Boards que já existem no workspace do Eduardo reaproveitam; o resto é criado (pessoal).
const BOARD_COLOR: Record<string, string> = { Obralyse: "#4f6ef7", CheckObra: "#10b981", RoshSign: "#8b5cf6", OpenTicket: "#f59e0b", "T.I": "#64748b" };
const BOARD_DESC: Record<string, string> = {
  CheckObra: "App mobile de checklist de obra (Expo/React Native + Firestore)",
  RoshSign: "Assinatura de documentos com ICP-Brasil",
  OpenTicket: "Sistema de chamados (Nexus) — Financeiro, Fiscal, Sienge",
};

const G: Group[] = [
  // ───────────── Obralyse ─────────────
  { board: "Obralyse", title: "Dashboards administrativos, auditoria e relatórios (base)", prio: "high", diff: "hard",
    summary: ["Dashboards administrativos, auditoria e biblioteca de gráficos", "Filtro de período na auditoria", "Travar nível Admin/Master para usuários fora do domínio da organização", "Relatório detalhado do colaborador com logo e layout de ficha", "Calendário de vencimentos com seletor rápido de mês/ano", "Reorganização do repositório (frontend/ → raiz)"],
    shas: ["5de9132", "aae92ad", "3522c76", "406b584", "867a6b6", "8fa1a82", "bf42e31", "99c9e39", "a86a64a", "d80345d"] },
  { board: "Obralyse", title: "Integração com o app CheckObra (checklists, dispositivos e login por código)", prio: "high", diff: "hard",
    summary: ["Checklists de equipamentos vindos do CheckObra", "Vínculo de responsável a dispositivos, ativar/desativar obras, login por código", "Custom token do Firebase para leitura em tempo real do dispositivo", "Endpoint de usuários para autocomplete de líder/segurança", "Modal de foto ampliada no checklist", "Setup de Vitest com testes de auth/token"],
    shas: ["27c062c", "b816411", "303ef39", "ef78f7f", "6b60243", "12b25f1", "5e5894d", "612de30"] },
  { board: "Obralyse", title: "Correções de deploy e sessão na Vercel", prio: "urgent", diff: "medium",
    summary: ["Build quebrado por jose@6 (ESM-only) com jwks-rsa", "Leitura de chave privada PEM colada em formato errado", "Log do motivo real de falha em hihub_session e remoção da checagem de revogação", "App não cai mais por falta de CHECKOBRA_API_KEY"],
    shas: ["55fca72", "3335228", "a803306", "da33711", "d5e4560"] },
  { board: "Obralyse", title: "Colaboradores: lista paginada, cache e filtros", prio: "medium", diff: "medium",
    summary: ["Bloqueados ocultos por padrão e paginação", "Cache de listPessoas (menos leituras no Firestore)", "\"Todos os Ativos\" para todas as obras"],
    shas: ["df4762a", "84d2674", "b1f2dad"] },
  { board: "Obralyse", title: "Refactor de permissões e RBAC — server actions exigem admin", prio: "high", diff: "hard",
    summary: ["Server actions de dispositivos e usuários passam a exigir admin"],
    shas: ["9e3b91d", "904cd39"] },
  { board: "Obralyse", title: "Motor de inspeções e não-conformidades (Qualidade, Segurança, Meio Ambiente)", prio: "urgent", diff: "very_hard",
    summary: ["Fluxo de inspeções e NCs portado do Inmeta e generalizado para Materiais, Serviço, Auditorias, Entrega de obra e Segurança", "Workflow de validação em etapas e item a item, com reprovação, risco por item e observações", "Página de validações pendentes cruzando todos os submódulos", "Iniciar várias inspeções de uma vez; editar inspeção finalizada com histórico; exportar PDF", "Módulo Pré-obra, catálogo de locais físicos e cadastro mestre (fornecedor/equipamento/material/mão de obra)"],
    shas: ["cd66c4a", "701383f", "3ab813a", "2277b3c", "ec31b79", "128d6bf", "56cadd0", "6b1c633", "88ece2d", "e59f9da", "27db336", "5718b18", "13e536b", "8799e34", "09dd483", "316e24f", "b35b9c1", "c5402cf"] },
  { board: "Obralyse", title: "Indicadores por obra, submódulo e colaborador (Excel/PDF)", prio: "high", diff: "hard",
    summary: ["NC por submódulo e por avaliador, cruzando Qualidade × Segurança", "Agrupamento por obra ou item", "Relatório de indicadores por obra (Excel/PDF) com gráfico de pizza", "Funcionário administrativo fora da conformidade documental e indicadores por colaborador", "Filtro de período com snapshot mensal por colaborador"],
    shas: ["44ac129", "2a10448", "0e5a4c2", "5535ce2", "f579102", "f23961f", "1b47b8a"] },
  { board: "Obralyse", title: "EPIs: entrega/devolução com assinatura, ficha NR-6 e validade de CA", prio: "high", diff: "hard",
    summary: ["Entrega e devolução de EPI com assinatura", "Painel de indicadores, evidência de assinatura e ficha NR-6 em PDF", "Vida útil e validade de CA nas entregas", "Confirmação e rastro de quem devolveu"],
    shas: ["d6868cb", "81db422", "61db96c", "df7db1a"] },
  { board: "Obralyse", title: "Treinamentos com assinatura eletrônica (PAdES ICP-Brasil) e trilha de auditoria", prio: "urgent", diff: "very_hard",
    summary: ["Assinatura eletrônica com trilha de auditoria e selo PAdES ICP-Brasil", "Envolvidos com CPF real; remover envolvido fixo do modelo", "Treinamentos e EPIs na ficha do colaborador", "Múltiplos anexos por treinamento/documento", "PR #1 mergeado"],
    shas: ["8e752c9", "8613586", "2bf7b2d", "61d291b", "d127b4b", "df43887"] },
  { board: "Obralyse", title: "RDO — Relatório Diário de Obra completo", prio: "high", diff: "very_hard",
    summary: ["Clima por período, efetivo, atividades, equipamentos e visitas", "Editar/excluir RDO; etapas, anexos, finalização e calendário", "Anotações, tipos de ocorrência cadastráveis e totais de efetivo", "Validação por etapas configurável por obra, status \"não aplicável\" e preferências por obra", "KPIs de realizados/em andamento e calendário clicável para criar RDO"],
    shas: ["8cc4cef", "620057b", "3218ab1", "07b21c3", "389822b", "fb584bb", "0cf1a59", "832e945", "2f0d93a"] },
  { board: "Obralyse", title: "Checklists de equipamentos: cronologia, PDF e alertas de validade", prio: "medium", diff: "medium",
    summary: ["Assinatura/foto da observação, cronologia por equipamento e exportação em PDF", "Checklists agrupados por obra em linhas compactas", "Alerta de validade vencida/a vencer em Equipamentos"],
    shas: ["5a7b3c2", "2aee92d", "2e08de4"] },
  { board: "Obralyse", title: "Não conformidades vencidas e exigência de solução adotada", prio: "medium", diff: "easy",
    summary: ["NCs vencidas destacadas; resolver exige solução adotada"], shas: ["7b9676c"] },
  { board: "Obralyse", title: "Inativação automática e permissões granulares por recurso", prio: "high", diff: "hard",
    summary: ["Inativação automática por falta de movimentação", "Permissões granulares por recurso", "Importação de colaboradores por CSV passa a criar as tarefas padrão de conformidade"],
    shas: ["e602638", "f34861b"] },
  { board: "Obralyse", title: "Conformidade documental: histórico imutável, dashboard 360 e auditoria total", prio: "high", diff: "very_hard",
    summary: ["Relatório de análise documental por período", "Histórico imutável de movimentações e dashboard com nota por obra", "Indicadores de meses passados com retrato diário", "Auditoria de todos os CRUDs e Painel 360", "Linha do tempo documental com tempo por etapa", "Tela 403 no lugar do erro 500; performance com varredura única de colaboradores"],
    shas: ["1464647", "153669e", "7d68cf2", "e5e264f", "8f9d3a7", "a6cc5f1", "ed9cb8f", "8a29427", "365da0e", "bfc347f"] },
  { board: "Obralyse", title: "Módulo Documentos (Fase 1): pastas, pendências, link público e lixeira", prio: "urgent", diff: "very_hard",
    summary: ["Link público de envio de documentos e salvamento automático do cadastro", "Pastas, pendências, atualizações e lixeira", "Pasta de empresa como lista achatada, agrupada por empresa (nome mais frequente do CNPJ)", "Inativação em 60 dias e aprovação agregada com liberação automática de acesso", "Permissão própria para Documentos; auditoria rastreia troca de anexos"],
    shas: ["f87f53f", "50d2a70", "0f21a70", "d224235", "5dc41fa", "d12e4b2", "9388747", "bb09383", "c46ff34", "5b98677", "fc5469e"] },
  { board: "Obralyse", title: "Ajustes de marca e build (logo)", prio: "low", diff: "easy",
    summary: ["Retirada da logo e correção do build causado por ela"], shas: ["007f348", "31acffc", "2421947"] },

  // ───────────── CheckObra ─────────────
  { board: "CheckObra", title: "App CheckObra com atribuição remota de obra por dispositivo", prio: "high", diff: "very_hard",
    summary: ["Commit inicial do app", "Múltiplas obras por dispositivo e refresh automático (20s)", "Correção de upload de foto na sincronização"],
    shas: ["a8e87bb", "55cfe89", "0e6a29a", "30cb857"] },
  { board: "CheckObra", title: "Login real por e-mail + código", prio: "high", diff: "medium",
    summary: ["Substitui o login mock", "Descarta sessão antiga presa no SecureStore"], shas: ["b475e1e", "5d490c8"] },
  { board: "CheckObra", title: "Atualização instantânea via Firestore em tempo real", prio: "high", diff: "hard",
    summary: ["Sem polling", "Histórico filtrado pela obra do tablet e admin com diagnóstico", "Long-polling no Firestore (fix do loading infinito no React Native)"],
    shas: ["49ab574", "0d27d56", "b0c9be5", "562013f"] },
  { board: "CheckObra", title: "Autocomplete de equipamento, líder e responsável de Segurança", prio: "medium", diff: "medium",
    summary: ["Sugestões vindas dos Usuários cadastrados, não do histórico local"], shas: ["8531b9f", "5301cef", "62b8c82"] },
  { board: "CheckObra", title: "Rubrica em tela cheia, foto na observação e ajustes de UX", prio: "medium", diff: "medium",
    summary: ["Rubrica desenhada em tela cheia", "Foto opcional na observação"], shas: ["a0d2b33"] },

  // ───────────── RoshSign ─────────────
  { board: "RoshSign", title: "Assinatura ICP-Brasil aprovada no validador do ITI", prio: "urgent", diff: "very_hard",
    summary: ["Assinatura compatível com o validador do ITI, restrita por permissão", "Ordem canônica dos signedAttrs e alinhamento com amostra aprovada", "Diagnóstico e varredura de pasta", "Remoção de pasta scratch do versionamento"],
    shas: ["e00f6ca", "77fcbed", "a20ee46", "8e91408", "4d7d59d", "3a54c6c"] },
  { board: "RoshSign", title: "Certificado A1 direto no navegador (Web PKI)", prio: "high", diff: "hard",
    summary: ["Assinatura com A1 no navegador", "Erro real do Web PKI deixa de ser engolido; suporte a licença"], shas: ["67223c9", "d35b3d4"] },
  { board: "RoshSign", title: "Trilha de auditoria: certificado de conclusão, CNPJ, rubrica e base legal", prio: "high", diff: "hard",
    summary: ["Certificado de conclusão", "Assinatura de cada signatário vinculada a um CNPJ", "Rubrica, adoção de assinatura e base legal", "Download nunca entrega PDF \"digital\" sem assinatura"],
    shas: ["9d94c33", "ee0d61a", "a8a2735", "6c86e5a"] },
  { board: "RoshSign", title: "Justificativa obrigatória ao reprovar documento e notificação aos signatários", prio: "medium", diff: "easy",
    summary: ["Exige justificativa e notifica signatários"], shas: ["72be350"] },

  // ───────────── OpenTicket ─────────────
  { board: "OpenTicket", title: "Solicitação de Adiantamento (Financeiro) com auditoria", prio: "high", diff: "hard",
    summary: ["Novo tipo de chamado para o Financeiro", "Auditoria das alterações"], shas: ["e16a88e"] },
  { board: "OpenTicket", title: "Adiantamento: apropriação de despesas, credor e empresa (Sienge)", prio: "high", diff: "hard",
    summary: ["Apropriação de Despesas", "Busca de fornecedor (credor Sienge)", "Campo Empresa buscado no Sienge", "UX e obrigatoriedade da apropriação"],
    shas: ["b3e0180", "317e529", "d173bb0", "6a10e6e"] },
  { board: "OpenTicket", title: "Adiantamento: relatório completo e chat com colar imagem", prio: "medium", diff: "medium",
    summary: ["Relatório completo com quebra de linha por campo", "Chat aceita colar print, mesmo com foco fora do campo"], shas: ["e96e7a3", "a38fa7e"] },
  { board: "OpenTicket", title: "Adiantamento: campos opcionais a pedido do Financeiro", prio: "low", diff: "easy",
    summary: ["Menos obrigatoriedades no formulário"], shas: ["dde346c"] },

  // ───────────── T.I (demais sistemas) ─────────────
  { board: "T.I", title: "Rosh Comunicados: carrossel, drag-and-drop e links nas publicações", prio: "medium", diff: "medium",
    summary: ["Links clicáveis no conteúdo", "Drag-and-drop no upload de imagens e carrossel no Feed", "Corte de texto conforme a altura da imagem", "Troca do e-mail autorizado a excluir notas"],
    shas: ["9fbfb68", "3caf08c", "af53b4b", "6184baf", "c117c02"] },
  { board: "T.I", title: "GED: correções de nomenclatura e ID de documento", prio: "low", diff: "easy",
    summary: ["Traço tipográfico colado do Word; tipo FOR → F", "Escape de barra em pasta aninhada no ID do Firestore"], shas: ["9ad9a09", "4738dcf"] },
  { board: "T.I", title: "Retirada do logotipo antigo nos demais sistemas", prio: "low", diff: "easy",
    summary: ["Landing Page, Login, RoshCheck, Rosh Comunicados, OpenTicket, RoshSign, Controle de Acesso e Inventário TI"],
    shas: ["8039b8e", "3238929", "bea9ff3", "c1d6dd5", "0cc7c04", "2b8bc24", "a875afa", "4efc7ef", "d656c9c", "de7fc75", "458e042"] },
  { board: "T.I", title: "Landing Page: seções, parceiros e build", prio: "low", diff: "easy",
    summary: ["Seções da timeline e parceiros comentadas", "Ajuste de build"], shas: ["6363807", "4a66e0b", "3b5780e"] },
  { board: "T.I", title: "Correções em Controle de Acesso e Inventário TI", prio: "low", diff: "easy",
    summary: ["Controle de Acesso: erro ao gerar relatório na ficha do colaborador", "Inventário TI: referência quebrada ao logo no termo do RoshSign"], shas: ["d3d5a9b", "29713e4"] },
];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const br = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

async function main() {
  const commits: C[] = JSON.parse(readFileSync(join(process.cwd(), "scripts", "setembro-commits.json"), "utf8"));
  const by7 = new Map(commits.map((c) => [c.sha.slice(0, 7), c]));

  const used = new Set<string>();
  for (const g of G) for (const s of g.shas) { if (!by7.has(s)) console.log(`⚠️  sha desconhecido ignorado: ${s} (${g.title})`); else if (used.has(s)) console.log(`⚠️  sha em 2 cards: ${s}`); used.add(s); }
  const orphans = commits.filter((c) => !used.has(c.sha.slice(0, 7)));
  console.log(`📦 ${commits.length} commits, ${used.size} em ${G.length} cards, ${orphans.length} sem card`);
  for (const o of orphans) console.log(`   sem card: ${o.repo} ${o.sha.slice(0, 7)} ${o.message}`);

  if (!APPLY) { console.log("\n(dry-run — rode com --apply para gravar)"); process.exit(0); }

  const [user] = await db.select().from(users).where(eq(users.email, USER_EMAIL));
  if (!user) throw new Error(`Usuário ${USER_EMAIL} não encontrado`);
  const [mem] = await db.select().from(workspaceMembers).where(eq(workspaceMembers.userId, user.id));
  if (!mem) throw new Error("Usuário sem workspace");
  const wsId = mem.workspaceId;

  const boards = await db.select().from(kanbanBoards).where(eq(kanbanBoards.workspaceId, wsId));
  const doneCol = new Map<string, string>(), boardId = new Map<string, string>();
  for (const name of new Set(G.map((g) => g.board))) {
    let b = boards.find((x) => x.name === name);
    if (!b) {
      [b] = await db.insert(kanbanBoards).values({ workspaceId: wsId, name, description: BOARD_DESC[name], color: BOARD_COLOR[name], isPersonal: true, createdById: user.id }).returning();
      await db.insert(kanbanColumns).values([
        { boardId: b.id, name: "A Fazer", order: 0, color: "#64748b" },
        { boardId: b.id, name: "Em Progresso", order: 1, color: "#4f6ef7" },
        { boardId: b.id, name: "Concluído", order: 2, color: "#10b981" },
      ]);
      console.log(`📋 Board criado (pessoal): ${name}`);
    }
    const cols = await db.select().from(kanbanColumns).where(eq(kanbanColumns.boardId, b.id));
    const done = cols.find((c) => /conclu/i.test(c.name)) ?? cols.sort((a, z) => z.order - a.order)[0];
    boardId.set(name, b.id); doneCol.set(name, done.id);
  }

  let created = 0, skipped = 0;
  for (const g of G) {
    const bid = boardId.get(g.board)!;
    const dup = await db.select({ id: kanbanCards.id }).from(kanbanCards).where(and(eq(kanbanCards.boardId, bid), eq(kanbanCards.title, g.title)));
    if (dup.length) { skipped++; continue; }
    const cs = g.shas.map((s) => by7.get(s)).filter((c): c is C => !!c).sort((a, z) => a.date.localeCompare(z.date));
    if (!cs.length) continue;
    const start = new Date(cs[0].date), end = new Date(cs[cs.length - 1].date);
    const add = cs.reduce((s, c) => s + c.add, 0), del = cs.reduce((s, c) => s + c.del, 0);
    const repos = [...new Set(cs.map((c) => c.repo))];
    const html = [
      `<p><strong>Período:</strong> ${br(cs[0].date)}${br(cs[0].date) === br(cs[cs.length - 1].date) ? "" : " a " + br(cs[cs.length - 1].date)} · <strong>${cs.length}</strong> commit(s) · +${add}/−${del} linhas</p>`,
      `<p><strong>Repositório:</strong> ${repos.map((r) => `<a href="https://github.com/Rosh-Participacoes/${r}" target="_blank" rel="noopener noreferrer">${r}</a>`).join(", ")}</p>`,
      `<h3>O que foi entregue</h3>`,
      `<ul>${g.summary.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>`,
      `<h3>Commits</h3>`,
      `<ul>${cs.map((c) => `<li>${br(c.date)} — ${esc(c.message)} <a href="https://github.com/Rosh-Participacoes/${c.repo}/commit/${c.sha}" target="_blank" rel="noopener noreferrer"><code>${c.sha.slice(0, 7)}</code></a></li>`).join("")}</ul>`,
    ].join("\n");

    const [card] = await db.insert(kanbanCards).values({
      columnId: doneCol.get(g.board)!, boardId: bid, title: g.title, description: html,
      priority: g.prio, difficulty: g.diff, status: "done", order: created,
      startDate: start, completedAt: end, createdAt: start, updatedAt: end, createdById: user.id, assignedToId: user.id,
    }).returning();
    await db.insert(cardSubtasks).values(cs.map((c, i) => ({ cardId: card.id, title: c.message.slice(0, 250), isDone: true, order: i, assignedToId: user.id })));
    created++;
  }
  console.log(`✅ ${created} cards criados, ${skipped} já existiam`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
