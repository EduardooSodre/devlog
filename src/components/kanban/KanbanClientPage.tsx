"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { Plus, MoreHorizontal, X, Loader2, Kanban, Settings, Trash2, Check, Palette, ChevronDown, LayoutGrid, List as ListIcon, CalendarDays, Paperclip, GanttChartSquare, MessageSquare, UserCircle2, EyeOff, Archive, Lock } from "lucide-react";
import { cn, priorityConfig, difficultyConfig, formatDate, initials } from "@/lib/utils";
import type { KanbanBoardWithColumns, KanbanCardWithDetails, KanbanColumnWithCards } from "@/types";
import { CardModal } from "./CardModal";
import { BoardAccessPanel } from "./BoardAccessPanel";
import { DueDateAlerts } from "./DueDateAlerts";
import { BoardCanvas } from "./BoardCanvas";
import { ListView } from "./ListView";
import { CalendarView } from "./CalendarView";
import { FilesView } from "./FilesView";
import { TimelineView } from "./TimelineView";
import { MessagesView } from "./MessagesView";
import { FilterPanel, EMPTY_FILTERS, applyCardFilters, type CardFilters } from "./FilterPanel";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const VIEWS = [
  { id: "board", label: "Painel", icon: LayoutGrid },
  { id: "list", label: "Lista", icon: ListIcon },
  { id: "timeline", label: "Cronograma", icon: GanttChartSquare },
  { id: "calendar", label: "Calendário", icon: CalendarDays },
  { id: "messages", label: "Mensagens", icon: MessageSquare },
  { id: "files", label: "Arquivos", icon: Paperclip },
] as const;
type ViewId = (typeof VIEWS)[number]["id"];

const BOARD_COLORS = ["#4f6ef7", "#22d3ee", "#10b981", "#f59e0b", "#f97316", "#ef4444", "#ec4899", "#a855f7"];

interface Props {
  initialBoards: KanbanBoardWithColumns[];
  workspaceId: string;
  otherWorkspaces?: { id: string; name: string }[];
}

export function KanbanClientPage({ initialBoards, workspaceId, otherWorkspaces = [] }: Props) {
  const [boards, setBoards] = useState<KanbanBoardWithColumns[]>(initialBoards);
  const [activeBoard, setActiveBoard] = useState<KanbanBoardWithColumns | null>(
    initialBoards[0] ?? null
  );
  const [selectedCard, setSelectedCard] = useState<KanbanCardWithDetails | null>(null);
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  // "personal" (padrão — só o criador vê), "workspace" (todo mundo), ou o id de um
  // departamento específico.
  const [newBoardMode, setNewBoardMode] = useState<string>("personal");
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch(`/api/workspaces/departments?workspaceId=${workspaceId}`)
      .then((res) => res.json())
      .then((json) => setDepartments(json.data ?? []))
      .catch(() => {});
  }, [workspaceId]);
  const [addingCardToColumn, setAddingCardToColumn] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [loadingCard, setLoadingCard] = useState(false);
  const [editingBoard, setEditingBoard] = useState(false);
  const [editBoardName, setEditBoardName] = useState("");
  const [editBoardColor, setEditBoardColor] = useState("");
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [creatingColumn, setCreatingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [showBoardSettings, setShowBoardSettings] = useState(false);
  const [showBoardSwitcher, setShowBoardSwitcher] = useState(false);
  const [view, setView] = useState<ViewId>("board");
  const [filterMine, setFilterMine] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(true);
  const [cardFilters, setCardFilters] = useState<CardFilters>(EMPTY_FILTERS);
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const isDraggingRef = useRef(false);

  // "Parece vivo" sem WebSocket: revalida os boards a cada 15s e substitui os dados,
  // preservando a seleção. ponytail: real-time de verdade (WebSocket/Pusher/Ably) pede
  // um serviço externo — isso aqui é o suficiente pra ver mudanças de outra pessoa sem
  // dar F5, e nunca atropela um drag em andamento ou o modal de card aberto.
  useEffect(() => {
    const interval = setInterval(async () => {
      if (selectedCard || isDraggingRef.current) return;
      try {
        const res = await fetch(`/api/kanban/boards?workspaceId=${workspaceId}`);
        if (!res.ok) return;
        const json = await res.json();
        const freshBoards: KanbanBoardWithColumns[] = json.data ?? [];
        setBoards(freshBoards);
        setActiveBoard((prev) => (prev ? freshBoards.find((b) => b.id === prev.id) ?? prev : freshBoards[0] ?? null));
      } catch {
        // silencioso — próxima tentativa em 15s
      }
    }, 15_000);
    return () => clearInterval(interval);
  }, [workspaceId, selectedCard]);

  // "Minhas tarefas" se aplica em qualquer view; "Ocultar concluídas" só nas views de
  // planejamento (lista/cronograma/calendário) — no Painel a coluna Concluído é o
  // lugar natural de ver o que já foi feito, então esconder lá tiraria a função do board.
  const filteredColumns = useMemo(() => {
    if (!activeBoard) return [];
    return activeBoard.columns.map((col) => ({
      ...col,
      cards: (col.cards ?? []).filter((c) => !filterMine || c.assignedToId === currentUserId),
    }));
  }, [activeBoard, filterMine, currentUserId]);

  const planningColumns = useMemo(
    () =>
      filteredColumns.map((col) => ({
        ...col,
        cards: (col.cards ?? [])
          .filter((c) => !hideCompleted || c.status !== "done")
          .filter((c) => applyCardFilters(c, cardFilters)),
      })),
    [filteredColumns, hideCompleted, cardFilters]
  );

  // Painel mantém "Concluído" sempre visível de propósito (ver comentário acima), mas
  // "Minhas tarefas" e os filtros avançados também se aplicam aqui — sem isso o botão
  // Filtrar fica sem efeito nenhum na view onde ele mais aparece.
  const boardColumns = useMemo(
    () =>
      filteredColumns.map((col) => ({
        ...col,
        cards: (col.cards ?? []).filter((c) => applyCardFilters(c, cardFilters)),
      })),
    [filteredColumns, cardFilters]
  );

  // Pra popular os pickers de Responsável/Criador do FilterPanel com quem já aparece
  // em algum card do board ativo — evita listar o workspace inteiro sem necessidade.
  const filterPeople = useMemo(() => {
    if (!activeBoard) return [];
    const map = new Map<string, { id: string; name: string | null; image: string | null }>();
    for (const col of activeBoard.columns) {
      for (const c of col.cards ?? []) {
        if (c.assignedTo) map.set(c.assignedTo.id, c.assignedTo);
        if (c.createdBy) map.set(c.createdBy.id, c.createdBy);
      }
    }
    return [...map.values()];
  }, [activeBoard]);

  // ── Create board ──
  async function handleCreateBoard() {
    if (!newBoardName.trim()) return;
    try {
      const isPersonal = newBoardMode === "personal";
      const departmentId = isPersonal || newBoardMode === "workspace" ? undefined : newBoardMode;
      const res = await fetch("/api/kanban/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newBoardName.trim(),
          workspaceId,
          isPersonal,
          departmentId,
        }),
      });
      const { data } = await res.json();
      if (!res.ok) throw new Error();
      const newBoard = { ...data, columns: [] };
      setBoards((b) => [newBoard, ...b]);
      setActiveBoard(newBoard);
      setNewBoardName("");
      setNewBoardMode("personal");
      setCreatingBoard(false);
      setShowBoardSwitcher(false);
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
      setSelectedCard(data); // abre o dialog para completar detalhes, anexos e responsável
      toast.success("Card criado!");
    } catch {
      toast.error("Erro ao criar card");
    } finally {
      setLoadingCard(false);
    }
  }

  // ── Drag & Drop ──
  const onDragStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const onDragEnd = useCallback(
    async (result: DropResult) => {
      isDraggingRef.current = false;
      if (!result.destination || !activeBoard) return;
      const { source, destination, draggableId } = result;
      if (source.droppableId === destination.droppableId && source.index === destination.index)
        return;

      // Optimistic update
      const newColumns = activeBoard.columns.map((col) => ({ ...col, cards: [...(col.cards ?? [])] }));
      const srcCol = newColumns.find((c) => c.id === source.droppableId)!;
      const dstCol = newColumns.find((c) => c.id === destination.droppableId)!;

      // Com "Minhas tarefas"/Filtrar ativos, o Painel arrasta sobre a lista FILTRADA —
      // source.index/destination.index são posições nela, não na coluna real. Acha a
      // posição real pelo id do card (o próprio ou o vizinho de destino) em vez de usar
      // o índice cru contra o array cheio, senão o card pula pra posição errada.
      const dstFiltered = boardColumns.find((c) => c.id === destination.droppableId)?.cards ?? [];
      const realSrcIndex = srcCol.cards.findIndex((c) => c.id === draggableId);
      const [movedCard] = srcCol.cards.splice(realSrcIndex, 1);
      const neighbor = destination.index < dstFiltered.length ? dstFiltered[destination.index] : null;
      const realDstIndex = neighbor ? dstCol.cards.findIndex((c) => c.id === neighbor.id) : dstCol.cards.length;
      dstCol.cards.splice(realDstIndex === -1 ? dstCol.cards.length : realDstIndex, 0, movedCard);

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
            order: realDstIndex === -1 ? dstCol.cards.length - 1 : realDstIndex,
          }),
        });
      } catch {
        toast.error("Erro ao mover card");
      }
    },
    [activeBoard, boardColumns]
  );

  // ── Update card from modal ──
  // Substitui o card em qualquer coluna onde ele esteja e, se columnId mudou (ex.:
  // completar a tarefa move pra "Concluído" automaticamente), realoca pra coluna certa
  // em vez de deixar uma cópia desatualizada parada na coluna antiga.
  function relocateCard(columns: KanbanColumnWithCards[], updated: KanbanCardWithDetails) {
    const stripped = columns.map((col) => ({
      ...col,
      cards: (col.cards ?? []).filter((c) => c.id !== updated.id),
    }));
    return stripped.map((col) =>
      col.id === updated.columnId ? { ...col, cards: [...(col.cards ?? []), updated] } : col
    );
  }

  function handleCardUpdate(updated: KanbanCardWithDetails) {
    setBoards((prev) =>
      prev.map((b) => (b.id === updated.boardId ? { ...b, columns: relocateCard(b.columns, updated) } : b))
    );
    setActiveBoard((prev) =>
      prev && prev.id === updated.boardId ? { ...prev, columns: relocateCard(prev.columns, updated) } : prev
    );
    setSelectedCard(updated);
  }

  async function handleCardDelete(cardId: string, opts?: { skipServerDelete?: boolean }) {
    try {
      if (!opts?.skipServerDelete) {
        const res = await fetch(`/api/kanban/cards?id=${cardId}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
      }

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
      if (!opts?.skipServerDelete) toast.success("Tarefa excluída");
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

  async function handleSaveBoardEdit() {
    if (!editBoardName.trim()) return;
    await handleUpdateBoard({ name: editBoardName.trim(), color: editBoardColor });
    setEditingBoard(false);
  }

  async function handleChangeBoardVisibility(mode: string) {
    if (!activeBoard) return;
    const isPersonal = mode === "personal";
    const departmentId = isPersonal || mode === "workspace" ? null : mode;
    try {
      const res = await fetch("/api/kanban/boards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activeBoard.id, isPersonal, departmentId }),
      });
      if (!res.ok) throw new Error();
      const updatedBoard = { ...activeBoard, isPersonal, departmentId };
      setBoards((prev) => prev.map((b) => (b.id === activeBoard.id ? updatedBoard : b)));
      setActiveBoard(updatedBoard);
      toast.success(
        isPersonal ? "Board agora é pessoal" : departmentId ? "Board restrito ao departamento" : "Board visível para todo o workspace"
      );
    } catch {
      toast.error("Erro ao alterar acesso do board");
    }
  }

  async function handleArchiveBoard() {
    if (!activeBoard) return;
    try {
      const res = await fetch("/api/kanban/boards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activeBoard.id, isArchived: true }),
      });
      if (!res.ok) throw new Error();
      toast.success("Board arquivado");
      const updatedBoards = boards.filter((b) => b.id !== activeBoard.id);
      setBoards(updatedBoards);
      setActiveBoard(updatedBoards[0] || null);
      setShowBoardSettings(false);
    } catch {
      toast.error("Erro ao arquivar board");
    }
  }

  const cardsWithDue = boards.flatMap((b) =>
    b.columns.flatMap((col) =>
      col.cards
        .filter((c) => c.dueDate && c.status !== "done" && c.status !== "cancelled")
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
      {/* ── Title row: board switcher + settings ── */}
      <div className="flex items-center justify-between gap-2 px-6 pt-5 pb-1">
        <div className="relative min-w-0 flex-1">
          <button
            onClick={() => setShowBoardSwitcher((v) => !v)}
            className="flex items-center gap-1.5 -ml-2 px-2 py-1 rounded-lg text-lg sm:text-xl font-semibold hover:bg-card transition-colors max-w-full min-w-0 w-full"
          >
            {activeBoard && (
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: activeBoard.color ?? "#64748b" }}
              />
            )}
            <span className="truncate min-w-0" title={activeBoard?.name}>{activeBoard?.name ?? "Nenhum board"}</span>
            <ChevronDown className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", showBoardSwitcher && "rotate-180")} />
          </button>

          {showBoardSwitcher && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowBoardSwitcher(false)} />
              <div className="absolute left-0 top-full mt-1 w-72 bg-card border border-border rounded-2xl shadow-xl z-50 p-2 animate-in fade-in zoom-in duration-200">
                {boards.length > 0 && (
                  <div className="max-h-64 overflow-y-auto space-y-0.5 mb-1">
                    {boards.map((board) => (
                      <button
                        key={board.id}
                        onClick={() => {
                          setActiveBoard(board);
                          setShowBoardSwitcher(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left transition-colors",
                          activeBoard?.id === board.id
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-foreground hover:bg-primary/5"
                        )}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: board.color ?? "#64748b" }}
                        />
                        <span className="truncate flex-1">{board.name}</span>
                        {board.isPersonal && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}

                <div className={cn(boards.length > 0 && "border-t border-border pt-1")}>
                  {creatingBoard ? (
                    <div className="p-1 space-y-2">
                      <input
                        autoFocus
                        value={newBoardName}
                        onChange={(e) => setNewBoardName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCreateBoard();
                          if (e.key === "Escape") setCreatingBoard(false);
                        }}
                        placeholder="Nome do board…"
                        className="w-full h-9 px-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                      />
                      <select
                        value={newBoardMode}
                        onChange={(e) => setNewBoardMode(e.target.value)}
                        title="Quem vai ver este board"
                        className="w-full h-9 px-2 bg-background border border-border rounded-lg text-xs text-muted-foreground focus:outline-none focus:border-primary"
                      >
                        <option value="personal">Pessoal (só você)</option>
                        <option value="workspace">Todo o workspace</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCreateBoard}
                          className="flex-1 bg-primary text-white text-xs font-semibold py-2 rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Criar
                        </button>
                        <button
                          onClick={() => setCreatingBoard(false)}
                          className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setCreatingBoard(true)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Novo board
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {activeBoard && (
          <div className="relative shrink-0">
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
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => {
                    setShowBoardSettings(false);
                    setEditingBoard(false);
                  }}
                />
                <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-2xl shadow-xl z-50 p-2 animate-in fade-in zoom-in duration-200 max-h-[80vh] overflow-y-auto">
                  <div className="px-3 py-2 border-b border-border mb-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configurações</p>
                  </div>

                  {editingBoard ? (
                    <div className="p-2 space-y-3">
                      <input
                        autoFocus
                        value={editBoardName}
                        onChange={(e) => setEditBoardName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveBoardEdit()}
                        placeholder="Nome do board…"
                        className="w-full h-9 px-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                      />
                      <div className="flex items-center gap-2">
                        {BOARD_COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => setEditBoardColor(c)}
                            title={c}
                            className={cn(
                              "w-6 h-6 rounded-full transition-transform hover:scale-110",
                              editBoardColor === c && "ring-2 ring-offset-2 ring-offset-card ring-foreground"
                            )}
                            style={{ background: c }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSaveBoardEdit}
                          className="flex-1 bg-primary text-white text-xs font-semibold py-2 rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => setEditingBoard(false)}
                          className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditBoardName(activeBoard.name);
                        setEditBoardColor(activeBoard.color ?? BOARD_COLORS[0]);
                        setEditingBoard(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary rounded-xl transition-colors"
                    >
                      <Palette className="w-4 h-4" /> Editar Nome/Cor
                    </button>
                  )}

                  <div className="my-1 border-t border-border" />

                  <BoardAccessPanel
                    workspaceId={workspaceId}
                    isPersonal={activeBoard.isPersonal}
                    departmentId={activeBoard.departmentId}
                    departments={departments}
                    onChangeVisibility={handleChangeBoardVisibility}
                  />

                  <div className="my-1 border-t border-border" />

                  <button
                    onClick={handleArchiveBoard}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary rounded-xl transition-colors"
                  >
                    <Archive className="w-4 h-4" /> Arquivar Board
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

      {/* ── View tabs row ── */}
      {activeBoard && (
        <div className="flex flex-wrap items-center justify-between gap-y-1 px-6 border-b border-border">
          <Tabs value={view} onValueChange={(v) => setView(v as ViewId)}>
            <TabsList>
              {VIEWS.map(({ id, label, icon: Icon }) => (
                <TabsTrigger key={id} value={id} title={label}>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 py-2">
              <button
                onClick={() => setFilterMine((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors",
                  filterMine
                    ? "bg-primary/10 border-primary/40 text-primary font-medium"
                    : "border-border text-muted-foreground hover:border-primary/30"
                )}
              >
                <UserCircle2 className="w-3.5 h-3.5" />
                Minhas tarefas
              </button>
              {(view === "list" || view === "timeline" || view === "calendar") && (
                <button
                  onClick={() => setHideCompleted((v) => !v)}
                  className={cn(
                    "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors",
                    hideCompleted
                      ? "bg-primary/10 border-primary/40 text-primary font-medium"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  )}
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  Ocultar concluídas
                </button>
              )}
              <FilterPanel filters={cardFilters} onChange={setCardFilters} people={filterPeople} />
            </div>
        </div>
      )}

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
      ) : view === "list" ? (
        <ListView columns={planningColumns} onCardClick={setSelectedCard} />
      ) : view === "timeline" ? (
        <TimelineView columns={planningColumns} onCardClick={setSelectedCard} />
      ) : view === "calendar" ? (
        <CalendarView columns={planningColumns} onCardClick={setSelectedCard} />
      ) : view === "messages" ? (
        <MessagesView columns={filteredColumns} onCardClick={setSelectedCard} />
      ) : view === "files" ? (
        <FilesView columns={filteredColumns} onCardClick={setSelectedCard} />
      ) : (
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <BoardCanvas>
          <div className="flex gap-6 p-6 h-full items-stretch w-max">
            {boardColumns.map((column) => (
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
          workspaceId={workspaceId}
          allBoards={boards.map((b) => ({ id: b.id, name: b.name, color: b.color }))}
          otherWorkspaces={otherWorkspaces}
          onClose={() => setSelectedCard(null)}
          onUpdate={handleCardUpdate}
          onDelete={handleCardDelete}
          // Depois de MOVER pra outro workspace, o card some do board atual — mesmo
          // efeito local de uma exclusão (o card real continua existindo, só que lá).
          onMovedAway={() => handleCardDelete(selectedCard.id, { skipServerDelete: true })}
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
                <div className="fixed inset-0 z-40" onClick={() => setShowColumnActions(false)} />
                <div className="absolute right-0 mt-2 w-40 bg-card border border-border rounded-xl shadow-xl z-50 p-1 animate-in fade-in zoom-in duration-200">
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
                {(drag, snap) => {
                  const cardEl = (
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
                        <span className="text-muted-foreground/40">·</span>
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            difficultyConfig[card.difficulty].dot
                          )}
                        />
                        <span
                          className={cn(
                            "text-xs font-medium",
                            difficultyConfig[card.difficulty].color
                          )}
                        >
                          {difficultyConfig[card.difficulty].label}
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
                        {card.subtasks && card.subtasks.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ☑ {card.subtasks.filter((s) => s.isDone).length}/{card.subtasks.length}
                          </span>
                        )}
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
                      {card.assignedTo && (
                        <div
                          title={card.assignedTo.name ?? undefined}
                          className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center overflow-hidden shrink-0"
                        >
                          {card.assignedTo.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={card.assignedTo.image} alt={card.assignedTo.name ?? ""} className="w-full h-full object-cover" />
                          ) : (
                            initials(card.assignedTo.name || "?")
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  );

                  // BoardCanvas usa CSS transform pra fazer o pan horizontal (ver comentário lá) — mas
                  // isso vira o "containing block" de qualquer descendente com position:fixed, incluindo
                  // o card sendo arrastado. Resultado: o card fica preso ao offset do pan em vez de
                  // seguir o ponteiro do mouse. Escapando pra um portal em document.body durante o drag,
                  // o position:fixed do @hello-pangea/dnd volta a ser relativo à viewport (comportamento
                  // documentado da lib para ancestrais com transform).
                  return snap.isDragging ? createPortal(cardEl, document.body) : cardEl;
                }}
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
