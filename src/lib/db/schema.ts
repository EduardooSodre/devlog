/**
 * DevLog — Database Schema
 * Banco: NeonDB (PostgreSQL serverless)
 * ORM: Drizzle
 *
 * Tabelas:
 *  Auth:         users, accounts, sessions, verificationTokens
 *  SaaS:         workspaces, workspaceMembers, plans, subscriptions
 *  Kanban:       kanbanBoards, kanbanColumns, kanbanCards, cardAttachments, cardComments
 *  Docs:         docEntries, docAttachments, tags, entryTags
 */

import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────

export const planEnum = pgEnum("plan", ["free", "pro", "enterprise"]);
export const memberRoleEnum = pgEnum("member_role", ["owner", "admin", "member"]);
export const cardPriorityEnum = pgEnum("card_priority", ["low", "medium", "high", "urgent"]);
export const cardStatusEnum = pgEnum("card_status", ["todo", "in_progress", "done", "cancelled"]);
export const docTypeEnum = pgEnum("doc_type", [
  "refactoring",   // Refatoração (antes/depois)
  "feature",       // Nova funcionalidade
  "bugfix",        // Correção de bug
  "adjustment",    // Pequeno ajuste
  "note",          // Nota livre
  "meeting",       // Reunião / decisão
]);
export const attachmentTypeEnum = pgEnum("attachment_type", [
  "before",        // Foto "antes"
  "after",         // Foto "depois"
  "screenshot",    // Screenshot genérico
  "file",          // Arquivo genérico
]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "past_due",
  "trialing",
  "incomplete",
]);

// ─────────────────────────────────────────────
// AUTH (NextAuth v5 + Drizzle Adapter)
// ─────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  password: text("password"), // null para usuários OAuth
  jobTitle: text("job_title"), // cargo — preenchido no onboarding
  // Default true pra não forçar o wizard em quem já usava o app antes dessa coluna
  // existir — os fluxos de criação de usuário (registro e OAuth) passam false explicitamente.
  hasOnboarded: boolean("has_onboarded").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.provider, table.providerAccountId] }),
    userIdx: index("accounts_user_idx").on(table.userId),
  })
);

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token] }),
  })
);

// ─────────────────────────────────────────────
// SAAS — WORKSPACES & PLANS
// ─────────────────────────────────────────────

export const workspaces = pgTable("workspaces", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  plan: planEnum("plan").notNull().default("free"),
  // Domínio de e-mail corporativo "dono" deste workspace (null = workspace pessoal).
  // Novos cadastros com e-mail do mesmo domínio entram automaticamente aqui.
  domain: text("domain").unique(),
  // Fim do trial gratuito de 30 dias para workspaces vinculados a domínio. Null = sem trial.
  trialEndsAt: timestamp("trial_ends_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.workspaceId, table.userId] }),
    workspaceIdx: index("wm_workspace_idx").on(table.workspaceId),
    userIdx: index("wm_user_idx").on(table.userId),
  })
);

export const plans = pgTable("plans", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: planEnum("name").notNull().unique(),
  stripePriceIdMonthly: text("stripe_price_id_monthly"),
  stripePriceIdYearly: text("stripe_price_id_yearly"),
  maxWorkspaceMembers: integer("max_workspace_members").notNull().default(1),
  maxKanbanBoards: integer("max_kanban_boards").notNull().default(1),
  maxDocEntries: integer("max_doc_entries").notNull().default(50),
  maxStorageMb: integer("max_storage_mb").notNull().default(100),
  features: text("features").array(), // JSON array of feature flags
});

export const workspaceInvites = pgTable(
  "workspace_invites",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    // Convite pode ser só pro workspace, ou já direto pra um departamento específico —
    // nesse caso o aceite também insere em departmentMembers (ver /invites/accept).
    departmentId: text("department_id").references(() => departments.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: memberRoleEnum("role").notNull().default("member"),
    token: text("token").notNull().unique(),
    invitedById: text("invited_by_id")
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    acceptedAt: timestamp("accepted_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index("wi_workspace_idx").on(table.workspaceId),
    tokenIdx: index("wi_token_idx").on(table.token),
  })
);

export const subscriptions = pgTable("subscriptions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  stripeCustomerId: text("stripe_customer_id"),
  stripePriceId: text("stripe_price_id"),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  currentPeriodStart: timestamp("current_period_start", { mode: "date" }),
  currentPeriodEnd: timestamp("current_period_end", { mode: "date" }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// DEPARTAMENTOS
// Qualquer membro do workspace pode criar um e escolher quem enxerga — não é uma
// hierarquia fixa, é um grupo de visibilidade que o criador monta na hora.
// ─────────────────────────────────────────────

export const departments = pgTable("departments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdById: text("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const departmentMembers = pgTable(
  "department_members",
  {
    departmentId: text("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.departmentId, table.userId] }),
  })
);

// ─────────────────────────────────────────────
// KANBAN
// ─────────────────────────────────────────────

export const kanbanBoards = pgTable("kanban_boards", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  // Board sem departamento = visível para o workspace inteiro (comportamento de sempre).
  // Com departamento = só quem está em departmentMembers enxerga.
  departmentId: text("department_id").references(() => departments.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#4f6ef7"), // cor do board
  createdById: text("created_by_id")
    .notNull()
    .references(() => users.id),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const kanbanColumns = pgTable("kanban_columns", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  boardId: text("board_id")
    .notNull()
    .references(() => kanbanBoards.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  order: integer("order").notNull().default(0),
  color: text("color"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const kanbanCards = pgTable(
  "kanban_cards",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    columnId: text("column_id")
      .notNull()
      .references(() => kanbanColumns.id, { onDelete: "cascade" }),
    boardId: text("board_id")
      .notNull()
      .references(() => kanbanBoards.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"), // HTML do TipTap
    priority: cardPriorityEnum("priority").notNull().default("medium"),
    status: cardStatusEnum("status").notNull().default("todo"),
    order: integer("order").notNull().default(0),
    startDate: timestamp("start_date", { mode: "date" }),
    dueDate: timestamp("due_date", { mode: "date" }),
    completedAt: timestamp("completed_at", { mode: "date" }),
    completionNotes: text("completion_notes"), // Observações ao concluir
    assignedToId: text("assigned_to_id").references(() => users.id),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    columnIdx: index("cards_column_idx").on(table.columnId),
    boardIdx: index("cards_board_idx").on(table.boardId),
  })
);

export const cardAttachments = pgTable("card_attachments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  cardId: text("card_id")
    .notNull()
    .references(() => kanbanCards.id, { onDelete: "cascade" }),
  type: attachmentTypeEnum("type").notNull().default("screenshot"),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),   // URL do UploadThing
  fileKey: text("file_key").notNull(),   // Key do UploadThing (para deletar)
  fileSize: integer("file_size"),        // em bytes
  mimeType: text("mime_type"),
  caption: text("caption"),
  uploadedById: text("uploaded_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const cardComments = pgTable("card_comments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  cardId: text("card_id")
    .notNull()
    .references(() => kanbanCards.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(), // HTML do TipTap
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// Subtarefas: checklist simples dentro de um card (uma tarefa pode ter várias).
// Não são cards completos (sem coluna/prioridade própria) — se precisar disso no
// futuro, promover pra kanbanCards com parentCardId em vez de esticar esta tabela.
export const cardSubtasks = pgTable(
  "card_subtasks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    cardId: text("card_id")
      .notNull()
      .references(() => kanbanCards.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    isDone: boolean("is_done").notNull().default(false),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    cardIdx: index("subtasks_card_idx").on(table.cardId),
  })
);

// ─────────────────────────────────────────────
// DOCUMENTAÇÃO
// ─────────────────────────────────────────────

export const docEntries = pgTable(
  "doc_entries",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    content: text("content"),            // HTML do TipTap (texto livre)
    type: docTypeEnum("type").notNull().default("note"),
    summary: text("summary"),            // Resumo curto para listagem
    isPublished: boolean("is_published").notNull().default(true),
    relatedCardId: text("related_card_id").references(() => kanbanCards.id, { onDelete: "set null" }), // link com card
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index("docs_workspace_idx").on(table.workspaceId),
    authorIdx: index("docs_author_idx").on(table.authorId),
  })
);

export const docAttachments = pgTable("doc_attachments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  docId: text("doc_id")
    .notNull()
    .references(() => docEntries.id, { onDelete: "cascade" }),
  type: attachmentTypeEnum("type").notNull().default("screenshot"),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileKey: text("file_key").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  caption: text("caption"),
  order: integer("order").notNull().default(0), // ordem do antes/depois
  uploadedById: text("uploaded_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const tags = pgTable("tags", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#4f6ef7"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const entryTags = pgTable(
  "entry_tags",
  {
    docId: text("doc_id")
      .notNull()
      .references(() => docEntries.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.docId, table.tagId] }),
  })
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("push_sub_user_idx").on(table.userId),
  })
);

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [pushSubscriptions.userId],
    references: [users.id],
  }),
}));

export const cardTags = pgTable(
  "card_tags",
  {
    cardId: text("card_id")
      .notNull()
      .references(() => kanbanCards.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.cardId, table.tagId] }),
  })
);

// ─────────────────────────────────────────────
// RELATIONS
// ─────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  workspaceMemberships: many(workspaceMembers),
  docEntries: many(docEntries),
  assignedCards: many(kanbanCards, { relationName: "assignedTo" }),
  createdCards: many(kanbanCards, { relationName: "createdBy" }),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, { fields: [workspaces.ownerId], references: [users.id] }),
  members: many(workspaceMembers),
  invites: many(workspaceInvites),
  kanbanBoards: many(kanbanBoards),
  docEntries: many(docEntries),
  tags: many(tags),
  subscription: one(subscriptions),
  departments: many(departments),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [departments.workspaceId], references: [workspaces.id] }),
  createdBy: one(users, { fields: [departments.createdById], references: [users.id] }),
  members: many(departmentMembers),
  boards: many(kanbanBoards),
}));

export const departmentMembersRelations = relations(departmentMembers, ({ one }) => ({
  department: one(departments, { fields: [departmentMembers.departmentId], references: [departments.id] }),
  user: one(users, { fields: [departmentMembers.userId], references: [users.id] }),
}));

export const workspaceInvitesRelations = relations(workspaceInvites, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceInvites.workspaceId],
    references: [workspaces.id],
  }),
  department: one(departments, {
    fields: [workspaceInvites.departmentId],
    references: [departments.id],
  }),
  invitedBy: one(users, {
    fields: [workspaceInvites.invitedById],
    references: [users.id],
  }),
}));

export const kanbanBoardsRelations = relations(kanbanBoards, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [kanbanBoards.workspaceId],
    references: [workspaces.id],
  }),
  department: one(departments, {
    fields: [kanbanBoards.departmentId],
    references: [departments.id],
  }),
  columns: many(kanbanColumns),
  cards: many(kanbanCards),
}));

export const kanbanColumnsRelations = relations(kanbanColumns, ({ one, many }) => ({
  board: one(kanbanBoards, {
    fields: [kanbanColumns.boardId],
    references: [kanbanBoards.id],
  }),
  cards: many(kanbanCards),
}));

export const kanbanCardsRelations = relations(kanbanCards, ({ one, many }) => ({
  column: one(kanbanColumns, {
    fields: [kanbanCards.columnId],
    references: [kanbanColumns.id],
  }),
  board: one(kanbanBoards, {
    fields: [kanbanCards.boardId],
    references: [kanbanBoards.id],
  }),
  attachments: many(cardAttachments),
  comments: many(cardComments),
  subtasks: many(cardSubtasks),
  tags: many(cardTags),
  assignedTo: one(users, {
    fields: [kanbanCards.assignedToId],
    references: [users.id],
    relationName: "assignedTo",
  }),
  createdBy: one(users, {
    fields: [kanbanCards.createdById],
    references: [users.id],
    relationName: "createdBy",
  }),
}));

export const docEntriesRelations = relations(docEntries, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [docEntries.workspaceId],
    references: [workspaces.id],
  }),
  author: one(users, {
    fields: [docEntries.authorId],
    references: [users.id],
  }),
  attachments: many(docAttachments),
  tags: many(entryTags),
  relatedCard: one(kanbanCards, {
    fields: [docEntries.relatedCardId],
    references: [kanbanCards.id],
  }),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [workspaceMembers.userId],
    references: [users.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [subscriptions.workspaceId],
    references: [workspaces.id],
  }),
}));

export const cardAttachmentsRelations = relations(cardAttachments, ({ one }) => ({
  card: one(kanbanCards, {
    fields: [cardAttachments.cardId],
    references: [kanbanCards.id],
  }),
  uploader: one(users, {
    fields: [cardAttachments.uploadedById],
    references: [users.id],
  }),
}));

export const cardSubtasksRelations = relations(cardSubtasks, ({ one }) => ({
  card: one(kanbanCards, {
    fields: [cardSubtasks.cardId],
    references: [kanbanCards.id],
  }),
}));

export const cardCommentsRelations = relations(cardComments, ({ one }) => ({
  card: one(kanbanCards, {
    fields: [cardComments.cardId],
    references: [kanbanCards.id],
  }),
  author: one(users, {
    fields: [cardComments.authorId],
    references: [users.id],
  }),
}));

export const docAttachmentsRelations = relations(docAttachments, ({ one }) => ({
  doc: one(docEntries, {
    fields: [docAttachments.docId],
    references: [docEntries.id],
  }),
  uploader: one(users, {
    fields: [docAttachments.uploadedById],
    references: [users.id],
  }),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [tags.workspaceId],
    references: [workspaces.id],
  }),
  docEntries: many(entryTags),
  kanbanCards: many(cardTags),
}));

export const entryTagsRelations = relations(entryTags, ({ one }) => ({
  doc: one(docEntries, {
    fields: [entryTags.docId],
    references: [docEntries.id],
  }),
  tag: one(tags, {
    fields: [entryTags.tagId],
    references: [tags.id],
  }),
}));

export const cardTagsRelations = relations(cardTags, ({ one }) => ({
  card: one(kanbanCards, {
    fields: [cardTags.cardId],
    references: [kanbanCards.id],
  }),
  tag: one(tags, {
    fields: [cardTags.tagId],
    references: [tags.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));
