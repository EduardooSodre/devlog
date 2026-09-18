import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { kanbanBoards } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { KanbanClientPage } from "@/components/kanban/KanbanClientPage";
import { getActiveWorkspaceId, getUserWorkspaces, verifyWorkspaceAccess, getBoardVisibilityFilter } from "@/lib/workspace";

export const metadata = { title: "Projetos" };

export default async function ProjetosPage() {
  const session = await auth();
  const userId = session!.user.id;
  const workspaceId = await getActiveWorkspaceId(userId);

  const membership = workspaceId ? await verifyWorkspaceAccess(userId, workspaceId) : null;

  // Pra "mover/copiar pra outro workspace" no card — só os workspaces que a pessoa já
  // participa, nunca uma lista aberta (senão daria pra mandar tarefa pra lugar nenhum).
  const memberships = await getUserWorkspaces(userId);
  const otherWorkspaces = memberships
    .filter((m) => m.workspaceId !== workspaceId)
    .map((m) => ({ id: m.workspace.id, name: m.workspace.name }));

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
                // "private" só aparece pra quem criou ou é o responsável, mesmo com
                // acesso ao board — ver comentário na coluna `visibility` do schema.
                where: (c, { eq, and, or }) =>
                  and(
                    eq(c.isArchived, false),
                    or(eq(c.visibility, "public"), eq(c.createdById, userId), eq(c.assignedToId, userId))
                  ),
                orderBy: (c, { asc }) => [asc(c.order)],
                with: {
                  attachments: true,
                  assignedTo: { columns: { id: true, name: true, image: true } },
                  createdBy: { columns: { id: true, name: true, image: true } },
                  comments: {
                    with: { author: { columns: { id: true, name: true, image: true } } },
                    orderBy: (c, { asc }) => [asc(c.createdAt)],
                  },
                  subtasks: {
                    orderBy: (s, { asc }) => [asc(s.order)],
                    with: { assignedTo: { columns: { id: true, name: true, image: true } } },
                  },
                  linkedBoards: {
                    with: { board: { columns: { id: true, name: true, color: true } } },
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
      otherWorkspaces={otherWorkspaces}
    />
  );
}
