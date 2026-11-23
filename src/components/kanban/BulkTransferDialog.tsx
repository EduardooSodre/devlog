"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import { canMoveCard } from "@/lib/permissions";

interface SelectedCard {
  id: string;
  columnName: string;
  createdById: string;
  assignedToId: string | null;
}

interface TargetBoard {
  id: string;
  name: string;
  columns: { id: string; name: string; order: number }[];
}

interface Props {
  cards: SelectedCard[]; // na ordem em que aparecem no board — a ordem é mantida no destino
  workspaceId: string;
  currentBoardId: string;
  currentUserId: string;
  currentUserRole: string;
  otherWorkspaces: { id: string; name: string }[];
  onClose: () => void;
  /** Chamado ao terminar (com ou sem falhas); recebe os ids que NÃO foram enviados. */
  onDone: (failedIds: string[]) => void;
}

const CREATE = "__create__";
const norm = (s: string) => s.trim().toLocaleLowerCase("pt-BR");

export function BulkTransferDialog({ cards, workspaceId, currentBoardId, currentUserId, currentUserRole, otherWorkspaces, onClose, onDone }: Props) {
  const [targetWorkspaceId, setTargetWorkspaceId] = useState(otherWorkspaces[0]?.id ?? workspaceId);
  const [boards, setBoards] = useState<TargetBoard[] | null>(null);
  const [targetBoardId, setTargetBoardId] = useState("");
  // nome da coluna de origem (normalizado) → id da coluna de destino ou CREATE
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [running, setRunning] = useState<"move" | "copy" | null>(null);
  const [progress, setProgress] = useState(0);

  // Colunas de origem envolvidas, na ordem em que aparecem, com quantos cards cada.
  const sourceColumns = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const c of cards) {
      const key = norm(c.columnName);
      const entry = map.get(key) ?? { name: c.columnName, count: 0 };
      entry.count++;
      map.set(key, entry);
    }
    return [...map.entries()].map(([key, v]) => ({ key, ...v }));
  }, [cards]);

  useEffect(() => {
    setBoards(null);
    setTargetBoardId("");
    fetch(`/api/kanban/boards?workspaceId=${targetWorkspaceId}`)
      .then((res) => res.json())
      .then((json) => {
        const list: TargetBoard[] = (json.data ?? []).filter((b: TargetBoard) => b.id !== currentBoardId);
        setBoards(list);
        setTargetBoardId(list[0]?.id ?? "");
      })
      .catch(() => setBoards([]));
  }, [targetWorkspaceId, currentBoardId]);

  const targetBoard = boards?.find((b) => b.id === targetBoardId);

  // Tarefa de outra pessoa nunca é movida (a dona a perderia): vira cópia vinculada, que
  // acompanha as edições do original. Mesma regra que o servidor aplica.
  const sameWorkspace = targetWorkspaceId === workspaceId;
  const mustCopy = (c: SelectedCard) => !canMoveCard(currentUserId, c, currentUserRole, sameWorkspace);
  const forcedCopyCount = cards.filter(mustCopy).length;

  // Ao trocar o board de destino, pré-seleciona a coluna de mesmo nome; se não existir,
  // sugere criar — a pessoa pode trocar pra qualquer coluna que já exista.
  useEffect(() => {
    if (!targetBoard) return;
    const next: Record<string, string> = {};
    for (const src of sourceColumns) {
      next[src.key] = targetBoard.columns.find((c) => norm(c.name) === src.key)?.id ?? CREATE;
    }
    setMapping(next);
  }, [targetBoard, sourceColumns]);

  async function run(mode: "move" | "copy") {
    if (!targetBoard || running) return;
    setRunning(mode);
    setProgress(0);

    // 1) Cria as colunas que faltam. Se falhar aqui, nada foi enviado ainda.
    const resolved = { ...mapping };
    try {
      let order = targetBoard.columns.length;
      for (const src of sourceColumns) {
        if (resolved[src.key] !== CREATE) continue;
        const { data } = await api<{ data: { id: string } }>("/api/kanban/columns", {
          method: "POST",
          json: { name: src.name, boardId: targetBoard.id, order: order++ },
        });
        resolved[src.key] = data.id;
      }
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível criar a coluna no destino"));
      setRunning(null);
      return;
    }

    // 2) Envia os cards um a um, na ordem do board, pra manter a ordem no destino.
    // ponytail: um request por card; endpoint em lote se isso virar centenas por vez.
    const failed: string[] = [];
    let copiedInstead = 0;
    for (const [i, card] of cards.entries()) {
      const forced = mode === "move" && mustCopy(card);
      if (forced) copiedInstead++;
      try {
        await api("/api/kanban/cards/transfer", {
          method: "POST",
          json: {
            cardId: card.id,
            targetWorkspaceId,
            targetBoardId: targetBoard.id,
            targetColumnId: resolved[norm(card.columnName)],
            mode: forced ? "copy" : mode,
            link: card.createdById !== currentUserId,
          },
        });
      } catch {
        failed.push(card.id);
      }
      setProgress(i + 1);
    }

    const ok = cards.length - failed.length;
    const verb = mode === "move" ? "movida" : "copiada";
    if (ok > 0) {
      toast.success(`${ok} tarefa${ok > 1 ? "s" : ""} ${verb}${ok > 1 ? "s" : ""} para "${targetBoard.name}"`, {
        description: copiedInstead > 0 ? `${copiedInstead} de outras pessoas foram copiadas (vinculadas), não movidas.` : undefined,
      });
    }
    if (failed.length > 0) toast.error(`${failed.length} não ${failed.length > 1 ? "puderam" : "pôde"} ser enviada${failed.length > 1 ? "s" : ""} — continuam selecionadas`);
    setRunning(null);
    onDone(failed);
  }

  const workspaceOptions = [{ id: workspaceId, name: "Este workspace" }, ...otherWorkspaces];
  const missingCount = sourceColumns.filter((s) => mapping[s.key] === CREATE).length;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={running ? undefined : onClose} />
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">
            Enviar {cards.length} tarefa{cards.length > 1 ? "s" : ""}
          </h2>
          <button onClick={onClose} disabled={!!running} className="text-muted-foreground hover:text-foreground disabled:opacity-40">
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="block text-[11px] font-medium text-muted-foreground mb-1">Workspace</label>
        <select
          value={targetWorkspaceId}
          onChange={(e) => setTargetWorkspaceId(e.target.value)}
          disabled={!!running}
          className="w-full h-9 bg-background border border-border rounded-lg px-2 text-sm mb-3 focus:outline-none focus:border-primary"
        >
          {workspaceOptions.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>

        <label className="block text-[11px] font-medium text-muted-foreground mb-1">Board</label>
        {boards === null ? (
          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Carregando…</p>
        ) : boards.length === 0 ? (
          <p className="text-xs text-muted-foreground mb-3">Nenhum board disponível neste workspace.</p>
        ) : (
          <select
            value={targetBoardId}
            onChange={(e) => setTargetBoardId(e.target.value)}
            disabled={!!running}
            className="w-full h-9 bg-background border border-border rounded-lg px-2 text-sm mb-4 focus:outline-none focus:border-primary"
          >
            {boards.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}

        {targetBoard && (
          <>
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Colunas</p>
            <div className="space-y-2 mb-4">
              {sourceColumns.map((src) => {
                const missing = mapping[src.key] === CREATE;
                return (
                  <div key={src.key}>
                    <div className="flex items-center gap-2">
                      <span className="flex-1 min-w-0 text-xs truncate">
                        {src.name} <span className="text-muted-foreground">({src.count})</span>
                      </span>
                      <span className="text-muted-foreground text-xs">→</span>
                      <select
                        value={mapping[src.key] ?? CREATE}
                        onChange={(e) => setMapping((m) => ({ ...m, [src.key]: e.target.value }))}
                        disabled={!!running}
                        className="w-44 h-8 bg-background border border-border rounded-lg px-2 text-xs focus:outline-none focus:border-primary"
                      >
                        <option value={CREATE}>+ Criar &quot;{src.name}&quot;</option>
                        {targetBoard.columns.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    {missing && (
                      <p className="flex items-center gap-1 text-[11px] text-amber-500 mt-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        &quot;{src.name}&quot; não existe em {targetBoard.name} — será criada, ou escolha outra coluna.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {missingCount > 0 && targetBoard.columns.length === 0 && (
              <p className="text-[11px] text-muted-foreground mb-3">Este board ainda não tem colunas.</p>
            )}
          </>
        )}

        {forcedCopyCount > 0 && (
          <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
            {forcedCopyCount} tarefa{forcedCopyCount > 1 ? "s" : ""} não {forcedCopyCount > 1 ? "são suas" : "é sua"}:
            ao mover, {forcedCopyCount > 1 ? "serão copiadas" : "será copiada"} em vez de movida{forcedCopyCount > 1 ? "s" : ""},
            pra quem criou não perder. A cópia acompanha as edições feitas no original.
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => run("move")}
            disabled={!targetBoard || !!running}
            className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-white text-xs font-semibold py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {running === "move" && <Loader2 className="w-3 h-3 animate-spin" />}
            {running === "move" ? `Movendo ${progress}/${cards.length}` : "Mover"}
          </button>
          <button
            onClick={() => run("copy")}
            disabled={!targetBoard || !!running}
            className="flex-1 flex items-center justify-center gap-1.5 border border-border text-xs font-semibold py-2 rounded-lg hover:border-primary/40 transition-colors disabled:opacity-50"
          >
            {running === "copy" && <Loader2 className="w-3 h-3 animate-spin" />}
            {running === "copy" ? `Copiando ${progress}/${cards.length}` : "Copiar"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
