# DevLog — O que já existe (visão geral direta)

> Atualizado em: 2026-07-13
> Objetivo deste arquivo: explicar em linguagem simples tudo que já foi construído no DevLog, o que funciona de verdade e o que está pronto no código mas ainda não ligado. Sem enrolação.

---

## O que é o DevLog

Um SaaS pessoal (feito por Eduardo) para documentar o trabalho de desenvolvimento na Rosh: um Kanban para organizar tarefas e um sistema de documentação para registrar refatorações, features, bugfixes, notas e reuniões — com fotos de antes/depois.

Multi-workspace (times), com planos Free/Pro/Enterprise e Stripe pronto (mas desligado).

---

## 1. Login e cadastro

- **E-mail e senha**: funciona 100%. Senha guardada com hash (bcrypt).
- **Login com GitHub e Google**: o código já está pronto e os botões aparecem na tela, **mas não funcionam ainda** porque faltam as chaves (`AUTH_GITHUB_ID/SECRET`, `AUTH_GOOGLE_ID/SECRET`) no `.env`. Pra ativar, é só criar os apps OAuth no GitHub/Google e colar as chaves.
- Quando alguém cria conta (por OAuth), o sistema já cria um workspace pessoal pra essa pessoa automaticamente.
- Quem não está logado é jogado pra tela de login; quem já está logado não consegue voltar pra tela de login.

## 2. Workspaces (times)

- Cada pessoa pode estar em um ou mais workspaces, com papel de dono, admin ou membro.
- Dá pra convidar gente por e-mail (link de convite que expira em 7 dias).
- Três planos: **Free** (1 board, 50 docs, 100MB), **Pro** (R$39/mês, praticamente ilimitado), **Enterprise** (sob consulta).
- Os limites do plano são **checados de verdade** — no Free não dá pra criar um segundo board, por exemplo.

## 3. Kanban

- Vários boards por workspace, cada um com cor própria.
- Colunas livres (cria/renomeia/apaga quantas quiser). Board novo já vem com "A Fazer", "Em Progresso", "Concluído".
- Arrastar e soltar cards entre colunas (com salvamento automático).
- Um jeito de arrastar o board inteiro para o lado (feito à mão, parecido com Figma/Trello).
- Cada card tem: título, descrição (texto rico), prioridade (baixa/média/alta/urgente), status, prazo (due date), responsável, e notas de conclusão.
- Modal do card com 3 abas: Detalhes, Anexos (fotos/screenshots) e Conclusão.
- Aviso automático de cards com prazo vencido ou vencendo hoje.

## 4. Documentação

- 6 tipos de entrada: Refatoração, Feature, Bugfix, Ajuste, Nota, Reunião.
- Editor de texto rico + upload de fotos "antes" e "depois" (ótimo pra refatorações visuais).
- Tags pra organizar e filtrar as entradas.
- Exportar qualquer entrada em Markdown ou HTML — **essa exportação só funciona no plano Pro**.

## 5. Dashboard

- Resumo com: total de cards, cards concluídos, total de docs, boards ativos.
- Lista das 5 docs mais recentes e das 5 tarefas mais recentes.

## 6. Pagamento (Stripe)

- Todo o código de cobrança está **pronto e funcional**, mas **desligado** — faltam as chaves reais do Stripe no `.env` (`STRIPE_SECRET_KEY`, price IDs, etc.).
- Quando alguém clica em "Fazer upgrade" hoje, dá erro amigável avisando que o Stripe não está configurado.
- Pra ligar de verdade: criar conta Stripe → criar o produto/preço "Pro" → colar as chaves no `.env` → configurar o webhook apontando pra `/api/webhooks/stripe`.

## 7. Upload de imagens

- Feito via **Cloudinary** (não UploadThing, apesar de um comentário desatualizado no código ainda citar UploadThing).

## 8. API pública

- Existe uma rota (`/api/public/v1/docs`) pra buscar as documentações de um workspace de fora do sistema, protegida por uma chave de API (`DEVLOG_PUBLIC_API_KEY`). Útil pra integrar com outra ferramenta no futuro.

## 9. Coisas com "esqueleto pronto" mas sem tela ainda

- **Comentários em cards**: a tabela existe no banco, mas não tem botão nem API pra usar.
- **Tags em cards** (diferente de tags em docs, que já funciona): também só existe no banco.
- **Deletar conta**: o botão aparece em Configurações, mas ainda não faz nada.

## 10. Scripts de manutenção (rodados manualmente, sem UI)

Ficam em `scripts/`, rodados com `npx tsx scripts/<arquivo>.ts`:

- **`check-db.ts`** — mostra rapidinho quais workspaces um usuário tem e quantos boards/docs em cada um. Serve pra diagnosticar o banco sem abrir um cliente SQL.
- **`migrate-to-main-workspace.ts`** — script único que já foi usado para juntar dois workspaces duplicados em um só.
- **`seed-rosh.ts`** — o mais importante: pega os 109 commits reais dos projetos da Rosh (arquivo `rosh-commits.json`) e importa tudo pro DevLog automaticamente — cria um card por commit (já concluído, com a data real) e uma documentação por projeto. Foi assim que todo o histórico de trabalho na Rosh entrou no sistema.

---

## Resumo rápido: funciona vs. falta plugar

| Funciona 100% | Falta só configurar/plugar |
|---|---|
| Login e-mail/senha | Login GitHub/Google (falta chave OAuth) |
| Workspaces, convites, limites de plano | Pagamento Stripe (falta chave Stripe) |
| Kanban completo (boards, cards, drag-and-drop, anexos, prazos) | — |
| Documentação (6 tipos, antes/depois, tags, exportação) | — |
| Dashboard com estatísticas | — |
| Upload de imagens (Cloudinary) | — |
| API pública de docs | — |
| — | Comentários em card, tags em card, deletar conta (sem tela) |
