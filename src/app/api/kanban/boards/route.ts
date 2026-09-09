/**
 * GET /api/kanban/boards — Lista boards do workspace (respeitando visibilidade de departamento)
 * POST /api/kanban/boards — Cria novo board (opcionalmente dentro de um departamento)
 * PATCH /api/kanban/boards — Atualiza board
 * DELETE /api/kanban/boards — Deleta board
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { kanbanBoards, kanbanColumns, departments, departmentMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { verifyWorkspaceAccess, getBoardVisibilityFilter, canAccessBoard } from "@/lib/workspace";

const createBoardSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.string().default("#4f6ef7"),
  workspaceId: z.string(),
  departmentId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const workspaceId = req.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId obrigatório" }, { status: 400 });
    }

    const member = await verifyWorkspaceAccess(session.user.id, workspaceId);
    if (!member) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const visibilityFilter = await getBoardVisibilityFilter(session.user.id, workspaceId, member.role);

    const boards = await db.query.kanbanBoards.findMany({
      where: and(
        eq(kanbanBoards.workspaceId, workspaceId),
        eq(kanbanBoards.isArchived, false),
        visibilityFilter
      ),
      with: {
        columns: {
          with: {
            cards: {
              with: {
                assignedTo: { columns: { id: true, name: true, image: true } },
                attachments: true,
                comments: {
                  with: { author: { columns: { id: true, name: true, image: true } } },
                  orderBy: (c, { asc }) => [asc(c.createdAt)],
                },
                subtasks: {
                  orderBy: (s, { asc }) => [asc(s.order)],
                },
              },
              orderBy: (c, { asc }) => [asc(c.order)],
            },
          },
          orderBy: (cols, { asc }) => [asc(cols.order)],
        },
      },
      orderBy: (b, { desc }) => [desc(b.createdAt)],
    });

    return NextResponse.json({ success: true, data: boards });
  } catch (error) {
    console.error("[GET /api/kanban/boards]", error);
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
    const parsed = createBoardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { name, description, color, workspaceId, departmentId } = parsed.data;

    if (!(await verifyWorkspaceAccess(session.user.id, workspaceId))) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    if (departmentId) {
      const dept = await db.query.departments.findFirst({ where: eq(departments.id, departmentId) });
      const isMember = dept && (await db.query.departmentMembers.findFirst({
        where: and(eq(departmentMembers.departmentId, departmentId), eq(departmentMembers.userId, session.user.id)),
      }));
      if (!dept || dept.workspaceId !== workspaceId || !isMember) {
        return NextResponse.json({ error: "Departamento inválido" }, { status: 403 });
      }
    }

    const { checkPlanLimit } = await import("@/lib/workspace");
    const limitCheck = await checkPlanLimit(workspaceId, "boards");
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.message }, { status: 403 });
    }

    // Cria o board
    const [board] = await db
      .insert(kanbanBoards)
      .values({
        name,
        description,
        color,
        workspaceId,
        departmentId: departmentId ?? undefined,
        createdById: session.user.id,
      })
      .returning();

    // Cria as 3 colunas padrão
    await db.insert(kanbanColumns).values([
      { boardId: board.id, name: "A Fazer", order: 0, color: "#64748b" },
      { boardId: board.id, name: "Em Progresso", order: 1, color: "#4f6ef7" },
      { boardId: board.id, name: "Concluído", order: 2, color: "#10b981" },
    ]);

    return NextResponse.json({ success: true, data: board }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/kanban/boards]", error);
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
    const { id, name, description, color, isArchived } = body;

    if (!id) {
      return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    }

    const existing = await db.query.kanbanBoards.findFirst({ where: eq(kanbanBoards.id, id) });
    if (!existing) {
      return NextResponse.json({ error: "Board não encontrado" }, { status: 404 });
    }
    if (!(await canAccessBoard(session.user.id, existing))) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const [updated] = await db
      .update(kanbanBoards)
      .set({
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(color && { color }),
        ...(isArchived !== undefined && { isArchived }),
        updatedAt: new Date(),
      })
      .where(eq(kanbanBoards.id, id))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[PATCH /api/kanban/boards]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    }

    // Busca o board para saber o workspaceId
    const board = await db.query.kanbanBoards.findFirst({
      where: eq(kanbanBoards.id, id),
    });

    if (!board) {
      return NextResponse.json({ error: "Board não encontrado" }, { status: 404 });
    }

    if (!(await canAccessBoard(session.user.id, board))) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    await db.delete(kanbanBoards).where(eq(kanbanBoards.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/kanban/boards]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
