/**
 * POST /api/kanban/cards/transfer — Move ou copia um card para outro board, do mesmo
 * workspace ou de outro (ex.: levar uma tarefa pessoal pra um workspace de empresa).
 * "move": o card sai de onde estava e passa a existir só no destino.
 * "copy": cria uma cópia no destino; o original continua intacto.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { kanbanCards, kanbanBoards, kanbanColumns, cardSubtasks, cardBoards } from "@/lib/db/schema";
import { and, eq, max } from "drizzle-orm";
import { z } from "zod";
import { assertCardAccess, canAccessBoard, getMemberRole, verifyWorkspaceAccess } from "@/lib/workspace";
import { canMoveCard } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  cardId: z.string(),
  targetWorkspaceId: z.string(),
  targetBoardId: z.string(),
  targetColumnId: z.string(),
  mode: z.enum(["move", "copy"]),
  // Só pra cópia: a cópia passa a acompanhar as edições do original (ver sourceCardId).
  link: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { cardId, targetWorkspaceId, targetBoardId, targetColumnId, mode, link } = parsed.data;

  const access = await assertCardAccess(session.user.id, cardId);
  if (!access) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  const { card, board: sourceBoard } = access;
  const sameWorkspace = sourceBoard.workspaceId === targetWorkspaceId;

  if (mode === "move") {
    const role = await getMemberRole(session.user.id, sourceBoard.workspaceId);
    if (!canMoveCard(session.user.id, card, role, sameWorkspace)) {
      return NextResponse.json(
        {
          error: sameWorkspace
            ? "Só quem criou, o responsável ou um administrador pode mover esta tarefa"
            : "Você só pode mover para outro workspace tarefas que você criou — copie esta em vez de mover",
        },
        { status: 403 }
      );
    }
  }

  if (!(await verifyWorkspaceAccess(session.user.id, targetWorkspaceId))) {
    return NextResponse.json({ error: "Você não faz parte do workspace de destino" }, { status: 403 });
  }
  const targetBoard = await db.query.kanbanBoards.findFirst({ where: eq(kanbanBoards.id, targetBoardId) });
  if (!targetBoard || targetBoard.workspaceId !== targetWorkspaceId || !(await canAccessBoard(session.user.id, targetBoard))) {
    return NextResponse.json({ error: "Board de destino inválido" }, { status: 403 });
  }
  const targetColumn = await db.query.kanbanColumns.findFirst({ where: eq(kanbanColumns.id, targetColumnId) });
  if (!targetColumn || targetColumn.boardId !== targetBoardId) {
    return NextResponse.json({ error: "Coluna de destino inválida" }, { status: 400 });
  }

  // O responsável/atribuído só faz sentido se essa pessoa também estiver no workspace
  // de destino — senão a tarefa fica atribuída a alguém que não consegue mais abri-la.
  const assigneeStillValid =
    card.assignedToId ? !!(await verifyWorkspaceAccess(card.assignedToId, targetWorkspaceId)) : false;

  const [{ value: maxOrder }] = await db
    .select({ value: max(kanbanCards.order) })
    .from(kanbanCards)
    .where(eq(kanbanCards.columnId, targetColumnId));
  const nextOrder = (maxOrder ?? -1) + 1;

  if (mode === "move") {
    const [moved] = await db
      .update(kanbanCards)
      .set({
        boardId: targetBoardId,
        columnId: targetColumnId,
        order: nextOrder,
        assignedToId: assigneeStillValid ? card.assignedToId : null,
        // Preserva a visibilidade tal como estava — createdById/assignedToId são IDs
        // globais de usuário, então "private" (só criador+responsável) continua
        // significando a mesma coisa no board de destino, sem tradução nenhuma.
        updatedAt: new Date(),
      })
      .where(eq(kanbanCards.id, cardId))
      .returning();

    // Vínculos de "também aparece no projeto X": noutro workspace apontariam pra boards
    // de lá, então saem todos; no mesmo workspace só sai o do board que virou o dono.
    await db
      .delete(cardBoards)
      .where(
        sameWorkspace
          ? and(eq(cardBoards.cardId, cardId), eq(cardBoards.boardId, targetBoardId))
          : eq(cardBoards.cardId, cardId)
      );

    await logActivity({
      cardId,
      boardId: targetBoardId,
      actorId: session.user.id,
      type: "transferred",
      message: sameWorkspace
        ? `moveu esta tarefa de "${sourceBoard.name}" para "${targetBoard.name}"`
        : `moveu esta tarefa de outro workspace para "${targetBoard.name}"`,
    });

    return NextResponse.json({ success: true, data: moved });
  }

  // ── copy ──
  // Vínculo aponta pro original "raiz" (pra cópia de cópia continuar sincronizando), mas
  // só se quem copia também enxerga essa raiz — senão receberia atualizações de uma
  // tarefa que não pode ver. Sem acesso à raiz, vincula à cópia que ele de fato copiou.
  let linkTo: string | null = null;
  if (link) {
    linkTo = card.id;
    if (card.sourceCardId && (await assertCardAccess(session.user.id, card.sourceCardId))) {
      linkTo = card.sourceCardId;
    }
  }
  const [copy] = await db
    .insert(kanbanCards)
    .values({
      title: card.title,
      description: card.description,
      priority: card.priority,
      difficulty: card.difficulty,
      status: card.status,
      startDate: card.startDate,
      dueDate: card.dueDate,
      columnId: targetColumnId,
      boardId: targetBoardId,
      order: nextOrder,
      assignedToId: assigneeStillValid ? card.assignedToId : null,
      createdById: session.user.id,
      // Quem copia vira o criador da cópia — se o original era "private", a cópia
      // continua restrita (agora a quem copiou + o responsável, se ele ainda for válido).
      visibility: card.visibility,
      sourceCardId: linkTo,
    })
    .returning();

  const subtasks = await db.query.cardSubtasks.findMany({ where: eq(cardSubtasks.cardId, cardId) });
  if (subtasks.length > 0) {
    await db.insert(cardSubtasks).values(
      subtasks.map((s) => ({
        cardId: copy.id,
        title: s.title,
        isDone: s.isDone,
        order: s.order,
        dueDate: s.dueDate,
        // Mesmo motivo do responsável do card: só mantém se a pessoa está no destino.
        assignedToId: null,
      }))
    );
  }

  await logActivity({
    cardId: copy.id,
    boardId: targetBoardId,
    actorId: session.user.id,
    type: "transferred",
    message: sameWorkspace
      ? `copiou esta tarefa do board "${sourceBoard.name}"`
      : `copiou esta tarefa de outro workspace ("${sourceBoard.name}")`,
  });

  return NextResponse.json({ success: true, data: copy }, { status: 201 });
}
