/**
 * Seed: importa todos os commits do Eduardo na Rosh-Participacoes como
 *   1) Cards no Kanban (board "Contribuições Rosh", colunas por tipo)
 *   2) Docs (uma doc por projeto Rosh, com histórico formatado)
 *
 * Rodar:  npx tsx scripts/seed-rosh.ts
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "../src/lib/db";
import {
  users,
  workspaces,
  workspaceMembers,
  kanbanBoards,
  kanbanColumns,
  kanbanCards,
  docEntries,
} from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

const USER_EMAIL = process.env.SEED_EMAIL ?? "edduardooo2011@gmail.com";
const USER_NAME = "Eduardo Sodré";
const WORKSPACE_NAME = "Rosh";
const WORKSPACE_SLUG = process.env.SEED_WORKSPACE_SLUG ?? `rosh-${USER_EMAIL.split("@")[0]}`;
const BOARD_NAME = "Contribuições Rosh";

type Raw = { sha: string; repo: string; date: string; message: string; url: string };
type Kind = "feat" | "fix" | "refactor" | "docs" | "chore" | "perf" | "revert" | "merge" | "first";

// Classifica o commit pelo prefixo da mensagem
function classify(msg: string): Kind {
  const m = msg.trim().toLowerCase();
  if (m.startsWith("feat")) return "feat";
  if (m.startsWith("fix")) return "fix";
  if (m.startsWith("refactor")) return "refactor";
  if (m.startsWith("docs") || m.startsWith("update readme")) return "docs";
  if (m.startsWith("chore") || m.startsWith("build") || m.startsWith("rm:")) return "chore";
  if (m.startsWith("perf")) return "perf";
  if (m.startsWith("revert")) return "revert";
  if (m.startsWith("merge")) return "merge";
  if (m.startsWith("first commit") || m.startsWith("initial commit")) return "first";
  return "chore";
}

// Tradução PT-BR — mantém o título curto (1ª linha). Indexado por SHA curto.
const TRANSLATIONS: Record<string, string> = {
  // OpenTicket-main
  "09dee18": "feat: drag and drop nos campos de anexo do formulário de chamado e das interações",
  "c61fc8c": "fix: esconder popup do select e popover quando o trigger sai da viewport ao rolar",
  "83da409": "feat: TED como forma de pagamento com dados bancários na escrituração",
  "b8d058f": "feat: tabela dinâmica de despesas e merge de comprovantes em PDF único no reembolso",
  "fbc2638": "fix: corrigir compatibilidade do react-day-picker para date-fns v4",
  "61a11d3": "feat: substituir input date nativo por date picker estilizado e adicionar vencimento parcelado",
  "61a5771": "feat: exibir obra e centro de custo no card da nota e abrir NotaFinder com painel espelho do chamado",
  "04bd833": "feat: modal de confirmar entrega com registro no Sienge ERP no NotaFinder",
  "28594de": "feat: autocomplete de obras e busca de centros de custo no formulário de chamado",
  "e911934": "feat: obra e centro de custo com autocomplete em todos os chamados (dados Sienge)",
  "0ff2e48": "feat: integração completa NotaFinder ↔ OpenTicket com histórico unificado e gestão de obras",
  "5ce5c50": "feat: gestão de departamentos, blocklist e ajustes no fluxo Fiscal/Escrituração",
  "dcfa6ea": "feat: integração API Notafinder, blocklist de emitentes e campos fiscais na Escrituração",
  "9d150c7": "fix: envio de mensagem para o novo atendente via Outlook",
  "a4f7c4d": "feat: composição no Firestore para o operador poder transferir um chamado",
  "13d9032": "feat: serviço principal de chamados — criação, consulta e gestão de status com SLA e notificações por email",
  "561ebd2": "feat: scripts de teste de conectividade com a API NotaFinder em ambientes raw e produção",
  "b8ffe41": "feat: busca na API do NotaFinder para o ticket do financeiro buscando e atribuindo notas dentro do chamado",
  "d6fafd3": "fix: atualizações locais, porta e bypass de login",
  // RoshSign-main
  "1ad9a17": "fix: corrigir cache fantasma de signatários removidos e adicionar painel admin completo",
  "bd519e5": "fix: persistir prefill externo em Firestore + Storage com retry",
  "6bb7676": "feat: aceitar prefill externo em /documento/new vindo do Inventário TI",
  "36234e1": "feat: painel admin para gestão de usuários e whitelist com integração Firebase",
  "022bfcc": "feat: controle de acesso por whitelist e lógica de sessão para autenticação e rotas admin",
  "494398f": "fix: aumento do maxSizePerFile de 10MB para 12MB",
  "f31a9fc": "feat: definir Documentos como aba inicial e persistir estado das pastas ao voltar",
  "cc5b9b3": "revert: revert da definição de Documentos como aba inicial",
  "9a4bc31": "feat: definir Documentos como aba inicial e persistir estado das pastas ao voltar",
  "0dae246": "feat: endpoint de API dos documentos que estão em cache",
  "0008f72": "chore: retirada do botão de sincronizar",
  "825c0db": "fix: ajuste no arquivar documentos",
  "a957fc9": "merge: merge da branch main",
  "b1aa1c6": "first: commit inicial do RoshSign",
  // rosh-main
  "9719fd4": "fix: corrigir reupload de arquivo no modal de PO e melhorar UX de criação",
  "7a8073b": "fix: troca do título do concurso",
  "be7869d": "fix: redirecionar ao login quando a sessão não está autenticada",
  "e521e6b": "feat: concurso para nomear o projeto com enquete, votação ao vivo e painel admin",
  "71a0352": "feat: refatoração da home com Emotion CSS-in-JS e ajustes em feed, avisos e notícias",
  "aa496f6": "feat: painel de referência do chamado com vencimento parcelado nos modais do NotaFinder",
  "8acd14c": "feat: suporte a deep-link e painel de referência do chamado nos modais do NotaFinder",
  "b6968b6": "feat: API de histórico no Firestore integrada à UI do NotaFinder",
  "f17b50f": "feat: modal de confirmar entrega com registro no Sienge ERP no NotaFinder",
  "3d44585": "fix: melhorar layout do modal de atribuição da nota fiscal",
  "2afc35f": "feat: link no sidebar para o Recruta Rosh",
  "7ff6755": "fix: restringir acesso à blocklist do NotaFinder apenas para super admins",
  "bafb164": "feat: blocklist por nome + CNPJ vinculados no NotaFinder",
  "316d75c": "feat: liberar acesso público a endpoints externos da API no middleware",
  "ff2cfcf": "fix: tela em manutenção",
  "3645efd": "feat: endpoints externos para o NotaFinder e scaffolding inicial da home page",
  "e7e3bb7": "feat: endpoint de API externo do NotaFinder para o OpenTicket",
  "7d42f55": "feat: procedimentos operacionais (PO), ajuste no calendário lateral, mural de notícias e Você sabia",
  "d6d8b78": "feat: ajuste no NotaFinder e nova tela em construção",
  "36a0a1c": "feat: adição da dependência lucide-react",
  "4dfd865": "merge: merge da branch main",
  "0833086": "feat: novo visual do hub, refatoração em TypeScript e correção de erros de compilação",
  "80f04c6": "refactor: migração de JavaScript para TypeScript com componentização e Tailwind",
  "9ca7696": "feat: implementação e ajuste no middleware para resolver o loop do authentication",
  "e197d7f": "feat: controle de acesso por papéis com utilitário de verificação de super admin do NotaFinder",
  "67b0867": "feat: dashboard home page e diretório da ferramenta NotaFinder",
  "4fad72f": "feat: utilitário de permissão para gerenciar e validar acesso de Super Admin do NotaFinder",
  "5fcde33": "feat: suite NotaFinder com módulos manuais e automáticos de consulta NFE/NFSe/CTe",
  "54d5c53": "feat: placeholder de rota da API de consulta NFSe temporariamente desabilitado para build",
  "2763011": "feat: configuração admin do NotaFinder com rota de acesso por whitelist e gestão de grupos de usuários",
  "f27a774": "first: commit inicial do rosh-main",
  // accessControl-main
  "f620cb8": "fix: limitar ano do campo de vencimento a 4 dígitos e exibir aviso para datas inválidas",
  "587f10e": "fix: melhorar validação de CPF com feedback em tempo real e liberar edição de CPF legado inválido",
  "fbf0774": "feat: validação de CPF e bloqueio de duplicatas no cadastro de colaboradores",
  "137e5ff": "feat: controle de status ativo/inativo para colaboradores e relatórios",
  "a544025": "fix: troca de cor do Status da exportação em PDF na ficha do colaborador",
  "17aff03": "feat: ajuste na exportação em Excel em ordem alfabética",
  "32a60fc": "feat: mensagem de observação na exportação individual do colaborador em PDF",
  "c63d44e": "fix: ajustar contagem de selecionados e comportamento padrão do modal de PDF",
  "005f7c4": "fix: fixar 'Todas' no topo do filtro de empresas no exportar PDF",
  "c68360d": "perf: otimizar carregamento de usuários com busca paralela e cache de perfis",
  "a599654": "feat: pesquisa de funcionários com treinamentos e exames próximos do vencimento",
  "b8387c4": "feat: detalhes do colaborador em 'Tarefas e Exames'",
  "5e7b961": "feat: dashboard sincronizando corretamente as obras",
  "7503331": "feat: home page com exportação por seleção de obras e colaboradores",
  "9ce9e32": "feat: filtros por empresa e colaborador na Home com export para Excel",
  "2252980": "feat: implementação de mais um admin master",
  "cd4db12": "feat: export em Excel e ajustes nos status da tabela",
  "da6c22f": "feat: exportação Excel de relatórios de tarefas dos funcionários com branding e formatação",
  "a6a4f52": "feat: campos de Observação e melhoria do upload em Anexo",
  "ef01901": "feat: avisos de 30 dias de vencimento de 'Tarefas e exames' e status dos exames no DrawerUser",
  "eb782d5": "feat: home page dashboard com monitoramento de acessos em tempo real e geração de relatórios",
  "63aa77b": "feat: implementação do access control management",
  "a358f75": "feat: inicialização do projeto accessControl",
  "f198d16": "first: commit inicial do accessControl",
  // RoshCheck
  "715fd77": "feat: página de settings com controle de acesso por papéis e gestão de administradores",
  "645bef9": "fix: tratar tokens malformados e injetar headers de simulação no bypass do proxy em dev",
  "84b0179": "fix: melhorar validação de session token e adicionar suporte Base64URL no middleware proxy",
  "7116a60": "feat: implementação de autenticação por papéis (role-based)",
  "cad4bfd": "feat: provider de contexto MainLayout e endpoint para salvar respostas do formulário",
  "e2e7888": "feat: API de gestão de admins, AuthContext e refatoração do proxy para compatibilidade Edge",
  "6d36fde": "feat: inicialização do RoshCheck com formulários do FVM e FVS",
  "05f121e": "docs: melhoria no README e adição de .env.example",
  "1083fac": "docs: atualização do README.md",
  "a0640c4": "first: commit inicial do RoshCheck",
  // InventarioTI-Web
  "c5656d9": "fix: aguardar propagação do Firestore antes de abrir RoshSign",
  "12efcc3": "feat: enviar termo de responsabilidade ao RoshSign a partir do Inventário TI",
  "abf9662": "chore: gerar arquivos estáticos de produção para deploy",
  "7ed1274": "feat: ajuste no layout e estrutura do HTML",
  "c86b607": "feat: ajuste do build no package.json",
  "56bcde7": "feat: adição do script de build no package.json",
  "da679f0": "feat: usar variáveis de ambiente para Firebase e atualizar arquivos do projeto",
  // FactoryControl-main
  "b836954": "chore: habilitar bypass de dev local para acesso facilitado",
  "70a3faa": "feat: melhorar middleware de auth e corrigir erros de decodificação de sessão Firebase",
  // login-main
  "5aacaac": "first: commit inicial do login-main",
  // RoshAprroval-main
  "ed8b44f": "first: commit inicial do RoshAprroval",
};

function translate(sha: string, msg: string): string {
  const shortSha = sha.substring(0, 7);
  return TRANSLATIONS[shortSha] ?? msg.split("\n")[0];
}

// Mapeia repo do GitHub para um nome amigável
const PROJECT_NAMES: Record<string, string> = {
  "rosh-main": "Rosh Hub (rosh-main)",
  "OpenTicket-main": "OpenTicket",
  "RoshSign-main": "RoshSign",
  "RoshCheck": "RoshCheck",
  "accessControl-main": "Access Control",
  "InventarioTI-Web": "Inventário TI Web",
  "FactoryControl-main": "Factory Control",
  "login-main": "Login Unificado",
  "RoshAprroval-main": "Rosh Approval",
};

// Mapeia kind -> nome da coluna do Kanban
const COLUMN_FOR_KIND: Record<Kind, string> = {
  feat: "Features",
  fix: "Correções (Fixes)",
  refactor: "Refatorações",
  perf: "Performance",
  docs: "Documentação",
  chore: "Manutenção (Chore)",
  revert: "Manutenção (Chore)",
  merge: "Manutenção (Chore)",
  first: "Manutenção (Chore)",
};

const COLUMNS = [
  { name: "Features", color: "#10b981" },
  { name: "Correções (Fixes)", color: "#ef4444" },
  { name: "Refatorações", color: "#8b5cf6" },
  { name: "Performance", color: "#f59e0b" },
  { name: "Documentação", color: "#3b82f6" },
  { name: "Manutenção (Chore)", color: "#6b7280" },
];

const PRIORITY_FOR_KIND: Record<Kind, "low" | "medium" | "high" | "urgent"> = {
  feat: "high",
  fix: "high",
  refactor: "medium",
  perf: "medium",
  docs: "low",
  chore: "low",
  revert: "low",
  merge: "low",
  first: "medium",
};

async function main() {
  const raw: Raw[] = JSON.parse(
    readFileSync(join(process.cwd(), "scripts", "rosh-commits.json"), "utf8").replace(/^﻿/, "")
  );
  console.log(`📦 ${raw.length} commits carregados`);

  // 1) User
  let [user] = await db.select().from(users).where(eq(users.email, USER_EMAIL));
  if (!user) {
    [user] = await db.insert(users).values({ email: USER_EMAIL, name: USER_NAME }).returning();
    console.log(`👤 Usuário criado: ${user.email}`);
  } else {
    console.log(`👤 Usuário encontrado: ${user.email}`);
  }

  // 2) Workspace
  let [ws] = await db.select().from(workspaces).where(eq(workspaces.slug, WORKSPACE_SLUG));
  if (!ws) {
    [ws] = await db
      .insert(workspaces)
      .values({ name: WORKSPACE_NAME, slug: WORKSPACE_SLUG, ownerId: user.id })
      .returning();
    await db.insert(workspaceMembers).values({
      workspaceId: ws.id,
      userId: user.id,
      role: "owner",
    });
    console.log(`🏢 Workspace criado: ${ws.name}`);
  } else {
    console.log(`🏢 Workspace encontrado: ${ws.name}`);
  }

  // 3) Board (idempotente: se já existir um com o mesmo nome, reusa)
  let [board] = await db
    .select()
    .from(kanbanBoards)
    .where(eq(kanbanBoards.workspaceId, ws.id));
  const existing = (
    await db.select().from(kanbanBoards).where(eq(kanbanBoards.workspaceId, ws.id))
  ).find((b) => b.name === BOARD_NAME);
  if (existing) {
    board = existing;
    console.log(`📋 Board já existe — reutilizando: ${board.name}`);
  } else {
    [board] = await db
      .insert(kanbanBoards)
      .values({
        workspaceId: ws.id,
        name: BOARD_NAME,
        description: "Importação automática de 109 commits da organização Rosh-Participacoes",
        color: "#4f6ef7",
        createdById: user.id,
      })
      .returning();
    console.log(`📋 Board criado: ${board.name}`);
  }

  // 4) Columns
  const existingCols = await db
    .select()
    .from(kanbanColumns)
    .where(eq(kanbanColumns.boardId, board.id));
  const colByName = new Map<string, string>();
  for (const col of existingCols) colByName.set(col.name, col.id);

  for (let i = 0; i < COLUMNS.length; i++) {
    const c = COLUMNS[i];
    if (!colByName.has(c.name)) {
      const [created] = await db
        .insert(kanbanColumns)
        .values({ boardId: board.id, name: c.name, color: c.color, order: i })
        .returning();
      colByName.set(c.name, created.id);
      console.log(`  ➕ Coluna criada: ${c.name}`);
    }
  }

  // 5) Cards — um card por commit
  console.log(`\n🃏 Inserindo ${raw.length} cards...`);
  let cardOrder = 0;
  let inserted = 0;
  for (const c of raw) {
    const kind = classify(c.message);
    const title = translate(c.sha, c.message);
    const colName = COLUMN_FOR_KIND[kind];
    const columnId = colByName.get(colName)!;
    const priority = PRIORITY_FOR_KIND[kind];
    const project = PROJECT_NAMES[c.repo] ?? c.repo;
    const dateBr = new Date(c.date).toLocaleDateString("pt-BR");

    const descriptionHtml = `
<p><strong>Projeto:</strong> ${project}</p>
<p><strong>Data:</strong> ${dateBr}</p>
<p><strong>Repositório:</strong> <a href="https://github.com/Rosh-Participacoes/${c.repo}" target="_blank" rel="noopener noreferrer">${c.repo}</a></p>
<p><strong>Commit:</strong> <a href="${c.url}" target="_blank" rel="noopener noreferrer"><code>${c.sha.substring(0, 7)}</code></a></p>
<p><strong>Mensagem original:</strong></p>
<pre>${escapeHtml(c.message)}</pre>
`.trim();

    await db.insert(kanbanCards).values({
      columnId,
      boardId: board.id,
      title: `[${project}] ${title}`,
      description: descriptionHtml,
      priority,
      status: "done",
      order: cardOrder++,
      completedAt: new Date(c.date),
      createdById: user.id,
    });
    inserted++;
    if (inserted % 20 === 0) console.log(`  ... ${inserted}/${raw.length}`);
  }
  console.log(`✅ ${inserted} cards inseridos`);

  // 6) Docs — uma doc por projeto (idempotente)
  console.log(`\n📄 Criando docs por projeto...`);
  const byRepo = new Map<string, Raw[]>();
  for (const c of raw) {
    if (!byRepo.has(c.repo)) byRepo.set(c.repo, []);
    byRepo.get(c.repo)!.push(c);
  }

  const existingDocs = await db
    .select()
    .from(docEntries)
    .where(eq(docEntries.workspaceId, ws.id));
  const docTitles = new Set(existingDocs.map((d) => d.title));

  for (const [repo, commits] of byRepo) {
    const projectName = PROJECT_NAMES[repo] ?? repo;
    const docTitle = `Contribuições — ${projectName}`;
    if (docTitles.has(docTitle)) {
      console.log(`  ⏭️  Já existe: ${docTitle}`);
      continue;
    }

    const sorted = [...commits].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const counts = countByKind(sorted);
    const lines = sorted
      .map((c) => {
        const dateBr = new Date(c.date).toLocaleDateString("pt-BR");
        const title = translate(c.sha, c.message);
        return `<li><strong>${dateBr}</strong> — ${escapeHtml(title)} <a href="${c.url}" target="_blank" rel="noopener noreferrer"><code>${c.sha.substring(0, 7)}</code></a></li>`;
      })
      .join("\n");

    const html = `
<h2>${projectName}</h2>
<p><strong>Repositório:</strong> <a href="https://github.com/Rosh-Participacoes/${repo}" target="_blank" rel="noopener noreferrer">github.com/Rosh-Participacoes/${repo}</a></p>
<p><strong>Total de contribuições:</strong> ${sorted.length} commits</p>
<p>${formatCounts(counts)}</p>
<h3>Galeria (anexar fotos depois)</h3>
<p><em>Use o editor para anexar prints de antes/depois dos principais features.</em></p>
<h3>Histórico de commits</h3>
<ul>
${lines}
</ul>
`.trim();

    await db.insert(docEntries).values({
      workspaceId: ws.id,
      authorId: user.id,
      title: docTitle,
      type: "feature",
      summary: `${sorted.length} contribuições em ${projectName}`,
      content: html,
      isPublished: true,
    });
    console.log(`  ✅ Doc criada: ${docTitle} (${sorted.length} commits)`);
  }

  console.log("\n🎉 Seed concluído!");
  console.log(`   Acesse /kanban e /docs no app para visualizar.`);
}

function countByKind(items: Raw[]): Record<Kind, number> {
  const c: Record<Kind, number> = {
    feat: 0, fix: 0, refactor: 0, perf: 0, docs: 0, chore: 0, revert: 0, merge: 0, first: 0,
  };
  for (const it of items) c[classify(it.message)]++;
  return c;
}

function formatCounts(c: Record<Kind, number>): string {
  const labels: Partial<Record<Kind, string>> = {
    feat: "Features",
    fix: "Fixes",
    refactor: "Refatorações",
    perf: "Performance",
    docs: "Docs",
    chore: "Chore/Outros",
  };
  const parts: string[] = [];
  for (const k of ["feat", "fix", "refactor", "perf", "docs", "chore"] as Kind[]) {
    const total = c[k] + (k === "chore" ? c.revert + c.merge + c.first : 0);
    if (total > 0) parts.push(`<strong>${labels[k]}:</strong> ${total}`);
  }
  return parts.join(" · ");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Erro no seed:", err);
    process.exit(1);
  });
