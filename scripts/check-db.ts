import "dotenv/config";
import { db } from "../src/lib/db";
import { users, workspaces, workspaceMembers, kanbanBoards, docEntries } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const email = "edduardooo2011@gmail.com";
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) { console.log("Usuário não encontrado"); return; }

  const mems = await db.select().from(workspaceMembers).where(eq(workspaceMembers.userId, user.id));
  for (const m of mems) {
    const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, m.workspaceId));
    const boards = await db.select().from(kanbanBoards).where(eq(kanbanBoards.workspaceId, m.workspaceId));
    const docs = await db.select().from(docEntries).where(eq(docEntries.workspaceId, m.workspaceId));
    console.log(`\nWorkspace: "${ws?.name}" | ID: ${m.workspaceId}`);
    console.log(`  Boards: ${boards.length} | Docs: ${docs.length}`);
    console.log(`  Cookie value a usar: ${m.workspaceId}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
