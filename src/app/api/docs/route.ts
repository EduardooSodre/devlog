/**
 * GET /api/docs?workspaceId=xxx — Lista documentações
 * POST /api/docs — Cria nova entrada
 * PATCH /api/docs — Atualiza entrada
 * DELETE /api/docs?id=xxx — Remove entrada
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { docEntries, workspaceMembers, entryTags } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

const createDocSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().optional(),
  type: z.enum(["refactoring", "feature", "bugfix", "adjustment", "note", "meeting"]),
  summary: z.string().max(500).optional(),
  workspaceId: z.string(),
  relatedCardId: z.string().optional(),
});

const updateDocSchema = createDocSchema.partial().extend({ id: z.string() });

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const workspaceId = req.nextUrl.searchParams.get("workspaceId");
    const type = req.nextUrl.searchParams.get("type");
    const tagId = req.nextUrl.searchParams.get("tagId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId obrigatório" }, { status: 400 });
    }

    // Verifica membership
    const member = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    });
    if (!member) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    let docs = await db.query.docEntries.findMany({
      where: and(
        eq(docEntries.workspaceId, workspaceId),
        type
          ? eq(docEntries.type, type as typeof docEntries.type.enumValues[number])
          : undefined
      ),
      with: {
        attachments: true,
        author: {
          columns: { id: true, name: true, image: true },
        },
        tags: {
          with: { tag: true },
        },
      },
      orderBy: [desc(docEntries.updatedAt)],
    });

    if (tagId) {
      const tagged = await db
        .select({ docId: entryTags.docId })
        .from(entryTags)
        .where(eq(entryTags.tagId, tagId));
      const ids = new Set(tagged.map((t) => t.docId));
      docs = docs.filter((d) => ids.has(d.id));
    }

    return NextResponse.json({ success: true, data: docs });
  } catch (error) {
    console.error("[GET /api/docs]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    let { workspaceId, ...rest } = body;

    // Se o workspaceId for "temp" ou estiver faltando, busca o do usuário
    if (!workspaceId || workspaceId === "temp") {
      const membership = await db.query.workspaceMembers.findFirst({
        where: eq(workspaceMembers.userId, session.user.id),
      });
      if (!membership) {
        return NextResponse.json({ error: "Usuário não possui workspace" }, { status: 400 });
      }
      workspaceId = membership.workspaceId;
    }

    const member = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    });
    if (!member) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { checkPlanLimit } = await import("@/lib/workspace");
    const limitCheck = await checkPlanLimit(workspaceId, "docEntries");
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.message }, { status: 403 });
    }

    const parsed = createDocSchema.safeParse({ ...rest, workspaceId });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const [doc] = await db
      .insert(docEntries)
      .values({
        ...parsed.data,
        authorId: session.user.id,
      })
      .returning();

    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/docs]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = updateDocSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { id, ...updates } = parsed.data;

    const [updated] = await db
      .update(docEntries)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(docEntries.id, id), eq(docEntries.authorId, session.user.id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Doc não encontrada ou sem permissão" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[PATCH /api/docs]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const docId = req.nextUrl.searchParams.get("id");
    if (!docId) {
      return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    }

    await db
      .delete(docEntries)
      .where(and(eq(docEntries.id, docId), eq(docEntries.authorId, session.user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/docs]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
