/**
 * Seed: cards do trabalho de 29/09 a 18/11/2026 no Eduardo Sodré's Workspace.
 *   - entregas do git (commits do Eduardo na org Rosh-Participacoes), agrupadas por tema
 *   - chamados atendidos (relatório "Chamados Finalizados" do OpenTicket), com o status de lá
 *
 * Rodar:  npx tsx scripts/seed-out-nov.ts <commits.json> <chamados.json>            (simulação)
 *         npx tsx scripts/seed-out-nov.ts <commits.json> <chamados.json> --apply    (grava)
 *
 * TRAVA: só grava no workspace WS_ID, e só depois de conferir nome e dono dele.
 * Idempotente: pula card cujo título já existe no board. Os arquivos de dados ficam
 * fora do repositório (os chamados têm nomes de colaboradores).
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { db } from "../src/lib/db";
import { users, workspaces, kanbanBoards, kanbanColumns, kanbanCards, cardSubtasks } from "../src/lib/db/schema";
import { and, eq } from "drizzle-orm";

const WS_ID = "c812e102-b411-4539-b39f-d6fc885c4d39";
const WS_NAME = "Eduardo Sodré's Workspace";
const OWNER_EMAIL = "eduardo.sodre@roshre.com.br";
const [COMMITS_PATH, TICKETS_PATH] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const APPLY = process.argv.includes("--apply");

type Commit = { repo: string; sha: string; date: string; msg: string };
type Ticket = { id: string; assunto: string; tema: string; solicitante: string; prioridade: string; status: string; abertura: string; conclusao: string };
type Prio = "low" | "medium" | "high" | "urgent";
type Diff = "easy" | "medium" | "hard" | "very_hard";
type Group = { board: string; title: string; prio: Prio; diff: Diff; summary: string[]; shas: string[] };

const BOARD_STYLE: Record<string, { color: string; desc: string }> = {
  NotaFinder: { color: "#0ea5e9", desc: "Consulta e gestão de notas fiscais integrada ao Sienge" },
};

// ───────────── Entregas do git ─────────────
const G: Group[] = [
  // Obralyse
  { board: "Obralyse", title: "Redesign geral das telas: cards, formulários e responsividade", prio: "high", diff: "very_hard",
    summary: ["Novo padrão visual em RDO, Inspeções, Não conformidades, Equipamentos, EPIs, Treinamentos e Admin", "Indicadores em cards e formulários em duas colunas no computador", "Telas ajustadas para celular"],
    shas: ["d5254f3", "0dd3d82", "0c95e4e", "b64c338", "86a55f0", "9fdfcba", "90facc4", "5758cf2", "b1eb445", "18981c5", "4f36c1a", "95afd10", "df9204f", "92ad0f2", "9e0666c", "bf07a86", "5c287d7"] },
  { board: "Obralyse", title: "Documentos: busca, agrupamento por empresa e paginação", prio: "medium", diff: "medium",
    summary: ["Busca em Pendências, Atualizações e Lixeira", "Listas agrupadas por empresa e paginadas", "Auditoria identifica quem enviou pelo link (nome e CPF)"],
    shas: ["ca1de7d", "4ac420b", "14a37c5", "fde32ad"] },
  { board: "Obralyse", title: "Indicadores por período exatos e mais estáveis", prio: "medium", diff: "medium",
    summary: ["Retrato do período sem distorção por alterações posteriores", "Página não cai se o retrato diário falhar", "Filtro de administrativos corrigido"],
    shas: ["4a6ed3c", "2404db8", "4abbbe2"] },
  { board: "Obralyse", title: "Colaboradores: busca por CPF, vencimentos e observações", prio: "medium", diff: "medium",
    summary: ["Busca aceita CPF com pontuação e não perde a seleção", "Vencimento digitável e documento vencido em vermelho", "Observação do colaborador no relatório PDF/Excel"],
    shas: ["17e35c4", "7a6ee07", "56cfd41", "694e0a9", "728e94d"] },
  { board: "Obralyse", title: "Crachá digital do colaborador (QR, Google Wallet e Apple Wallet)", prio: "high", diff: "hard",
    summary: ["Crachá frente/verso com QR e página pública de conferência", "Crachá na carteira do Google e da Apple", "Impressão em uma folha e crachá como etapa do cadastro"],
    shas: ["24e6654", "b88fcac", "08cb37e", "5cdcea6", "619c80c", "8ad6f7d", "5154de0", "75a72c2"] },
  { board: "Obralyse", title: "Controle de Acesso: app integrado, entradas/saídas e relatórios", prio: "high", diff: "hard",
    summary: ["Rotas para o app Controle de Acesso e visitante com foto", "Correções de entrada/saída e de acesso liberado", "Indicadores e relatório por período na aba Acessos", "Salvamento automático sem perder anexos"],
    shas: ["5c51d9c", "106195b", "0e2ad76", "baea48c", "22cc9fa", "c8a7421", "db94101", "019c9a0", "9cf7a95", "851ca60", "ba74413", "b1fb148", "9c9aa24", "a0380a2", "11d597a"] },
  { board: "Obralyse", title: "Controle de Acesso: desligamento, recontratação e avaliação por empresa", prio: "medium", diff: "hard",
    summary: ["Desligar e recontratar preservando o histórico por empresa", "Comparativo de avaliação por empresa na ficha, PDF e Excel", "Painel de colaboradores em mais de uma empresa"],
    shas: ["902d5fd", "f95120d", "f94be7c", "ad0c7c4", "e8bfacd", "72ffd05", "bb3ddb1"] },
  { board: "Obralyse", title: "Linha do tempo documental: status, início da análise e dias até aprovar", prio: "medium", diff: "medium",
    summary: ["Status Pendente/Aprovado/Inconsistente com contadores", "Recebimento e reprovação com data manual e dias corridos até aprovar"],
    shas: ["2556dbd", "ec9f66f", "ae01669", "abb3716", "a57ea1b"] },
  { board: "Obralyse", title: "Vínculo com a conta Microsoft (cargo, e-mail corporativo e Intune)", prio: "medium", diff: "medium",
    summary: ["Cargo e e-mail corporativo sincronizados do Microsoft 365", "Nome e ID do aparelho vindos do Intune"],
    shas: ["a3095db", "66d6199", "a94a6b9", "c083e5b", "2d15a56"] },
  { board: "Obralyse", title: "Treinamentos: exclusão segura, relatório e organização por área", prio: "medium", diff: "medium",
    summary: ["Excluir modelo e treinamento (concluído não pode ser excluído)", "Relatório PDF com lista de presença", "Campo Tema e participantes de todas as obras"],
    shas: ["4e01b8f", "d2683aa", "62e5c28", "35abe4a", "0a74c51", "1534c33", "c6bb831", "498bb1c"] },
  { board: "Obralyse", title: "Treinamentos com validação facial, vencimento e certificado individual", prio: "urgent", diff: "very_hard",
    summary: ["Selfie conferida com a foto do cadastro na Segurança e na Qualidade", "Vencimento no modelo e lançamento automático na ficha", "Certificado individual pelo link de assinatura"],
    shas: ["8ca9cb5", "b9890b7", "5dbf1b7", "3f86f5d", "745eac3", "55ea0d9", "c72ac27", "70e06d2", "e271cfb", "f3e25ba", "bd66938"] },
  { board: "Obralyse", title: "Assinatura eletrônica: selfie ao vivo, prova de vida, links e lembretes", prio: "urgent", diff: "very_hard",
    summary: ["Selfie só pela câmera, com prova de vida (foto de tela é recusada)", "Cada signatário recebe o próprio link; externos por e-mail", "Lembretes automáticos de assinatura pendente", "Evidências guardadas em área privada"],
    shas: ["da329b3", "d96cf35", "446f042", "3acdc18", "30f2586", "18015af", "21b1ac4", "9e4ea2b", "a5b3ef8", "6ed25f4", "dcde3f8", "26cfadd"] },
  { board: "Obralyse", title: "RDO: efetivo pelo controle de acesso, validação e fotos", prio: "medium", diff: "medium",
    summary: ["Efetivo preenchido pelo controle de acesso da obra", "Botão Validar com registro de quem validou", "Miniaturas das fotos no diário"],
    shas: ["ec5c134", "f560260", "741305e", "d2baef9", "d90dcaa"] },
  { board: "Obralyse", title: "Inspeções e Não conformidades: comprovação, responsáveis e exclusão", prio: "medium", diff: "medium",
    summary: ["Resolver NC exige foto/anexo; prazo padrão por severidade", "Responsável pessoa ou empresa", "Respostas Conforme/Não conforme; Pré-obra vira Mobilização"],
    shas: ["d8a45ba", "1d6fb10", "728f1c5", "941ce07", "8272074", "6d6a9b4", "cfe8fef", "f3c8b85", "09d9d1e"] },
  { board: "Obralyse", title: "EPIs e Equipamentos: CA/NS, empréstimo e kit com validação facial", prio: "high", diff: "hard",
    summary: ["CA e NS editáveis e flag de empréstimo", "Entrega de kit de EPIs numa assinatura com foto conferida", "Opção Todas as obras e exclusão de entrega/equipamento"],
    shas: ["9f6f231", "ad7879c", "612f25b", "d039923", "a46d149", "5761655", "b4824d0", "d130928"] },
  { board: "Obralyse", title: "Avisos: sino e notificações push", prio: "medium", diff: "medium",
    summary: ["Sino de avisos e push para responsáveis e validadores"], shas: ["fe0a7c6", "279d4f3", "e1a9a79"] },
  { board: "Obralyse", title: "Auditoria: histórico completo, filtros e exportação", prio: "medium", diff: "medium",
    summary: ["Histórico completo sem apagar registros", "Exportar PDF/Excel de qualquer módulo", "Filtro de colaboradores administrativos"],
    shas: ["d21fbc4", "63647a2", "83faddf", "47c9707", "37d1aa2"] },
  { board: "Obralyse", title: "Desempenho: menos leituras no banco e sistema mais rápido", prio: "medium", diff: "hard",
    summary: ["Coleções sincronizadas em memória com espelho persistente", "Fim de leituras repetidas de permissão e colaboradores"],
    shas: ["c44f59b", "d12ed6d", "dc7e4ec", "11fdb08"] },
  { board: "Obralyse", title: "Admin e permissões: vários níveis, grupos e Admin da área", prio: "high", diff: "hard",
    summary: ["Usuário com mais de um nível de acesso", "Copiar permissões e ver usuários agrupados por acesso", "Admin da área por módulo; menus sem acesso escondidos"],
    shas: ["30505e9", "2ba8770", "636c67c", "c9438af", "2e527a9", "e33fcad", "51a2df7", "cf4c976", "bfc9fb2", "66d1186", "e6ab619", "51977d0"] },
  { board: "Obralyse", title: "Módulo Atas de Reunião completo (F-PEC-02 / F-OBR-03)", prio: "high", diff: "very_hard",
    summary: ["Atas com continuação em série e tipos Administrativo/Obra e Fornecedor", "Participantes buscados no Microsoft 365", "Assinatura eletrônica do fornecedor, itens numerados, prazos e conclusão conferida"],
    shas: ["120dfc0", "8b339f2", "a5af00d", "2ec80d0", "0afe237", "673b013", "33b8766", "e15b11e", "dcd2840", "781cc6c", "2e752bd", "de76a06", "365c944", "cc2001d", "32b7985", "fd5c1ab", "cd30948", "e6023eb", "b037bf5", "7192d80", "448a397", "962b9c4", "6fd68f5", "44f6118"] },
  { board: "Obralyse", title: "Integração com o app CheckObra: módulos, permissões e assinaturas", prio: "high", diff: "very_hard",
    summary: ["Infraestrutura, RDO, Equipamentos, EPIs, Treinamentos, Atas e Controle de Acesso disponíveis para o app", "Edição e exclusão conforme o nível de cada pessoa", "Inspeções por modelo e checklists do app no computador", "App assina treinamento e ata no aparelho, inclusive offline"],
    shas: ["a31b6a6", "beb07bb", "f9bdb31", "6575e62", "dc7307b", "f3f31ae", "1430c00", "9090eab", "5c4d87a", "89c8c22", "be9a408", "8f1a19c", "cfe7bad", "b614659", "6905e41", "d7f22f9", "d5901ff", "d3f89c4", "00a53ef", "7ab87c9"] },
  { board: "Obralyse", title: "Módulo Infraestrutura: máquinas, combustível, materiais e chuva", prio: "high", diff: "very_hard",
    summary: ["Controle de máquinas, horímetro, combustível e materiais", "Chuva por período e alertas automáticos", "Fichas do app preenchidas e editadas no computador"],
    shas: ["da29734", "38874c6", "b26ea0b", "f3262ac", "1be0fb0", "04430e7", "a54e925", "de0a213", "a9cdfce", "d2170f7"] },
  { board: "Obralyse", title: "Cadastro de Empresas (responsáveis, PCMSO/PGR e documentos)", prio: "medium", diff: "medium",
    summary: ["Empresas com responsáveis, vigências e documentos ligados aos colaboradores", "Botão de baixar em todo anexo do sistema"],
    shas: ["53cbffd", "4364f84", "95308d9", "500309f"] },
  { board: "Obralyse", title: "Dashboard e ajustes de interface", prio: "low", diff: "easy",
    summary: ["Visão 360 direto na obra", "Logo configurável e fotos no dashboard", "Formulário não perde o preenchido se der erro ao salvar"],
    shas: ["d8564f9", "e94740c", "6a1b84b", "191f940", "c926a26", "df66ce5", "74174c5", "58159a8"] },

  // CheckObra (app)
  { board: "CheckObra", title: "Infraestrutura no app: modelos em pastas e sincronização offline", prio: "high", diff: "hard",
    summary: ["Departamento de Infraestrutura com os modelos de fichas", "Empresas e máquinas vindas do Obralyse; prefixo preenche a ficha"],
    shas: ["575312f", "bcd5c44", "091c455", "ee82ab2", "6e5841f", "6544ff0"] },
  { board: "CheckObra", title: "RDO no app no formato do Obralyse", prio: "medium", diff: "medium", summary: ["Tela própria com preenchimento automático"], shas: ["f326b91"] },
  { board: "CheckObra", title: "Rascunhos, edição e exclusão de fichas", prio: "medium", diff: "medium",
    summary: ["Ficha enviada só o master edita", "Ficha apagada no Obralyse some do histórico do aparelho", "Rascunho pertence a quem está logado"],
    shas: ["fc1df5a", "f6582f5", "fa158ca", "1c19512", "0879d8d", "126e59b"] },
  { board: "CheckObra", title: "Publicação Android/Intune e controle de versões", prio: "medium", diff: "medium",
    summary: ["Primeira publicação no Intune e na Play Store", "Nome e ID do aparelho pela configuração gerenciada", "Versão do app enviada ao Obralyse"],
    shas: ["5e767b5", "e5d1a1f", "ad304b2", "863c794", "59829b9", "c2a7f13", "8577287", "cec3f86", "6eb3bba", "b0041aa", "d3b219e", "ad0f217"] },
  { board: "CheckObra", title: "Nova tela Início por módulos e conta do aparelho", prio: "medium", diff: "medium",
    summary: ["Início organizado por módulos com padrão visual único", "Bloco do aparelho com ID, versão e Sair"],
    shas: ["95e8e43", "e41edbd", "11ddc80", "9a3f0cb", "b5d1f0d", "a69282f"] },
  { board: "CheckObra", title: "Novos módulos: Equipamentos, EPIs, Treinamentos, Atas e Controle de Acesso", prio: "high", diff: "very_hard",
    summary: ["Módulos do Obralyse disponíveis no app", "Crachá do colaborador e kit de EPIs com foto conferida"],
    shas: ["1053389", "5e90077", "8357ec2", "515297b", "d25e9b9", "7306496"] },
  { board: "CheckObra", title: "Segurança: Avaliação SST, histórico e inspeções por modelo", prio: "medium", diff: "medium",
    summary: ["Checklist FOR.SEG.02", "Histórico traz as fichas do Obralyse", "Inspeções por modelo no app"],
    shas: ["f06010b", "c6458dc", "fb237c8", "81c905a", "6b0df8c"] },
  { board: "CheckObra", title: "Assinar treinamento e ata no app, sem internet", prio: "high", diff: "hard", summary: ["Assinatura dentro do app, inclusive offline"], shas: ["60bab3e"] },

  // OpenTicket
  { board: "OpenTicket", title: "Escrituração: forma de pagamento para contas de consumo", prio: "medium", diff: "easy", summary: ["CPFL, Água e Telefone como forma de pagamento"], shas: ["f612dbf"] },
  { board: "OpenTicket", title: "Relatório PDF de chamados finalizados e tempo de atendimento", prio: "medium", diff: "medium",
    summary: ["Relatório pessoal de finalizados do atendente", "Tempo em horário comercial e SLA pausado nas esperas", "Ranking do painel mais leve"],
    shas: ["92da1d8", "f96fddd", "4da0e5a"] },
  { board: "OpenTicket", title: "Escrituração: leitura da nota no PDF e bloqueio de nota já lançada no Sienge", prio: "high", diff: "hard",
    summary: ["Lê a nota do PDF e trava chamado duplicado", "Bloqueia nota já escriturada no Sienge", "Opção 'É fatura'"],
    shas: ["b7198dd", "9100020", "db58e55", "033cfee", "0086268", "9017f67", "f4526cf", "52ccf19"] },
  { board: "OpenTicket", title: "Chat da Escrituração confere o PDF no Sienge", prio: "medium", diff: "medium",
    summary: ["PDF anexado no chat é conferido e bloqueia nota já escriturada"], shas: ["6763cda", "92cdddc", "73f2d5c", "b8d3b69", "5e52a3c"] },
  { board: "OpenTicket", title: "Meus Chamados com filtro por departamento e colar print na abertura", prio: "low", diff: "easy",
    summary: ["Filtro por departamento de destino", "Colar print (Ctrl+V) em anexos", "Chat sem envio em loop"],
    shas: ["e4d9363", "a91c65f", "58e3901", "acf6edf", "b0c0c01", "ef08bc1"] },

  // NotaFinder
  { board: "NotaFinder", title: "Empresas fora do Sienge e PIX enviado ao Sienge", prio: "medium", diff: "medium",
    summary: ["Cadastro de empresas que não estão no Sienge", "Descrição do PIX com chave e favorecido"], shas: ["4582624", "a94328b", "ff82616"] },
  { board: "NotaFinder", title: "Desempenho: lista via servidor com cache", prio: "high", diff: "medium",
    summary: ["Fim dos downloads repetidos de 10 MB", "Lista via servidor com cache de 5 min"],
    shas: ["d5dfb70", "a13a144", "bdea95c", "2eb88a6", "d88746d", "62378f3", "fd7a38c", "b4b2a05"] },
  { board: "NotaFinder", title: "Notas escrituradas no Sienge vão sozinhas para Finalizadas", prio: "high", diff: "hard",
    summary: ["Sincronização diária e de hora em hora em horário comercial", "Inclui notas do módulo Fiscal do Sienge"],
    shas: ["e5f654c", "f371492", "ca796cb", "a4491b3", "99f37e6", "f4e6adf", "337da9c", "9b85e60", "5c392eb", "d606c74", "3961c65"] },
  { board: "NotaFinder", title: "Sincronização manual controlada no Painel Admin", prio: "medium", diff: "easy",
    summary: ["Liberada por e-mail com histórico de cliques", "Pesquisa encontra notas finalizadas pelo Sienge"], shas: ["f1fb1bf", "0254375", "e974044", "f7b8a6b", "1ce6dc0"] },
  { board: "NotaFinder", title: "Consulta de NFS-e, NF-e e CT-e na SEFAZ/ADN", prio: "medium", diff: "medium",
    summary: ["Consulta NFS-e na ADN corrigida", "Respeita a espera de 1 hora da SEFAZ", "Ciência da operação enviada nos resumos de NF-e"], shas: ["dd7999d", "89758b8", "592fdd8", "f58311b"] },

  // RoshSign
  { board: "RoshSign", title: "Correções de carimbos, hash e trilha de auditoria", prio: "high", diff: "medium",
    summary: ["Carimbos e hash não somem em PDF já assinado", "Auditoria em horário de Brasília"], shas: ["16a50ef", "0819c42", "a771172", "fd321cf"] },
  { board: "RoshSign", title: "Busca global de documentos e limite de upload configurável", prio: "medium", diff: "easy",
    summary: ["Busca na tela de pastas", "Limite de PDF ajustável (padrão 50 MB)"], shas: ["defc91b", "d709646"] },
  { board: "RoshSign", title: "Fluxo de assinatura de convidados sem erros", prio: "medium", diff: "medium",
    summary: ["Convidado não cai em erro ao assinar", "Link cancelado com mensagem clara"], shas: ["6a5764a", "1be0afc", "f67d370"] },

  // T.I (demais sistemas)
  { board: "T.I", title: "Rosh Conecta: link para o GED e fotos de perfil", prio: "low", diff: "easy", summary: ["Atalho para o GED", "Fotos de perfil fora do Realtime Database"], shas: ["e8c6b16", "fbbbc98"] },
  { board: "T.I", title: "GED: lista mestra, avisos de publicação e visualização em grade/lista", prio: "medium", diff: "medium",
    summary: ["Lista mestra visível ao super admin", "Aviso de publicação por pasta com permissão própria"], shas: ["f8571b9", "bdc955f", "bf8b5c6", "3e455eb", "7c51c6c"] },
  { board: "T.I", title: "App Controle de Acesso: API do Obralyse, QR e reconhecimento facial", prio: "high", diff: "hard",
    summary: ["App migrado para a API do Obralyse", "QR como modo principal, ID do crachá e foto do visitante", "Facial e anti-fraude funcionando no APK"],
    shas: ["b2de83a", "71cbf8a", "75f50c1", "b2a73db", "a72f737", "7082bf3", "0defe54", "dfd9964"] },
  { board: "T.I", title: "Rosh Approval: correções do app", prio: "low", diff: "easy", summary: ["Pacote Android e inicialização corrigidos"], shas: ["ddb6980", "a61bbe4", "58cc08a"] },
  { board: "T.I", title: "Landing Page: telefone e WhatsApp atualizados", prio: "low", diff: "easy", summary: ["Novo número de contato"], shas: ["003a813"] },
];

// ───────────── Chamados ─────────────
// Correções de linhas do PDF em que as colunas se sobrepõem.
const TICKET_FIX: Record<string, Partial<Ticket>> = {
  "TEC-680": { assunto: "Incluir forma de pagamento CPFL/Água/Telefone (contas de consumo) na escrituração - Nexus", tema: "Desenvolvimento" },
  "TEC-681": { assunto: "Auditoria de Escrituração", tema: "Desenvolvimento" },
  "TEC-541": { assunto: "Incluir justificativa", tema: "Atualização de Sistema (Prod)" },
  "TEC-540": { assunto: "Inserção de campos no sistema para acompanhamento de métricas", tema: "Atualização de Sistema (Prod)" },
  "TEC-495": { assunto: "Erro em abertura de chamado", tema: "Atualização de Sistema (Prod)" },
  "TEC-493": { assunto: "API - Sienge x Prevision", tema: "Liberação Sienge - Alteração de Parâmetros" },
  "TEC-723": { assunto: "Criação/desenvolvimento de um módulo Ata de Reunião", tema: "Desenvolvimento" },
  "TEC-458": { tema: "Liberações Sienge - Obra/Empresa/Departamento", solicitante: "Julio Souza" },
  "TEC-293": { assunto: "Acesso ao controle de acesso da obra São Vicente", tema: "Liberações de acessos" },
};
// Chamados cujo sistema não dá pra deduzir pelo texto.
const TICKET_BOARD: Record<string, string> = { "TEC-716": "RoshSign", "TEC-541": "RoshSign", "TEC-800": "T.I", "TEC-873": "T.I" };

function boardForTicket(t: Ticket): string {
  if (TICKET_BOARD[t.id]) return TICKET_BOARD[t.id];
  const s = `${t.assunto} ${t.tema}`;
  if (/CNPJ|Finder|Fider|Finter|NFSE|Portal Nacional|FIFO|Certificado Digital/i.test(s)) return "NotaFinder";
  if (/\bGED\b|Ged\b/.test(s)) return "T.I";
  if (/RoshSign|Assinaturas|RoshSignature|Arquivo em assinaturas/i.test(s)) return "RoshSign";
  if (/Nexus|abertura de chamado|responder chamado|CHAMADOS N|Escritura|SCs atendidas|adiantamento/i.test(s)) return "OpenTicket";
  if (/Conecta|HUB|Plotter|GPT|LandingPage|Produto Fiscal|Prevision|Controle de Acesso|AccessControl|Assinatura - E-mail|Instala..o de software/i.test(s)) return "T.I";
  if (/Obralyse|Obrayse|EPI|Ata de Reuni|treinamento|check list|avalia..o de seguran|Facial|Cargo|vencimento de documentos|Bloqueio|Inativa|m.tricas|anexo|diario de obra|Qualidade|Melhoria no sistema|Atualiza..o no sistema|Acesso ao Sistema|Libera..o no acesso|Libera..o Acesso|Libera..o de Acesso|Adicionar Campos|exclus.o de informa|inserir e atualizar/i.test(s)) return "Obralyse";
  return "T.I";
}

const PRIO: Record<string, Prio> = { Alta: "high", "Média": "medium", Baixa: "low" };
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const parseBr = (s: string) => {
  // Em linhas sobrepostas do PDF a hora às vezes se perde; aí vale meio-dia.
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4}),?\s*(?:(\d{2}):(\d{2}))?/);
  return m ? new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4] ?? "12"}:${m[5] ?? "00"}:00-03:00`) : new Date(NaN);
};
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const br = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
const isRoutine = (t: Ticket) => /Bloquear Visualiza..o CNPJ|Libera..o de Acessos|Libera..es de acessos/i.test(t.tema);

type CardPlan = {
  board: string; title: string; prio: Prio; diff: Diff; html: string; start: Date; end: Date;
  subtasks: string[];
};

function planCards(commits: Commit[], tickets: Ticket[]): CardPlan[] {
  const by7 = new Map(commits.map((c) => [c.sha.slice(0, 7), c]));
  const plans: CardPlan[] = [];

  const used = new Set<string>();
  for (const g of G) {
    const cs = g.shas.map((s) => {
      if (!by7.has(s)) console.log(`⚠️  sha desconhecido: ${s} (${g.title})`);
      if (used.has(s)) console.log(`⚠️  sha em 2 cards: ${s}`);
      used.add(s);
      return by7.get(s);
    }).filter((c): c is Commit => !!c).sort((a, z) => a.date.localeCompare(z.date));
    if (!cs.length) continue;
    const repos = [...new Set(cs.map((c) => c.repo))];
    const start = new Date(cs[0].date), end = new Date(cs[cs.length - 1].date);
    plans.push({
      board: g.board, title: g.title, prio: g.prio, diff: g.diff, start, end,
      subtasks: cs.map((c) => c.msg),
      html: [
        `<p><strong>Período:</strong> ${br(start)}${br(start) === br(end) ? "" : " a " + br(end)} · <strong>Origem:</strong> git (${cs.length} commit(s))</p>`,
        `<p><strong>Repositório:</strong> ${repos.map((r) => `<a href="https://github.com/Rosh-Participacoes/${r}" target="_blank" rel="noopener noreferrer">${r}</a>`).join(", ")}</p>`,
        `<h3>O que foi entregue</h3><ul>${g.summary.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>`,
        `<h3>Commits</h3><ul>${cs.map((c) => `<li>${br(new Date(c.date))} — ${esc(c.msg)} <a href="https://github.com/Rosh-Participacoes/${c.repo}/commit/${c.sha}" target="_blank" rel="noopener noreferrer"><code>${c.sha.slice(0, 7)}</code></a></li>`).join("")}</ul>`,
      ].join("\n"),
    });
  }
  const orphans = commits.filter((c) => !used.has(c.sha.slice(0, 7)));
  console.log(`📦 git: ${commits.length} commits, ${commits.length - orphans.length} em cards, ${orphans.length} sem card`);
  for (const o of orphans) console.log(`   sem card: ${o.repo} ${o.sha.slice(0, 7)} ${o.msg}`);

  // Chamados: concluídos a partir de 01/09/2026
  const since = new Date("2026-09-01T00:00:00-03:00");
  const fixed = tickets.map((t) => ({ ...t, ...TICKET_FIX[t.id] }));
  const inRange = fixed.filter((t) => parseBr(t.conclusao) >= since);
  console.log(`🎫 chamados: ${tickets.length} no anexo, ${inRange.length} concluídos desde 01/09 (${tickets.length - inRange.length} concluídos em agosto ficaram de fora)`);

  const ticketLine = (t: Ticket) =>
    `<li><strong>${t.id}</strong> — ${esc(t.assunto)} · ${esc(t.solicitante)} · ${t.status} · aberto ${br(parseBr(t.abertura))}, concluído ${br(parseBr(t.conclusao))}</li>`;

  // Rotineiros (bloqueio de CNPJ, liberação de acesso) agrupados por board e mês.
  const routine = new Map<string, Ticket[]>();
  for (const t of inRange.filter(isRoutine)) {
    const d = parseBr(t.conclusao);
    const kind = /CNPJ/i.test(t.tema) ? "Bloqueios de CNPJ" : "Liberações de acesso";
    const key = `${boardForTicket(t)}|${kind}|${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    routine.set(key, [...(routine.get(key) ?? []), t]);
  }
  for (const [key, list] of routine) {
    const [board, kind, ym] = key.split("|");
    const sorted = list.sort((a, z) => parseBr(a.conclusao).getTime() - parseBr(z.conclusao).getTime());
    plans.push({
      board, title: `Chamados: ${kind} — ${MONTHS[+ym.slice(5) - 1]}/${ym.slice(0, 4)} (${list.length})`,
      prio: "low", diff: "easy", start: parseBr(sorted[0].abertura), end: parseBr(sorted[sorted.length - 1].conclusao),
      subtasks: sorted.map((t) => `${t.id} — ${t.assunto} (${t.solicitante})`),
      html: `<p><strong>Origem:</strong> chamados do OpenTicket (atendente Eduardo Sodré) · <strong>Tema:</strong> ${esc(sorted[0].tema)}</p><ul>${sorted.map(ticketLine).join("")}</ul>`,
    });
  }

  // Demais chamados: um card por chamado.
  for (const t of inRange.filter((t) => !isRoutine(t))) {
    const start = parseBr(t.abertura), end = parseBr(t.conclusao);
    plans.push({
      board: boardForTicket(t), title: `Chamado ${t.id} · ${t.assunto}`,
      prio: PRIO[t.prioridade] ?? "medium", diff: /Desenvolvimento/i.test(t.tema) ? "hard" : "medium", start, end, subtasks: [],
      html: [
        `<p><strong>Origem:</strong> chamado ${t.id} do OpenTicket (atendente Eduardo Sodré)</p>`,
        `<ul><li><strong>Tema:</strong> ${esc(t.tema)}</li><li><strong>Solicitante:</strong> ${esc(t.solicitante)}</li><li><strong>Prioridade:</strong> ${esc(t.prioridade)}</li>`,
        `<li><strong>Status no OpenTicket:</strong> ${esc(t.status)}</li><li><strong>Aberto em:</strong> ${esc(t.abertura)}</li><li><strong>Concluído em:</strong> ${esc(t.conclusao)}</li></ul>`,
      ].join("\n"),
    });
  }
  return plans;
}

async function main() {
  if (!COMMITS_PATH || !TICKETS_PATH) throw new Error("uso: npx tsx scripts/seed-out-nov.ts <commits.json> <chamados.json> [--apply]");
  const commits: Commit[] = JSON.parse(readFileSync(COMMITS_PATH, "utf8"));
  const tickets: Ticket[] = JSON.parse(readFileSync(TICKETS_PATH, "utf8"));
  const plans = planCards(commits, tickets);

  // Trava: confere o workspace antes de qualquer coisa.
  const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, WS_ID));
  const [owner] = ws ? await db.select().from(users).where(eq(users.id, ws.ownerId)) : [];
  if (!ws || ws.name !== WS_NAME || owner?.email !== OWNER_EMAIL) throw new Error(`Workspace de destino não confere: ${ws?.name} / ${owner?.email}`);
  console.log(`🔒 destino: "${ws.name}" (${ws.id}), dono ${owner.email}`);

  const boards = await db.select().from(kanbanBoards).where(eq(kanbanBoards.workspaceId, WS_ID));
  const byBoard = new Map<string, CardPlan[]>();
  for (const p of plans) byBoard.set(p.board, [...(byBoard.get(p.board) ?? []), p]);
  for (const [name, list] of byBoard) {
    const existing = boards.find((b) => b.name === name && b.createdById === owner.id);
    console.log(`\n📋 ${name} ${existing ? "(existente)" : "(NOVO board)"} — ${list.length} cards`);
    for (const p of list.sort((a, z) => a.end.getTime() - z.end.getTime())) console.log(`   ${br(p.end)} [${p.prio}] ${p.title}${p.subtasks.length ? ` (${p.subtasks.length} subtarefas)` : ""}`);
  }
  console.log(`\nTotal: ${plans.length} cards`);
  if (!APPLY) { console.log("(simulação — rode com --apply para gravar)"); process.exit(0); }

  let created = 0, skipped = 0;
  for (const [name, list] of byBoard) {
    let b = boards.find((x) => x.name === name && x.createdById === owner.id);
    if (!b) {
      [b] = await db.insert(kanbanBoards).values({ workspaceId: WS_ID, name, description: BOARD_STYLE[name]?.desc, color: BOARD_STYLE[name]?.color ?? "#4f6ef7", isPersonal: true, createdById: owner.id }).returning();
      await db.insert(kanbanColumns).values([
        { boardId: b.id, name: "A Fazer", order: 0, color: "#64748b" },
        { boardId: b.id, name: "Em Progresso", order: 1, color: "#4f6ef7" },
        { boardId: b.id, name: "Concluído", order: 2, color: "#10b981" },
      ]);
      console.log(`📋 board criado: ${name}`);
    }
    if (b.workspaceId !== WS_ID) throw new Error(`board fora do workspace: ${b.id}`);
    const cols = await db.select().from(kanbanColumns).where(eq(kanbanColumns.boardId, b.id));
    const done = cols.find((c) => /conclu/i.test(c.name)) ?? cols.sort((a, z) => z.order - a.order)[0];

    for (const p of list) {
      const dup = await db.select({ id: kanbanCards.id }).from(kanbanCards).where(and(eq(kanbanCards.boardId, b.id), eq(kanbanCards.title, p.title)));
      if (dup.length) { skipped++; continue; }
      const [card] = await db.insert(kanbanCards).values({
        columnId: done.id, boardId: b.id, title: p.title, description: p.html, priority: p.prio, difficulty: p.diff,
        status: "done", order: created, startDate: p.start, completedAt: p.end, createdAt: p.start, updatedAt: p.end,
        createdById: owner.id, assignedToId: owner.id,
      }).returning();
      if (p.subtasks.length)
        await db.insert(cardSubtasks).values(p.subtasks.map((t, i) => ({ cardId: card.id, title: t.slice(0, 250), isDone: true, order: i, assignedToId: owner.id })));
      created++;
    }
  }
  console.log(`✅ ${created} cards criados, ${skipped} já existiam`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
