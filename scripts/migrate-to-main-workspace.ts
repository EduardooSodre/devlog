import "dotenv/config";
import { db } from "../src/lib/db";
import { users, workspaces, workspaceMembers, kanbanBoards, kanbanColumns, kanbanCards, docEntries } from "../src/lib/db/schema";
import { eq, and } from "drizzle-orm";

async function main() {
  const email = "edduardooo2011@gmail.com";
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) throw new Error("Usuário não encontrado");

  const mems = await db.select().from(workspaceMembers).where(eq(workspaceMembers.userId, user.id));
  const allWs = await Promise.all(
    mems.map(async (m) => {
      const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, m.workspaceId));
      return ws;
    })
  );

  const mainWs = allWs.find((w) => w?.slug !== `rosh-${email.split("@")[0]}`);
  const roshWs = allWs.find((w) => w?.slug === `rosh-${email.split("@")[0]}`);

  if (!mainWs || !roshWs) throw new Error(`Workspaces não encontrados\n${JSON.stringify(allWs)}`);

  console.log(`Workspace principal: "${mainWs.name}" (${mainWs.id})`);
  console.log(`Workspace Rosh (mover de): "${roshWs.name}" (${roshWs.id})`);

  // Mover boards
  const boards = await db.select().from(kanbanBoards).where(eq(kanbanBoards.workspaceId, roshWs.id));
  console.log(`\nMovendo ${boards.length} board(s)...`);
  for (const b of boards) {
    await db.update(kanbanBoards).set({ workspaceId: mainWs.id }).where(eq(kanbanBoards.id, b.id));
    // Cards têm boardId FK — só o workspaceId do board muda, os cards continuam vinculados pelo boardId
    console.log(`  ✅ Board "${b.name}" movido`);
  }

  // Mover docs
  const docs = await db.select().from(docEntries).where(eq(docEntries.workspaceId, roshWs.id));
  console.log(`\nMovendo ${docs.length} doc(s)...`);
  if (docs.length > 0) {
    await db.update(docEntries).set({ workspaceId: mainWs.id }).where(eq(docEntries.workspaceId, roshWs.id));
    console.log(`  ✅ ${docs.length} docs movidas`);
  }

  // Deletar workspace Rosh vazio
  await db.delete(workspaceMembers).where(eq(workspaceMembers.workspaceId, roshWs.id));
  await db.delete(workspaces).where(eq(workspaces.id, roshWs.id));
  console.log(`\n🗑️  Workspace temporário "Rosh" removido`);

  console.log(`\n✅ Pronto! Tudo agora está no workspace "${mainWs.name}"`);
  console.log(`   Acesse /kanban e /docs — vai aparecer sem precisar trocar workspace.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error("Erro:", e); process.exit(1); });
