"use client";

import { useMemo } from "react";
import { FileText, Paperclip } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { KanbanCardWithDetails, KanbanColumnWithCards } from "@/types";

interface Props {
  columns: KanbanColumnWithCards[];
  onCardClick: (card: KanbanCardWithDetails) => void;
}

function isImage(mimeType?: string | null) {
  return !!mimeType && mimeType.startsWith("image/");
}

export function FilesView({ columns, onCardClick }: Props) {
  const files = useMemo(
    () =>
      columns.flatMap((col) =>
        (col.cards ?? []).flatMap((card) =>
          (card.attachments ?? []).map((att) => ({ ...att, card }))
        )
      ),
    [columns]
  );

  if (files.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-10 text-center">
        <Paperclip className="w-8 h-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Nenhum arquivo anexado nas tarefas deste board ainda.</p>
      </div>
    );
  }

  return (
    <div className="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {files.map((file) => (
        <button
          key={file.id}
          onClick={() => onCardClick(file.card)}
          className="group text-left bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors"
        >
          <div className="aspect-square bg-background flex items-center justify-center overflow-hidden">
            {isImage(file.mimeType) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={file.fileUrl} alt={file.fileName} className="w-full h-full object-cover" />
            ) : (
              <FileText className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div className="p-2.5">
            <p className="text-xs font-medium truncate">{file.fileName}</p>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {file.card.title} · {formatDate(file.createdAt)}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
