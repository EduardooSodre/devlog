# DevLog

> **Seu diário de desenvolvimento pessoal.**
> Kanban, documentação com antes/depois, notas de refatoração — tudo em um só lugar.

---

## Stack

| Tecnologia | Versão | Propósito |
|---|---|---|
| Next.js | 16 (App Router) | Framework principal |
| TypeScript | 5 | Tipagem estática |
| Tailwind CSS | 3 | Estilização |
| Drizzle ORM | 0.45 | ORM type-safe |
| NeonDB | serverless | PostgreSQL serverless |
| NextAuth v5 | 5 beta | Autenticação |
| Cloudinary | — | Upload de imagens |
| @hello-pangea/dnd | 16 | Drag & drop Kanban |
| Stripe | 15 | Pagamentos (SaaS) |
| TipTap | 2 | Editor rich text nas docs |
| Sonner | 1 | Notificações toast |

---

## Instalação

### 1. Clone e instale dependências

```bash
git clone <repo>
cd devlog
npm install
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha o `.env.local` (veja [.env.example](.env.example) para a lista completa):

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
```

### 3. Configure o banco de dados

```bash
npm run db:push      # aplica schema (dev)
# ou
npm run db:migrate   # migrations versionadas
npm run db:studio    # visualizador
```

### 4. Rode em desenvolvimento

```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## Estrutura de Pastas

```
src/
├── app/
│   ├── (auth)/              # Login, Register
│   ├── (dashboard)/         # Área autenticada
│   │   ├── dashboard/
│   │   ├── kanban/
│   │   ├── docs/
│   │   └── settings/
│   └── api/
├── components/
│   ├── layout/              # Sidebar, WorkspaceSwitcher
│   ├── docs/                # EditDocForm, TipTapEditor
│   └── kanban/
├── lib/
│   ├── auth.ts
│   ├── plans.ts             # Planos e limites
│   ├── workspace.ts         # Multi-workspace + usage
│   ├── stripe.ts
│   └── db/
└── types/
```

---

## Features

### Implementadas

- Autenticação — Email/senha, GitHub, Google
- Kanban — Boards, colunas, cards com drag & drop
- Documentação — TipTap, tipos, antes/depois (Cloudinary)
- Tags — Filtro e associação em documentações
- Multi-workspace — Seletor de workspace ativo
- SaaS — Planos, limites nas APIs, Stripe checkout + webhook
- Export — Markdown e HTML (imprimir como PDF)
- Convites — Envio e aceite de membros ao workspace
- API pública — `GET /api/public/v1/docs` com API key
- Notificações — Alertas de prazos no Kanban

---

## Comandos

```bash
npm run dev          # Desenvolvimento
npm run build        # Build de produção
npm run lint         # ESLint
npm run test         # Testes (Vitest)
npm run db:push      # Schema ao banco
npm run db:migrate   # Migrations
npm run db:studio    # Drizzle Studio
```

---

## Deploy (Vercel)

1. Push para GitHub
2. Conecte no [vercel.com](https://vercel.com)
3. Adicione as variáveis de ambiente do `.env.example`
4. Deploy automático

---

## Licença

MIT
