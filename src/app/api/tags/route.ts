import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tags, entryTags } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getActiveWorkspace, verifyWorkspaceAccess } from "@/lib/workspace";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const workspaceId = req.nextUrl.searchParams.get("workspaceId");
  let wsId = workspaceId;

  if (wsId) {
    const member = await verifyWorkspaceAccess(session.user.id, wsId);
    if (!member) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  } else {
    const ctx = await getActiveWorkspace(session.user.id);
    wsId = ctx?.workspaceId ?? null;
  }

  if (!wsId) {
    return NextResponse.json({ error: "workspaceId obrigatório" }, { status: 400 });
  }

  const allTags = await db.query.tags.findMany({
    where: eq(tags.workspaceId, wsId),
    orderBy: (t, { asc }) => [asc(t.name)],
  });

  return NextResponse.json({ success: true, data: allTags });
}

const createSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().optional(),
  workspaceId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    let wsId = parsed.data.workspaceId;
    if (wsId) {
      const member = await verifyWorkspaceAccess(session.user.id, wsId);
      if (!member) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    } else {
      const ctx = await getActiveWorkspace(session.user.id);
      wsId = ctx?.workspaceId;
    }

    if (!wsId) {
      return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 });
    }

    const [tag] = await db
      .insert(tags)
      .values({
        workspaceId: wsId,
        name: parsed.data.name,
        color: parsed.data.color ?? "#4f6ef7",
      })
      .returning();

    return NextResponse.json({ success: true, data: tag }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/tags]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

const setDocTagsSchema = z.object({
  docId: z.string(),
  tagIds: z.array(z.string()),
});

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = setDocTagsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await db.delete(entryTags).where(eq(entryTags.docId, parsed.data.docId));

    if (parsed.data.tagIds.length > 0) {
      await db.insert(entryTags).values(
        parsed.data.tagIds.map((tagId) => ({
          docId: parsed.data.docId,
          tagId,
        }))
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/tags]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
