"use client";

import { useMemo } from "react";
import { eachDayOfInterval, differenceInCalendarDays, format, isToday, isSameMonth, addDays, max as dateMax, min as dateMin } from "date-fns";
import { ptBR } from "date-fns/locale";
import { GanttChartSquare } from "lucide-react";
import { cn, priorityConfig } from "@/lib/utils";
import type { KanbanCardWithDetails, KanbanColumnWithCards } from "@/types";

interface Props {
  columns: KanbanColumnWithCards[];
  onCardClick: (card: KanbanCardWithDetails) => void;
}

const DAY_WIDTH = 48;
const LABEL_WIDTH = 240;
const ROW_HEIGHT = 52;

export function TimelineView({ columns, onCardClick }: Props) {
  const rows = useMemo(
    () =>
      columns.flatMap((col) =>
        (col.cards ?? []).map((c) => ({
          card: c,
          columnName: col.name,
          columnColor: col.color || "#4f6ef7",
          start: new Date(c.createdAt),
          end: c.dueDate ? new Date(c.dueDate) : addDays(new Date(c.createdAt), 1),
        }))
      ),
    [columns]
  );

  const { rangeStart, days } = useMemo(() => {
    if (rows.length === 0) {
      const start = addDays(new Date(), -2);
      return { rangeStart: start, days: eachDayOfInterval({ start, end: addDays(start, 20) }) };
    }
    const earliest = dateMin(rows.map((r) => r.start));
    const latest = dateMax(rows.map((r) => (r.end > r.start ? r.end : r.start)));
    const start = addDays(earliest, -2);
    const end = dateMax([addDays(start, 20), addDays(latest, 2)]);
    return { rangeStart: start, days: eachDayOfInterval({ start, end }) };
  }, [rows]);

  const todayOffset = differenceInCalendarDays(new Date(), rangeStart);
  const gridWidth = days.length * DAY_WIDTH;

  if (rows.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-10 text-center">
        <GanttChartSquare className="w-8 h-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Nenhuma tarefa neste board ainda.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ width: LABEL_WIDTH + gridWidth, minWidth: "100%" }}>
            {/* Header de dias */}
            <div className="flex border-b border-border">
              <div className="shrink-0 sticky left-0 z-20 bg-card border-r border-border" style={{ width: LABEL_WIDTH }} />
              <div className="relative flex">
                {days.map((day, i) => (
                  <div
                    key={day.toISOString()}
                    style={{ width: DAY_WIDTH }}
                    className={cn(
                      "shrink-0 text-center py-2.5",
                      i > 0 && !isSameMonth(day, days[i - 1]) && "border-l border-border/70"
                    )}
                  >
                    <div className={cn("text-sm font-semibold", isToday(day) ? "text-primary" : "text-foreground/90")}>
                      {format(day, "dd", { locale: ptBR })}
                    </div>
                    <div className="text-[10px] uppercase text-muted-foreground mt-0.5">
                      {format(day, "EEEEE", { locale: ptBR })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Linhas de tarefas */}
            <div className="relative">
              {/* Linha vertical do "hoje" */}
              {todayOffset >= 0 && todayOffset < days.length && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-primary/50 z-10"
                  style={{ left: LABEL_WIDTH + todayOffset * DAY_WIDTH + DAY_WIDTH / 2 }}
                />
              )}

              {rows.map(({ card, columnName, columnColor, start, end }, idx) => {
                const offset = Math.max(0, differenceInCalendarDays(start, rangeStart));
                const span = Math.max(1, differenceInCalendarDays(end, start) + 1);
                const barWidth = span * DAY_WIDTH - 8;
                const tooShort = barWidth < 90;

                return (
                  <div
                    key={card.id}
                    className={cn("flex items-center", idx % 2 === 1 && "bg-background/40")}
                    style={{ height: ROW_HEIGHT }}
                  >
                    <div
                      className="shrink-0 sticky left-0 z-20 bg-card border-r border-border px-3.5 h-full flex flex-col justify-center"
                      style={{ width: LABEL_WIDTH }}
                    >
                      <p className="text-xs font-medium truncate">{card.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{columnName}</p>
                    </div>
                    <div className="relative h-full" style={{ width: gridWidth }}>
                      <button
                        onClick={() => onCardClick(card)}
                        style={{
                          left: offset * DAY_WIDTH + 4,
                          width: barWidth,
                          background: columnColor,
                        }}
                        className="absolute top-1/2 -translate-y-1/2 h-7 rounded-lg text-[11px] font-medium text-white px-2.5 flex items-center gap-1.5 shadow-sm transition-transform hover:scale-[1.03] hover:shadow-lg"
                        title={card.title}
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 ring-1 ring-white/40", priorityConfig[card.priority].dot)} />
                        {!tooShort && <span className="truncate">{card.title}</span>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
