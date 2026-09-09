/**
 * Cria/atualiza uma doc de sistema no DevLog com o mapeamento completo do que
 * já foi implementado, mais o registro da correção do "loop infinito" no dev server.
 *
 * Rodar:  npx tsx scripts/add-system-docs.ts
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "../src/lib/db";
import { users, workspaceMembers, docEntries } from "../src/lib/db/schema";
import { eq, and } from "drizzle-orm";

const USER_EMAIL = process.env.SEED_EMAIL ?? "edduardooo2011@gmail.com";
const DOC_TITLE = "DevLog — Panorama completo do sistema (2026-07-13)";

function mdToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inList = false;
  let inTable = false;

  const closeList = () => { if (inList) { out.push("</ul>"); inList = false; } };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.startsWith("| ")) {
      if (!inTable) { out.push("<table>"); inTable = true; }
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      if (cells.every((c) => /^-+$/.test(c))) continue;
      out.push(`<tr>${cells.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`);
      continue;
    } else if (inTable) {
      out.push("</table>");
      inTable = false;
    }

    if (line.startsWith("#### ")) { closeList(); out.push(`<h4>${inline(line.slice(5))}</h4>`); continue; }
    if (line.startsWith("### ")) { closeList(); out.push(`<h3>${inline(line.slice(4))}</h3>`); continue; }
    if (line.startsWith("## ")) { closeList(); out.push(`<h2>${inline(line.slice(3))}</h2>`); continue; }
    if (line.startsWith("# ")) { closeList(); out.push(`<h1>${inline(line.slice(2))}</h1>`); continue; }
    if (line.startsWith("> ")) { closeList(); out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`); continue; }
    if (line === "---") { closeList(); out.push("<hr/>"); continue; }
    if (line.startsWith("- ")) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${inline(line.slice(2))}</li>`);
      continue;
    }
    closeList();
    if (line.trim() === "") continue;
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  if (inTable) out.push("</table>");
  return out.join("\n");
}

function inline(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

async function main() {
  const [user] = await db.select().from(users).where(eq(users.email, USER_EMAIL));
  if (!user) throw new Error(`Usuário ${USER_EMAIL} não encontrado`);

  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.id));
  if (!membership) throw new Error("Nenhum workspace encontrado para o usuário");

  const workspaceId = membership.workspaceId;

  const md = readFileSync(join(process.cwd(), "docs", "o-que-existe.md"), "utf8");
  const html = mdToHtml(md);

  const summary =
    "Loop infinito no dev server resolvido (processos node.exe travados) + mapeamento completo de tudo que já existe no DevLog: auth, workspaces, Kanban, documentação, billing e scripts.";

  const [existing] = await db
    .select()
    .from(docEntries)
    .where(and(eq(docEntries.workspaceId, workspaceId), eq(docEntries.title, DOC_TITLE)));

  if (existing) {
    await db
      .update(docEntries)
      .set({ content: html, summary, updatedAt: new Date() })
      .where(eq(docEntries.id, existing.id));
    console.log(`✅ Doc atualizada: ${DOC_TITLE}`);
  } else {
    await db.insert(docEntries).values({
      workspaceId,
      authorId: user.id,
      title: DOC_TITLE,
      type: "note",
      summary,
      content: html,
      isPublished: true,
    });
    console.log(`✅ Doc criada: ${DOC_TITLE}`);
  }

  console.log("   Acesse /docs no app para visualizar.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Erro:", err);
    process.exit(1);
  });
