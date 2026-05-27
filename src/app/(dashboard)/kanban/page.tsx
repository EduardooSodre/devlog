import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { kanbanBoards } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { KanbanClientPage } from "@/components/kanban/KanbanClientPage";
import { getActiveWorkspaceId } from "@/lib/workspace";

export const metadata = { title: "Kanban" };

export default async function KanbanPage() {
  const session = await auth();
  const userId = session!.user.id;
  const workspaceId = await getActiveWorkspaceId(userId);

  const boards = workspaceId
    ? await db.query.kanbanBoards.findMany({
        where: and(
          eq(kanbanBoards.workspaceId, workspaceId),
          eq(kanbanBoards.isArchived, false)
        ),
        with: {
          columns: {
            orderBy: (c, { asc }) => [asc(c.order)],
            with: {
              cards: {
                where: (c, { eq }) => eq(c.isArchived, false),
                orderBy: (c, { asc }) => [asc(c.order)],
                with: { attachments: true },
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
