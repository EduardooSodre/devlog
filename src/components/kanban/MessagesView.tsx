"use client";

import { useMemo } from "react";
import { MessageSquare } from "lucide-react";
import { formatRelative, initials } from "@/lib/utils";
import type { KanbanCardWithDetails, KanbanColumnWithCards } from "@/types";

interface Props {
  columns: KanbanColumnWithCards[];
  onCardClick: (card: KanbanCardWithDetails) => void;
}

export function MessagesView({ columns, onCardClick }: Props) {
  const messages = useMemo(
    () =>
      columns
        .flatMap((col) =>
          (col.cards ?? []).flatMap((card) =>
            (card.comments ?? []).map((c) => ({ ...c, card }))
          )
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [columns]
  );

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-10 text-center">
        <MessageSquare className="w-8 h-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Nenhum comentário nas tarefas deste board ainda. Abra uma tarefa para começar a conversa.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-3">
      {messages.map((m) => (
        <button
          key={m.id}
          onClick={() => onCardClick(m.card)}
          className="w-full text-left flex gap-3 bg-card border border-border rounded-xl p-3.5 hover:border-primary/30 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center overflow-hidden shrink-0">
            {m.author?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.author.image} alt="" className="w-full h-full object-cover" />
            ) : (
              initials(m.author?.name || "?")
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">{m.author?.name ?? "Alguém"}</span>
              <span className="text-xs text-muted-foreground">comentou em</span>
              <span className="text-xs text-primary font-medium truncate">{m.card.title}</span>
              <span className="text-[11px] text-muted-foreground ml-auto shrink-0">{formatRelative(m.createdAt)}</span>
            </div>
            <p className="text-sm text-foreground/80 mt-1 line-clamp-2">{m.content}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
