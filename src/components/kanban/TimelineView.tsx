"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  eachDayOfInterval,
  differenceInCalendarDays,
  format,
  isSameMonth,
  isWeekend,
  addDays,
  startOfDay,
  max as dateMax,
  min as dateMin,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { GanttChartSquare } from "lucide-react";
import { cn, difficultyConfig, initials } from "@/lib/utils";
import type { KanbanCardWithDetails, KanbanColumnWithCards } from "@/types";

interface Props {
  columns: KanbanColumnWithCards[];
  onCardClick: (card: KanbanCardWithDetails) => void;
}

const DAY_WIDTH = 36;
const LABEL_WIDTH = 260;
const ROW_HEIGHT = 36;
const BAR_TEXT_MIN = 120; // abaixo disso o título vai do lado de fora da barra

const fmt = (d: Date) => format(d, "dd MMM", { locale: ptBR });

export function TimelineView({ columns, onCardClick }: Props) {
  const today = startOfDay(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Agrupa por coluna (A Fazer, Em Progresso…) — fica claro em que etapa cada tarefa está
  // sem repetir o nome da coluna em toda linha.
  const groups = useMemo(
    () =>
      columns
        .map((col) => ({
          column: col,
          rows: (col.cards ?? []).map((card) => {
            const start = startOfDay(new Date(card.startDate ?? card.createdAt));
            const due = card.dueDate ? startOfDay(new Date(card.dueDate)) : null;
            return { card, start, due: due && due < start ? start : due };
          })
          // Escadinha por data: quem começa antes vem primeiro; empate → termina antes;
          // sem prazo por último; depois por título pra ordem não "pular".
          .sort(
            (a, b) =>
              a.start.getTime() - b.start.getTime() ||
              (a.due?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.due?.getTime() ?? Number.MAX_SAFE_INTEGER) ||
              a.card.title.localeCompare(b.card.title, "pt-BR")
          ),
        }))
        .filter((g) => g.rows.length > 0),
    [columns]
  );

  const allRows = groups.flatMap((g) => g.rows);

  const { rangeStart, days } = useMemo(() => {
    const starts = allRows.map((r) => r.start);
    const ends = allRows.map((r) => r.due ?? r.start);
    const first = addDays(dateMin([today, ...starts]), -3);
    const last = dateMax([addDays(first, 34), addDays(dateMax([today, ...ends]), 7)]);
    return { rangeStart: first, days: eachDayOfInterval({ start: first, end: last }) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

  const todayOffset = differenceInCalendarDays(today, rangeStart);
  const gridWidth = days.length * DAY_WIDTH;

  // Abre já mostrando "hoje" perto da esquerda, em vez do começo do intervalo.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = Math.max(0, (todayOffset - 3) * DAY_WIDTH);
  }, [todayOffset]);

  if (allRows.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-10 text-center">
        <GanttChartSquare className="w-8 h-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Nenhuma tarefa neste board ainda.</p>
      </div>
    );
  }

  // Meses do cabeçalho: [rótulo, quantidade de dias]
  const months: { label: string; span: number }[] = [];
  days.forEach((d, i) => {
    if (i === 0 || !isSameMonth(d, days[i - 1])) months.push({ label: format(d, "MMMM yyyy", { locale: ptBR }), span: 0 });
    months[months.length - 1].span++;
  });

  return (
    <div className="p-6 flex flex-col min-h-0 flex-1">
      {/* Legenda */}
      <div className="flex items-center gap-x-4 gap-y-1 mb-3 px-1 flex-wrap text-[11px] text-muted-foreground">
        {(Object.keys(difficultyConfig) as (keyof typeof difficultyConfig)[]).map((key) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: difficultyConfig[key].hex }} />
            {difficultyConfig[key].label}
          </span>
        ))}
      </div>

      <div className="border border-border rounded-xl overflow-hidden min-h-0 flex flex-col">
        <div ref={scrollRef} className="overflow-auto min-h-0">
          <div className="relative" style={{ width: LABEL_WIDTH + gridWidth }}>
            {/* ── Cabeçalho (meses + dias), fixo no topo ── */}
            <div className="sticky top-0 z-30 bg-background border-b border-border">
              <div className="flex">
                <div className="shrink-0 sticky left-0 z-10 bg-background border-r border-border" style={{ width: LABEL_WIDTH }} />
                <div>
                  <div className="flex">
                    {months.map((m, i) => (
                      <div
                        key={i}
                        style={{ width: m.span * DAY_WIDTH }}
                        className="shrink-0 pt-2 text-[11px] capitalize text-muted-foreground"
                      >
                        {/* sticky: o nome do mês continua visível ao rolar pro meio dele */}
                        <span className="sticky px-2 whitespace-nowrap" style={{ left: LABEL_WIDTH }}>
                          {m.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex">
                    {days.map((day, i) => (
                      <div
                        key={day.toISOString()}
                        style={{ width: DAY_WIDTH }}
                        className={cn(
                          "shrink-0 text-center py-1.5 text-[11px] tabular-nums border-l",
                          i > 0 && !isSameMonth(day, days[i - 1]) ? "border-foreground/30" : "border-foreground/[0.12]",
                          i === todayOffset
                            ? "text-primary font-semibold"
                            : isWeekend(day)
                              ? "text-muted-foreground/50"
                              : "text-muted-foreground"
                        )}
                        title={format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                      >
                        {format(day, "dd")}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Corpo ── */}
            <div className="relative">
              {/* Fundo: fim de semana levemente sombreado + linha fina no dia de hoje */}
              <div className="absolute inset-y-0 flex pointer-events-none" style={{ left: LABEL_WIDTH }}>
                {days.map((day, i) => (
                  <div
                    key={day.toISOString()}
                    style={{ width: DAY_WIDTH }}
                    className={cn(
                      "shrink-0 h-full border-l",
                      // Linha fina entre dias; mais marcada na virada do mês.
                      i > 0 && !isSameMonth(day, days[i - 1]) ? "border-foreground/30" : "border-foreground/[0.12]",
                      isWeekend(day) && "bg-foreground/[0.025]"
                    )}
                  />
                ))}
              </div>
              {todayOffset >= 0 && todayOffset < days.length && (
                <div
                  className="absolute inset-y-0 w-px bg-primary/50 pointer-events-none z-10"
                  style={{ left: LABEL_WIDTH + todayOffset * DAY_WIDTH + DAY_WIDTH / 2 }}
                />
              )}

              {groups.map(({ column, rows }) => (
                <div key={column.id} className="border-t border-foreground/15 first:border-t-0">
                  {/* Cabeçalho do grupo (coluna do board): faixa de largura total, com a cor
                      da coluna — separa bem "A Fazer", "Revisão" etc. sem depender dos nomes. */}
                  <div className="relative flex h-9 bg-foreground/[0.04] border-b border-border/60">
                    <div className="sticky left-0 z-20 h-full bg-background border-r border-border" style={{ width: LABEL_WIDTH }}>
                      <div className="h-full flex items-center gap-2 px-4 bg-foreground/[0.04]">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: column.color ?? "#64748b" }} />
                        <span className="text-xs font-semibold text-foreground truncate">{column.name}</span>
                        <span className="text-[11px] text-muted-foreground tabular-nums">{rows.length}</span>
                      </div>
                    </div>
                  </div>

                  {rows.map(({ card, start, due }) => {
                    const offset = differenceInCalendarDays(start, rangeStart);
                    const span = due ? differenceInCalendarDays(due, start) + 1 : 1;
                    const barWidth = span * DAY_WIDTH - 4;
                    const textInside = !!due && barWidth >= BAR_TEXT_MIN;
                    const done = card.status === "done";
                    const overdue = !!due && due < today && !done;
                    const color = difficultyConfig[card.difficulty].hex;
                    const range = due
                      ? span === 1
                        ? fmt(start)
                        : `${fmt(start)} – ${fmt(due)}`
                      : "Sem prazo";

                    return (
                      <div
                        key={card.id}
                        className="relative flex items-center hover:bg-muted/30 cursor-pointer group"
                        style={{ height: ROW_HEIGHT }}
                        onClick={() => onCardClick(card)}
                      >
                        {/* Rótulo fixo à esquerda */}
                        <div
                          className="sticky left-0 z-20 h-full bg-background group-hover:bg-muted border-r border-border px-4 flex items-center gap-3"
                          style={{ width: LABEL_WIDTH }}
                        >
                          <p className={cn("flex-1 min-w-0 text-[13px] truncate", done && "line-through text-muted-foreground")} title={card.title}>
                            {card.title}
                          </p>
                          {due && (
                            <span className={cn("text-[11px] shrink-0 tabular-nums", overdue ? "text-red-400" : "text-muted-foreground")}>
                              {overdue ? "Atrasada" : range}
                            </span>
                          )}
                          {card.assignedTo && (
                            <span
                              title={card.assignedTo.name ?? undefined}
                              className="w-5 h-5 rounded-full bg-muted text-muted-foreground text-[9px] font-medium flex items-center justify-center overflow-hidden shrink-0"
                            >
                              {card.assignedTo.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={card.assignedTo.image} alt="" className="w-full h-full object-cover" />
                              ) : (
                                initials(card.assignedTo.name || "?")
                              )}
                            </span>
                          )}
                        </div>

                        {/* Barra (com prazo) ou ponto (sem prazo) */}
                        <div className="relative h-full" style={{ width: gridWidth }}>
                          <div
                            className={cn("absolute top-1/2 -translate-y-1/2 flex items-center", done && "opacity-40")}
                            style={{ left: offset * DAY_WIDTH + 2 }}
                            title={`${card.title} · ${range} · ${difficultyConfig[card.difficulty].label}`}
                          >
                            {due ? (
                              <div
                                className="h-5 rounded flex items-center px-2 text-[11px] text-foreground"
                                style={{
                                  width: barWidth,
                                  background: `${color}33`,
                                  boxShadow: `inset 2px 0 0 ${overdue ? "#f87171" : color}`,
                                }}
                              >
                                {textInside && <span className="truncate">{card.title}</span>}
                              </div>
                            ) : (
                              <span className="w-2 h-2 rounded-full ml-[12px]" style={{ background: color }} />
                            )}
                            {!textInside && (
                              <span className="ml-2 text-[11px] text-muted-foreground whitespace-nowrap max-w-[220px] truncate">
                                {card.title}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
