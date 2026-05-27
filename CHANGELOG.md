# Changelog — DevLog

> Formato: [Semver](https://semver.org/) · Tipos: `feat`, `fix`, `refactor`, `docs`, `chore`

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
