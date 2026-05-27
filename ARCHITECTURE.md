# Arquitetura — DevLog

## Visão Geral

```
┌────────────────────────────────────────────────────────────┐
│                        DevLog                              │
│   Landing │ Auth │ Dashboard + Kanban + Docs + Settings   │
│                             │                              │
│                    NextAuth v5 (JWT)                       │
│                             │                              │
│   API Routes: auth, kanban, docs, upload, stripe, public   │
│                             │                              │
│            Drizzle ORM + NeonDB (PostgreSQL)               │
│                             │                              │
│   Cloudinary (uploads)  │  Stripe (SaaS/billing)          │
└────────────────────────────────────────────────────────────┘
```

---

## Multi-tenancy

Workspaces isolam dados por `workspaceId`. O workspace ativo é armazenado no cookie `devlog-workspace`.

Limites por plano (definidos em `src/lib/plans.ts`, aplicados nas APIs):

| Recurso | Free | Pro |
|---|---|---|
| Membros | 1 | 20 |
| Boards | 1 | ∞ |
| Docs | 50 | ∞ |
| Armazenamento | 100 MB | 10 GB |

---

## Uploads

Imagens são enviadas via **Cloudinary** (`POST /api/upload`). O cliente usa `uploadToCloudinary` em `src/lib/cloudinary.ts`.

---

## Billing

- Checkout: `POST /api/stripe/checkout`
- Portal: `POST /api/stripe/portal`
- Webhook: `POST /api/webhooks/stripe`

---

## API pública

`GET /api/public/v1/docs?workspaceId=...` com header `Authorization: Bearer <DEVLOG_PUBLIC_API_KEY>`.

---

## Segurança

- Senhas: bcrypt (cost 12)
- JWT com `AUTH_SECRET`
- Middleware em rotas autenticadas
- Queries filtradas por workspace + membership
- Stripe webhooks com assinatura HMAC
