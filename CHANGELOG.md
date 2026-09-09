# Changelog — DevLog

> Formato: [Semver](https://semver.org/) · Tipos: `feat`, `fix`, `refactor`, `docs`, `chore`

---

## [0.1.1] — 2026-07-13 — Ambiente travado + mapeamento completo

### Corrigido

- `fix`: **Ambiente de desenvolvimento "em loop infinito"**. Não era um bug no código — eram 34 processos `node.exe` acumulados na máquina de execuções antigas do `npm run dev` que nunca foram encerradas (Ctrl+C não usado / terminal fechado direto). Um deles estava preso na porta 3000 havia tempo, consumindo 1.1GB de RAM e fazendo cada nova tentativa de rodar o projeto "travar" sem nunca subir de verdade.

#### Causa

Processos zumbis do Next.js/Turbopack acumulando a cada nova execução, disputando porta e memória.

#### Solução

Encerrados todos os processos `node.exe` travados (`taskkill /F /IM node.exe /T`). Servidor voltou a subir limpo em ~450ms na porta 3000.

### Impacto

Se isso voltar a acontecer: sempre pare o `npm run dev` com Ctrl+C antes de fechar o terminal. Em caso de dúvida, rodar `tasklist | findstr node` no PowerShell mostra se há processos antigos ainda vivos.

### Adicionado

- `docs`: [`docs/o-que-existe.md`](docs/o-que-existe.md) — visão geral direta de tudo que já está implementado no DevLog (auth, workspaces, Kanban, documentação, billing, API pública, scripts de automação) e o que está pronto no código mas ainda não ligado (OAuth, Stripe).

---

## [0.1.0] — 2025-01-XX — Release inicial

### Adicionado
- `feat`: Autenticação completa com NextAuth v5 (email/senha, GitHub, Google)
- `feat`: Quadro Kanban com drag & drop (@hello-pangea/dnd)
- `feat`: Card Modal com abas: Detalhes, Anexos, Conclusão
- `feat`: Sistema de documentação com tipos (refatoração, feature, bugfix, ajuste, nota, reunião)
- `feat`: Upload de imagens antes/depois para entradas de refatoração
- `feat`: Dashboard com stats (cards, documentações, boards)
- `feat`: Sidebar colapsável com navegação
- `feat`: Schema completo NeonDB + Drizzle ORM
- `feat`: Estrutura SaaS: workspaces, planos, subscriptions (Stripe-ready)
- `feat`: Webhook Stripe para gerenciar assinaturas
- `docs`: README com guia de instalação
- `docs`: ARCHITECTURE.md com diagrama ER e decisões técnicas

### Estrutura criada
- `src/lib/db/schema.ts` — 15 tabelas com relações completas
- `src/lib/auth.ts` — NextAuth com Drizzle adapter
- `src/lib/stripe.ts` — Cliente Stripe + helpers de checkout
- `src/middleware.ts` — Proteção de rotas
- `src/app/api/` — 8 rotas de API (auth, kanban, docs, upload, stripe)

---

## Template para próximas entradas

```markdown
## [X.Y.Z] — YYYY-MM-DD — Título da versão

### Adicionado
- `feat`: Descrição da nova funcionalidade

### Corrigido
- `fix`: Descrição do bug corrigido

### Refatorado
- `refactor`: Descrição da refatoração

#### Antes
```código antes```

#### Depois
```código depois```

### Motivação
Por que essa mudança foi feita?

### Impacto
O que mudou para o usuário / para o sistema?
```

---

## Guia de uso para refatorações

Quando fizer uma refatoração significativa, documente no DevLog:

1. Crie uma entrada em `/docs/new` com tipo **Refatoração**
2. No campo "Antes": cole o código/screenshot antigo
3. No campo "Depois": cole o código/screenshot novo
4. No conteúdo: explique a motivação e o ganho
5. Adicione tags relevantes

Isso cria um histórico visual e consultável de toda sua evolução técnica.
