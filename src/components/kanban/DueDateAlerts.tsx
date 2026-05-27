"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { isPast, isToday, parseISO } from "date-fns";

type CardWithDue = {
  id: string;
  title: string;
  dueDate: string | Date | null;
  boardName?: string;
};

interface DueDateAlertsProps {
  cards: CardWithDue[];
}

export function DueDateAlerts({ cards }: DueDateAlertsProps) {
  const withDue = cards.filter((c) => c.dueDate);

  const overdue = withDue.filter((c) => {
    const d = typeof c.dueDate === "string" ? parseISO(c.dueDate) : c.dueDate!;
    return isPast(d) && !isToday(d);
  });

  const dueToday = withDue.filter((c) => {
    const d = typeof c.dueDate === "string" ? parseISO(c.dueDate) : c.dueDate!;
    return isToday(d);
  });

  if (overdue.length === 0 && dueToday.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {overdue.length > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-xl border border-red-400/30 bg-red-400/10">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-400">
              {overdue.length} card(s) com prazo vencido
            </p>
            <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
              {overdue.slice(0, 5).map((c) => (
                <li key={c.id}>
                  {c.title}
                  {c.boardName ? ` · ${c.boardName}` : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {dueToday.length > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-xl border border-yellow-400/30 bg-yellow-400/10">
          <Clock className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-400">
              {dueToday.length} card(s) vencem hoje
            </p>
            <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
              {dueToday.slice(0, 5).map((c) => (
                <li key={c.id}>{c.title}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
