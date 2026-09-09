import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { kanbanBoards } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { KanbanClientPage } from "@/components/kanban/KanbanClientPage";
import { getActiveWorkspaceId, verifyWorkspaceAccess, getBoardVisibilityFilter } from "@/lib/workspace";

export const metadata = { title: "Projetos" };

export default async function ProjetosPage() {
  const session = await auth();
  const userId = session!.user.id;
  const workspaceId = await getActiveWorkspaceId(userId);

  const membership = workspaceId ? await verifyWorkspaceAccess(userId, workspaceId) : null;

  // Sem workspaceId ou sem associação verificada = não mostra nenhum board — nunca cair
  // pra "sem filtro" (que mostraria tudo, inclusive boards restritos a departamento).
  const boards = workspaceId && membership
    ? await db.query.kanbanBoards.findMany({
        where: and(
          eq(kanbanBoards.workspaceId, workspaceId),
          eq(kanbanBoards.isArchived, false),
          await getBoardVisibilityFilter(userId, workspaceId, membership.role)
        ),
        with: {
          columns: {
            orderBy: (c, { asc }) => [asc(c.order)],
            with: {
              cards: {
                where: (c, { eq }) => eq(c.isArchived, false),
                orderBy: (c, { asc }) => [asc(c.order)],
                with: {
                  attachments: true,
                  assignedTo: { columns: { id: true, name: true, image: true } },
                  comments: {
                    with: { author: { columns: { id: true, name: true, image: true } } },
                    orderBy: (c, { asc }) => [asc(c.createdAt)],
                  },
                  subtasks: {
                    orderBy: (s, { asc }) => [asc(s.order)],
                  },
                },
              },
            },
          },
        },
        orderBy: (b, { desc }) => [desc(b.createdAt)],
      })
    : [];

  return (
    <KanbanClientPage
      initialBoards={boards as Parameters<typeof KanbanClientPage>[0]["initialBoards"]}
      workspaceId={workspaceId ?? ""}
    />
  );
}
