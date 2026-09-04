"use client";

import { useMemo, useState } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { cn, priorityConfig, formatDate, initials } from "@/lib/utils";
import type { KanbanCardWithDetails, KanbanColumnWithCards } from "@/types";

interface Props {
  columns: KanbanColumnWithCards[];
  onCardClick: (card: KanbanCardWithDetails) => void;
}

type SortKey = "title" | "priority" | "dueDate";

export function ListView({ columns, onCardClick }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");

  const rows = useMemo(() => {
    const flat = columns.flatMap((col) =>
      (col.cards ?? []).map((c) => ({ ...c, columnName: col.name, columnColor: col.color }))
    );
    return [...flat].sort((a, b) => {
      if (sortKey === "title") return a.title.localeCompare(b.title);
      if (sortKey === "priority") {
        const order = { urgent: 0, high: 1, medium: 2, low: 3 };
        return order[a.priority] - order[b.priority];
      }
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [columns, sortKey]);

  if (rows.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-10 text-sm text-muted-foreground">
        Nenhuma tarefa neste board ainda.
      </div>
    );
  }

  return (
    <div className="p-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="cursor-pointer" onClick={() => setSortKey("title")}>
              Tarefa
            </TableHead>
            <TableHead>Coluna</TableHead>
            <TableHead className="cursor-pointer" onClick={() => setSortKey("priority")}>
              Prioridade
            </TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead className="cursor-pointer" onClick={() => setSortKey("dueDate")}>
              Prazo
            </TableHead>
            <TableHead>Anexos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((card) => (
            <TableRow key={card.id} className="cursor-pointer" onClick={() => onCardClick(card)}>
              <TableCell className="font-medium max-w-xs truncate">{card.title}</TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: card.columnColor ?? "#64748b" }} />
                  {card.columnName}
                </span>
              </TableCell>
              <TableCell>
                <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", priorityConfig[card.priority].color)}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", priorityConfig[card.priority].dot)} />
                  {priorityConfig[card.priority].label}
                </span>
              </TableCell>
              <TableCell>
                {card.assignedTo ? (
                  <span className="inline-flex items-center gap-2 text-xs">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[9px] font-semibold flex items-center justify-center overflow-hidden">
                      {card.assignedTo.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={card.assignedTo.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        initials(card.assignedTo.name || "?")
                      )}
                    </span>
                    {card.assignedTo.name}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                {card.dueDate ? formatDate(card.dueDate) : "—"}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {card.attachments && card.attachments.length > 0 ? `📎 ${card.attachments.length}` : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
