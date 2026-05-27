import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { docEntries } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const expected = process.env.DEVLOG_PUBLIC_API_KEY;

  if (!expected || !apiKey || apiKey !== expected) {
    return NextResponse.json({ error: "API key inválida" }, { status: 401 });
  }

  const workspaceId = req.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId obrigatório" }, { status: 400 });
  }

  const docs = await db.query.docEntries.findMany({
    where: eq(docEntries.workspaceId, workspaceId),
    columns: {
      id: true,
      title: true,
      summary: true,
      type: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [desc(docEntries.updatedAt)],
    limit: 100,
  });

  return NextResponse.json({
    success: true,
    data: docs,
    meta: { count: docs.length, workspaceId },
  });
}
