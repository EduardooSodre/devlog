"use client";

import { useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { Plus, MoreHorizontal, X, Loader2, Kanban, Settings, Trash2, Check, Palette, ChevronDown } from "lucide-react";
import { cn, priorityConfig, formatDate } from "@/lib/utils";
import type { KanbanBoardWithColumns, KanbanCardWithDetails, KanbanColumnWithCards } from "@/types";
import { CardModal } from "./CardModal";
import { DueDateAlerts } from "./DueDateAlerts";
import { BoardCanvas } from "./BoardCanvas";

interface Props {
  initialBoards: KanbanBoardWithColumns[];
  workspaceId: string;
}

export function KanbanClientPage({ initialBoards, workspaceId }: Props) {
  const [boards, setBoards] = useState<KanbanBoardWithColumns[]>(initialBoards);
  const [activeBoard, setActiveBoard] = useState<KanbanBoardWithColumns | null>(
    initialBoards[0] ?? null
  );
  const [selectedCard, setSelectedCard] = useState<KanbanCardWithDetails | null>(null);
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [addingCardToColumn, setAddingCardToColumn] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [loadingCard, setLoadingCard] = useState(false);
  const [editingBoard, setEditingBoard] = useState(false);
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [creatingColumn, setCreatingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [showBoardSettings, setShowBoardSettings] = useState(false);

  // ── Create board ──
  async function handleCreateBoard() {
    if (!newBoardName.trim()) return;
    try {
      const res = await fetch("/api/kanban/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBoardName.trim(), workspaceId }),
      });
      const { data } = await res.json();
      if (!res.ok) throw new Error();
      const newBoard = { ...data, columns: [] };
      setBoards((b) => [newBoard, ...b]);
      setActiveBoard(newBoard);
      setNewBoardName("");
      setCreatingBoard(false);
      toast.success("Board criado!");
    } catch {
      toast.error("Erro ao criar board");
    }
  }

  // ── Create card ──
  async function handleCreateCard(columnId: string) {
    if (!newCardTitle.trim() || !activeBoard) return;
    setLoadingCard(true);
    try {
      const column = activeBoard.columns.find((c) => c.id === columnId);
      const order = (column?.cards?.length ?? 0);
      const res = await fetch("/api/kanban/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newCardTitle.trim(),
          columnId,
          boardId: activeBoard.id,
          order,
        }),
      });
      const { data } = await res.json();
      if (!res.ok) throw new Error();

      setBoards((prev) =>
        prev.map((b) =>
          b.id !== activeBoard.id
            ? b
            : {
                ...b,
                columns: b.columns.map((col) =>
                  col.id !== columnId
                    ? col
                    : { ...col, cards: [...(col.cards ?? []), data] }
                ),
              }
        )
      );
      setActiveBoard((prev) =>
        prev
          ? {
              ...prev,
              columns: prev.columns.map((col) =>
                col.id !== columnId
                  ? col
                  : { ...col, cards: [...(col.cards ?? []), data] }
              ),
            }
          : prev
      );
      setNewCardTitle("");
      setAddingCardToColumn(null);
      toast.success("Card criado!");
    } catch {
      toast.error("Erro ao criar card");
    } finally {
      setLoadingCard(false);
    }
  }

  // ── Drag & Drop ──
  const onDragEnd = useCallback(
    async (result: DropResult) => {
      if (!result.destination || !activeBoard) return;
      const { source, destination, draggableId } = result;
      if (source.droppableId === destination.droppableId && source.index === destination.index)
        return;

      // Optimistic update
      const newColumns = activeBoard.columns.map((col) => ({ ...col, cards: [...(col.cards ?? [])] }));
      const srcCol = newColumns.find((c) => c.id === source.droppableId)!;
      const dstCol = newColumns.find((c) => c.id === destination.droppableId)!;
      const [movedCard] = srcCol.cards.splice(source.index, 1);
      dstCol.cards.splice(destination.index, 0, movedCard);

      setBoards((prev) =>
        prev.map((b) => (b.id === activeBoard.id ? { ...b, columns: newColumns } : b))
      );
      setActiveBoard((prev) => (prev ? { ...prev, columns: newColumns } : prev));

      // Persist
      try {
        await fetch("/api/kanban/cards", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: draggableId,
            columnId: destination.droppableId,
            order: destination.index,
          }),
        });
      } catch {
        toast.error("Erro ao mover card");
      }
    },
    [activeBoard]
  );

  // ── Update card from modal ──
  function handleCardUpdate(updated: KanbanCardWithDetails) {
    setBoards((prev) =>
      prev.map((b) => ({
        ...b,
        columns: b.columns.map((col) => ({
          ...col,
          cards: (col.cards ?? []).map((c) => (c.id === updated.id ? updated : c)),
        })),
      }))
    );
    setActiveBoard((prev) =>
      prev
        ? {
            ...prev,
            columns: prev.columns.map((col) => ({
              ...col,
              cards: (col.cards ?? []).map((c) => (c.id === updated.id ? updated : c)),
            })),
          }
        : prev
    );
    setSelectedCard(updated);
  }

  async function handleCardDelete(cardId: string) {
    try {
      const res = await fetch(`/api/kanban/cards?id=${cardId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();

      setBoards((prev) =>
        prev.map((b) => ({
          ...b,
          columns: b.columns.map((col) => ({
            ...col,
            cards: (col.cards ?? []).filter((c) => c.id !== cardId),
          })),
        }))
      );
      setActiveBoard((prev) =>
        prev
          ? {
              ...prev,
              columns: prev.columns.map((col) => ({
                ...col,
                cards: (col.cards ?? []).filter((c) => c.id !== cardId),
              })),
            }
          : prev
      );
      setSelectedCard(null);
      toast.success("Tarefa excluída");
    } catch {
      toast.error("Erro ao excluir tarefa");
    }
  }

  // ── Column CRUD ──
  async function handleCreateColumn() {
    if (!newColumnName.trim() || !activeBoard) return;
    try {
      const res = await fetch("/api/kanban/columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newColumnName.trim(),
          boardId: activeBoard.id,
          order: activeBoard.columns.length,
        }),
      });
      const { data } = await res.json();
      if (!res.ok) throw new Error();

      const updatedBoard = { ...activeBoard, columns: [...activeBoard.columns, { ...data, cards: [] }] };
      setBoards((prev) => prev.map((b) => (b.id === activeBoard.id ? updatedBoard : b)));
      setActiveBoard(updatedBoard);
      setNewColumnName("");
      setCreatingColumn(false);
      toast.success("Coluna criada!");
    } catch {
      toast.error("Erro ao criar coluna");
    }
  }

  async function handleDeleteColumn(columnId: string) {
    if (!confirm("Excluir coluna e todas as suas tarefas?")) return;
    try {
      const res = await fetch(`/api/kanban/columns?id=${columnId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();

      const updatedBoard = { ...activeBoard!, columns: activeBoard!.columns.filter((c) => c.id !== columnId) };
      setBoards((prev) => prev.map((b) => (b.id === activeBoard!.id ? updatedBoard : b)));
      setActiveBoard(updatedBoard);
      toast.success("Coluna excluída");
    } catch {
      toast.error("Erro ao excluir coluna");
    }
  }

  // ── Board CRUD ──
  async function handleDeleteBoard() {
    if (!activeBoard || !confirm("Excluir este board permanentemente?")) return;
    try {
      const res = await fetch(`/api/kanban/boards?id=${activeBoard.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();

      toast.success("Board excluído");
      const updatedBoards = boards.filter((b) => b.id !== activeBoard.id);
      setBoards(updatedBoards);
      setActiveBoard(updatedBoards[0] || null);
      setShowBoardSettings(false);
    } catch {
      toast.error("Erro ao excluir board");
    }
  }

  async function handleUpdateBoard(updates: { name?: string; color?: string }) {
    if (!activeBoard) return;
    try {
      const res = await fetch("/api/kanban/boards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activeBoard.id, ...updates }),
      });
      const { data } = await res.json();
      if (!res.ok) throw new Error();

      const updatedBoard = { ...activeBoard, ...data };
      setBoards((prev) => prev.map((b) => (b.id === activeBoard.id ? updatedBoard : b)));
      setActiveBoard(updatedBoard);
      toast.success("Board atualizado");
    } catch {
      toast.error("Erro ao atualizar board");
    }
  }

  const cardsWithDue = boards.flatMap((b) =>
    b.columns.flatMap((col) =>
      col.cards
        .filter((c) => c.dueDate)
        .map((c) => ({
          id: c.id,
          title: c.title,
          dueDate: c.dueDate,
          boardName: b.name,
        }))
    )
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-4">
        <DueDateAlerts cards={cardsWithDue} />
      </div>
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2">
            {boards.map((board) => (
              <button
                key={board.id}
                onClick={() => setActiveBoard(board)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                  activeBoard?.id === board.id
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "hover:bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {board.name}
              </button>
            ))}

            {creatingBoard ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateBoard();
                    if (e.key === "Escape") setCreatingBoard(false);
                  }}
                  placeholder="Nome do board…"
                  className="h-8 px-3 bg-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary w-40"
                />
                <button
                  onClick={handleCreateBoard}
                  className="text-xs text-primary font-medium hover:underline"
                >
                  Criar
                </button>
                <button onClick={() => setCreatingBoard(false)}>
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreatingBoard(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-all text-sm border border-transparent hover:border-border"
              >
                <Plus className="w-3.5 h-3.5" /> Novo board
              </button>
            )}
          </div>
        </div>

        {activeBoard && (
          <div className="relative">
            <button
              onClick={() => setShowBoardSettings(!showBoardSettings)}
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                showBoardSettings ? "bg-primary/10 text-primary" : "hover:bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              <Settings className="w-4 h-4" />
            </button>

            {showBoardSettings && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowBoardSettings(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-2xl shadow-xl z-20 p-2 animate-in fade-in zoom-in duration-200">
                  <div className="px-3 py-2 border-b border-border mb-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configurações</p>
                  </div>
                  <button
                    onClick={() => {
                      const name = prompt("Novo nome do board:", activeBoard.name);
                      if (name && name !== activeBoard.name) handleUpdateBoard({ name });
                      setShowBoardSettings(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary rounded-xl transition-colors"
                  >
                    <Palette className="w-4 h-4" /> Editar Nome/Cor
                  </button>
                  <button
                    onClick={handleDeleteBoard}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Excluir Board
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Board ── */}
      {!activeBoard ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Kanban className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg mb-1">Nenhum board criado</h2>
            <p className="text-muted-foreground text-sm">
              Crie um board para organizar suas tarefas
            </p>
          </div>
          <button
            onClick={() => setCreatingBoard(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Criar primeiro board
          </button>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <BoardCanvas>
          <div className="flex gap-6 p-6 h-full items-stretch w-max">
            {activeBoard.columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                onCardClick={setSelectedCard}
                onDeleteColumn={() => handleDeleteColumn(column.id)}
                addingCard={addingCardToColumn === column.id}
                onStartAdd={() => setAddingCardToColumn(column.id)}
                onCancelAdd={() => {
                  setAddingCardToColumn(null);
                  setNewCardTitle("");
                }}
                newCardTitle={newCardTitle}
                onNewCardTitleChange={setNewCardTitle}
                onCreateCard={() => handleCreateCard(column.id)}
                loadingCard={loadingCard}
              />
            ))}

            {/* Add Column Button */}
            <div className="w-72 shrink-0">
              {creatingColumn ? (
                <div className="bg-card border border-primary/40 rounded-2xl p-4 shadow-lg">
                  <input
                    autoFocus
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateColumn();
                      if (e.key === "Escape") setCreatingColumn(false);
                    }}
                    placeholder="Nome da coluna…"
                    className="w-full h-10 bg-background border border-border rounded-xl px-3 text-sm focus:outline-none focus:border-primary transition-colors mb-3"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateColumn}
                      className="flex-1 bg-primary text-white text-xs font-semibold py-2 rounded-xl hover:bg-primary/90 transition-colors"
                    >
                      Adicionar
                    </button>
                    <button
                      onClick={() => setCreatingColumn(false)}
                      className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setCreatingColumn(true)}
                  className="w-full h-[3.5rem] flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-2xl text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all group"
                >
                  <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium">Nova Coluna</span>
                </button>
              )}
            </div>
          </div>
          </BoardCanvas>
        </DragDropContext>
      )}

      {/* ── Card Modal ── */}
      {selectedCard && (
        <CardModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onUpdate={handleCardUpdate}
          onDelete={handleCardDelete}
        />
      )}
    </div>
  );
}

// ── Column ──
interface ColumnProps {
  column: KanbanColumnWithCards;
  onCardClick: (card: KanbanCardWithDetails) => void;
  addingCard: boolean;
  onStartAdd: () => void;
  onCancelAdd: () => void;
  newCardTitle: string;
  onNewCardTitleChange: (v: string) => void;
  onCreateCard: () => void;
  loadingCard: boolean;
  onDeleteColumn: () => void;
}

function KanbanColumn({
  column,
  onCardClick,
  addingCard,
  onStartAdd,
  onCancelAdd,
  newCardTitle,
  onNewCardTitleChange,
  onCreateCard,
  loadingCard,
  onDeleteColumn,
}: ColumnProps) {
  const [showColumnActions, setShowColumnActions] = useState(false);
  const cards = column.cards ?? [];
  const doneCount = cards.filter((c) => c.status === "done").length;

  return (
    <div className="flex flex-col w-72 shrink-0 h-full max-h-full">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1 shrink-0">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: column.color ?? "#64748b" }}
          />
          <span className="text-sm font-semibold">{column.name}</span>
          <span className="text-xs text-muted-foreground bg-card border border-border px-1.5 py-0.5 rounded-md">
            {cards.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onStartAdd}
            className="w-7 h-7 rounded-lg hover:bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title="Adicionar card"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowColumnActions(!showColumnActions)}
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                showColumnActions ? "bg-primary/10 text-primary" : "hover:bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showColumnActions && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowColumnActions(false)} />
                <div className="absolute right-0 mt-2 w-40 bg-card border border-border rounded-xl shadow-xl z-20 p-1 animate-in fade-in zoom-in duration-200">
                  <button
                    onClick={() => {
                      onDeleteColumn();
                      setShowColumnActions(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir Coluna
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {cards.length > 0 && (
        <div className="h-1 rounded-full bg-border mb-3 overflow-hidden shrink-0">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all duration-500"
            style={{ width: `${(doneCount / cards.length) * 100}%` }}
          />
        </div>
      )}

      {/* Cards drop zone */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            data-col-scroll
            className={cn(
              "flex flex-col gap-2 min-h-[4rem] flex-1 overflow-y-auto no-scrollbar p-2 rounded-xl transition-colors",
              snapshot.isDraggingOver ? "bg-primary/5 border border-primary/20" : "bg-card/30"
            )}
          >
            {cards.map((card, index) => (
              <Draggable key={card.id} draggableId={card.id} index={index}>
                {(drag, snap) => (
                  <div
                    ref={drag.innerRef}
                    {...drag.draggableProps}
                    {...drag.dragHandleProps}
                    onClick={() => onCardClick(card)}
                    className={cn(
                      "bg-card border rounded-xl p-3.5 cursor-pointer group transition-all duration-200",
                      snap.isDragging
                        ? "border-primary/50 shadow-lg shadow-primary/10 rotate-1 scale-105"
                        : "border-border hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-md"
                    )}
                  >
                    {/* Priority dot + status */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            priorityConfig[card.priority].dot
                          )}
                        />
                        <span
                          className={cn(
                            "text-xs font-medium",
                            priorityConfig[card.priority].color
                          )}
                        >
                          {priorityConfig[card.priority].label}
                        </span>
                      </div>
                      {card.status === "done" && (
                        <span className="text-xs text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">
                          ✓ Feito
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-medium leading-snug mb-2 line-clamp-2">
                      {card.title}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2">
                        {card.attachments && card.attachments.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            📎 {card.attachments.length}
                          </span>
                        )}
                        {card.dueDate && (
                          <span className="text-xs text-muted-foreground">
                            📅 {formatDate(card.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}

            {/* Add card input */}
            {addingCard && (
              <div className="bg-card border border-primary/40 rounded-xl p-3">
                <textarea
                  autoFocus
                  value={newCardTitle}
                  onChange={(e) => onNewCardTitleChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onCreateCard();
                    }
                    if (e.key === "Escape") onCancelAdd();
                  }}
                  placeholder="Título do card…"
                  rows={2}
                  className="w-full bg-transparent text-sm resize-none focus:outline-none placeholder:text-muted-foreground/60"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={onCreateCard}
                    disabled={loadingCard || !newCardTitle.trim()}
                    className="flex items-center gap-1.5 bg-primary text-white text-xs px-3 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {loadingCard ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    Criar
                  </button>
                  <button
                    onClick={onCancelAdd}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Droppable>

      {/* Add card button (below) */}
      {!addingCard && (
        <button
          onClick={onStartAdd}
          className="flex items-center gap-2 mt-2 px-2 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-card transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Adicionar card
        </button>
      )}
    </div>
  );
}
