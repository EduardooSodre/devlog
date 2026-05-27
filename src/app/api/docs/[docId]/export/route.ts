import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { docEntries, workspaceMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { docToHtml, docToMarkdown } from "@/lib/export";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { docId } = await params;
  const format = req.nextUrl.searchParams.get("format") ?? "markdown";

  const doc = await db.query.docEntries.findFirst({
    where: eq(docEntries.id, docId),
    with: { workspace: true },
  });

  if (!doc) {
    return NextResponse.json({ error: "Documentação não encontrada" }, { status: 404 });
  }

  const member = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, doc.workspaceId),
      eq(workspaceMembers.userId, session.user.id)
    ),
  });

  if (!member) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  if (doc.workspace.plan === "free") {
    return NextResponse.json(
      { error: "Exportação disponível no plano Pro" },
      { status: 403 }
    );
  }

  const filename = `${doc.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`;

  if (format === "html") {
    const html = docToHtml(doc);
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${filename}.html"`,
      },
    });
  }

  const markdown = docToMarkdown(doc);
  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.md"`,
    },
  });
}
