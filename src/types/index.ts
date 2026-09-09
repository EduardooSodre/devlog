/**
 * DevLog — Type Definitions
 * Tipos globais compartilhados em todo o projeto
 */

import type {
  users,
  workspaces,
  kanbanBoards,
  kanbanColumns,
  kanbanCards,
  cardAttachments,
  cardComments,
  cardSubtasks,
  docEntries,
  docAttachments,
  tags,
} from "@/lib/db/schema";
import type { InferSelectModel } from "drizzle-orm";

// ── DB Models ──
export type User = InferSelectModel<typeof users>;
export type Workspace = InferSelectModel<typeof workspaces>;
export type KanbanBoard = InferSelectModel<typeof kanbanBoards>;
export type KanbanColumn = InferSelectModel<typeof kanbanColumns>;
export type KanbanCard = InferSelectModel<typeof kanbanCards>;
export type CardAttachment = InferSelectModel<typeof cardAttachments>;
export type CardComment = InferSelectModel<typeof cardComments>;
export type CardSubtask = InferSelectModel<typeof cardSubtasks>;
export type DocEntry = InferSelectModel<typeof docEntries>;
export type DocAttachment = InferSelectModel<typeof docAttachments>;
export type Tag = InferSelectModel<typeof tags>;

// ── Enums (re-export for use in components) ──
export type DocType = DocEntry["type"];
export type CardPriority = KanbanCard["priority"];
export type CardStatus = KanbanCard["status"];
export type AttachmentType = CardAttachment["type"];
export type PlanType = Workspace["plan"];
export type MemberRole = "owner" | "admin" | "member";

// ── Populated types (com relações) ──
export type KanbanColumnWithCards = KanbanColumn & {
  cards: KanbanCardWithDetails[];
};

export type KanbanBoardWithColumns = KanbanBoard & {
  columns: KanbanColumnWithCards[];
};

export type KanbanCardWithDetails = KanbanCard & {
  attachments?: CardAttachment[];
  comments?: (CardComment & { author?: Pick<User, "id" | "name" | "image"> })[];
  subtasks?: CardSubtask[];
  tags?: Tag[];
  assignedTo?: Pick<User, "id" | "name" | "image"> | null;
  createdBy?: Pick<User, "id" | "name" | "image">;
};

export type DocEntryWithDetails = DocEntry & {
  attachments?: DocAttachment[];
  tags?: Tag[];
  author?: Pick<User, "id" | "name" | "image">;
};

// ── API Response ──
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ── Kanban drag-and-drop ──
export type DragResult = {
  draggableId: string;
  source: { droppableId: string; index: number };
  destination: { droppableId: string; index: number } | null;
};

// ── Upload ──
export type UploadedFile = {
  name: string;
  url: string;
  key: string;
  size: number;
  type: string;
};

// ── Form types ──
export type CreateCardInput = {
  title: string;
  description?: string;
  priority: CardPriority;
  dueDate?: Date;
  columnId: string;
  boardId: string;
};

export type UpdateCardInput = Partial<CreateCardInput> & {
  id: string;
  completionNotes?: string;
  completedAt?: Date;
};

export type CreateDocInput = {
  title: string;
  content?: string;
  type: DocType;
  summary?: string;
  relatedCardId?: string;
};

export type UpdateDocInput = Partial<CreateDocInput> & {
  id: string;
};

// ── Navigation ──
export type NavItem = {
  label: string;
  href: string;
  icon: string;
  badge?: number;
};

// ── Extends NextAuth session ──
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
