import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { kanbanCards, docEntries, workspaceMembers, kanbanBoards } from "@/lib/db/schema";
import { eq, and, count, desc } from "drizzle-orm";
import { formatRelative } from "@/lib/utils";
import { Kanban, FileText, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  // Busca o workspace do usuário
  const membership = await db.query.workspaceMembers.findFirst({
    where: eq(workspaceMembers.userId, userId),
  });

  // Se não tem workspace ainda, cria um (fallback)
  const workspaceId = membership?.workspaceId;

  // Stats
  const [totalCards] = workspaceId
    ? await db
        .select({ count: count() })
        .from(kanbanCards)
        .where(and(eq(kanbanCards.createdById, userId), eq(kanbanCards.isArchived, false)))
    : [{ count: 0 }];

  const [doneCards] = workspaceId
    ? await db
        .select({ count: count() })
        .from(kanbanCards)
        .where(and(eq(kanbanCards.createdById, userId), eq(kanbanCards.status, "done")))
    : [{ count: 0 }];

  const [totalDocs] = workspaceId
    ? await db
        .select({ count: count() })
        .from(docEntries)
        .where(eq(docEntries.authorId, userId))
    : [{ count: 0 }];

  const [totalBoards] = workspaceId
    ? await db
        .select({ count: count() })
        .from(kanbanBoards)
        .where(and(eq(kanbanBoards.createdById, userId), eq(kanbanBoards.isArchived, false)))
    : [{ count: 0 }];

  // Docs recentes
  const recentDocs = workspaceId
    ? await db.query.docEntries.findMany({
        where: eq(docEntries.authorId, userId),
        orderBy: [desc(docEntries.updatedAt)],
        limit: 5,
      })
    : [];

  // Cards ativos (não concluídos)
  const activeTasks = workspaceId
    ? await db.query.kanbanCards.findMany({
        where: and(
          eq(kanbanCards.createdById, userId),
          eq(kanbanCards.isArchived, false)
        ),
        orderBy: [desc(kanbanCards.updatedAt)],
        limit: 5,
      })
    : [];

  const firstName = session?.user?.name?.split(" ")[0] ?? "Dev";

  const stats = [
    { label: "Total de Cards", value: totalCards.count, icon: Kanban, color: "text-primary", bg: "bg-primary/10" },
    { label: "Concluídos", value: doneCards.count, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { label: "Documentações", value: totalDocs.count, icon: FileText, color: "text-cyan-400", bg: "bg-cyan-400/10" },
    { label: "Boards Ativos", value: totalBoards.count, icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10" },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Olá, {firstName} 👋</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Aqui está um resumo do seu progresso
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
              <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center ${stat.color} mb-3`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold tabular-nums">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Atividades recentes */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">Documentações Recentes</h2>
            <Link
              href="/docs"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhuma documentação ainda.{" "}
                <Link href="/docs/new" className="text-primary hover:underline">
                  Criar primeira
                </Link>
              </p>
            ) : (
              recentDocs.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/docs/${doc.id}`}
                  className="flex items-start gap-3 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-sm shrink-0">
                    {getDocTypeEmoji(doc.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {doc.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelative(doc.updatedAt)} · {getDocTypeLabel(doc.type)}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Tasks ativas */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">Tarefas em Andamento</h2>
            <Link
              href="/kanban"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Ver Kanban <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {activeTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhuma tarefa ativa.{" "}
                <Link href="/kanban" className="text-primary hover:underline">
                  Abrir Kanban
                </Link>
              </p>
            ) : (
              activeTasks.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      card.priority === "urgent"
                        ? "bg-red-400"
                        : card.priority === "high"
                        ? "bg-orange-400"
                        : card.priority === "medium"
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                    }`}
                  />
                  <span className="text-sm flex-1 truncate">{card.title}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      card.status === "done"
                        ? "bg-emerald-400/10 text-emerald-400"
                        : card.status === "in_progress"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {card.status === "done"
                      ? "Feito"
                      : card.status === "in_progress"
                      ? "Em progresso"
                      : "A fazer"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getDocTypeEmoji(type: string) {
  const map: Record<string, string> = {
    refactoring: "🔧",
    feature: "✨",
    bugfix: "🐛",
    adjustment: "⚙️",
    note: "📝",
    meeting: "💬",
  };
  return map[type] ?? "📄";
}

function getDocTypeLabel(type: string) {
  const map: Record<string, string> = {
    refactoring: "Refatoração",
    feature: "Feature",
    bugfix: "Bugfix",
    adjustment: "Ajuste",
    note: "Nota",
    meeting: "Reunião",
  };
  return map[type] ?? type;
}
