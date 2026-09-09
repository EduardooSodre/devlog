"use client";

import { useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import { CalendarDays, Clock, UserCircle2 } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { isSameDay, startOfDay } from "date-fns";
import { cn, priorityConfig, formatDate, formatDateTime, initials } from "@/lib/utils";
import type { KanbanCardWithDetails, KanbanColumnWithCards } from "@/types";

function Assignee({ card }: { card: KanbanCardWithDetails }) {
  if (!card.assignedTo) {
    return (
      <span className="w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center shrink-0" title="Sem responsável">
        <UserCircle2 className="w-3 h-3 text-muted-foreground" />
      </span>
    );
  }
  return (
    <span
      title={card.assignedTo.name ?? undefined}
      className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[9px] font-semibold flex items-center justify-center overflow-hidden shrink-0"
    >
      {card.assignedTo.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.assignedTo.image} alt="" className="w-full h-full object-cover" />
      ) : (
        initials(card.assignedTo.name || "?")
      )}
    </span>
  );
}

interface Props {
  columns: KanbanColumnWithCards[];
  onCardClick: (card: KanbanCardWithDetails) => void;
}

export function CalendarView({ columns, onCardClick }: Props) {
  const [selected, setSelected] = useState<Date | undefined>(new Date());

  const cardsWithDue = useMemo(
    () =>
      columns.flatMap((col) =>
        (col.cards ?? [])
          .filter((c) => c.dueDate)
          .map((c) => ({ ...c, columnName: col.name, columnColor: col.color }))
      ),
    [columns]
  );

  const dueDates = useMemo(() => cardsWithDue.map((c) => new Date(c.dueDate!)), [cardsWithDue]);

  const cardsOnSelectedDay = useMemo(
    () => (selected ? cardsWithDue.filter((c) => isSameDay(new Date(c.dueDate!), selected)) : []),
    [cardsWithDue, selected]
  );

  // Próximas tarefas: prazos a partir de hoje, mais cedo primeiro — dá visão do que vem
  // sem precisar navegar dia a dia no calendário.
  const upcomingCards = useMemo(() => {
    const today = startOfDay(new Date());
    return cardsWithDue
      .filter((c) => new Date(c.dueDate!) >= today)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 8);
  }, [cardsWithDue]);

  return (
    <div className="flex gap-6 p-6 flex-wrap items-start">
      <DayPicker
        mode="single"
        selected={selected}
        onSelect={setSelected}
        locale={ptBR}
        modifiers={{ hasTasks: dueDates }}
        modifiersClassNames={{
          hasTasks: "font-semibold",
        }}
        classNames={{
          root: "bg-card border border-border rounded-2xl p-5 w-fit shadow-sm",
          months: "flex flex-col gap-4",
          month: "flex flex-col gap-3",
          nav: "flex items-center justify-between",
          month_caption: "flex items-center justify-center h-9 text-base font-semibold capitalize text-foreground",
          button_previous: "w-8 h-8 rounded-lg hover:bg-primary/10 hover:text-primary flex items-center justify-center text-muted-foreground transition-colors",
          button_next: "w-8 h-8 rounded-lg hover:bg-primary/10 hover:text-primary flex items-center justify-center text-muted-foreground transition-colors",
          month_grid: "w-full border-collapse mt-3 border-separate [border-spacing:3px]",
          weekdays: "flex",
          weekday: "w-10 h-8 text-xs font-semibold text-muted-foreground flex items-center justify-center",
          week: "flex",
          day: "relative w-10 h-10 p-0 text-center",
          day_button: "relative w-10 h-10 rounded-xl text-sm font-medium text-foreground hover:bg-primary/15 hover:text-primary transition-colors",
          today: "[&>button]:ring-2 [&>button]:ring-primary/60 [&>button]:text-primary",
          selected: "[&>button]:bg-primary [&>button]:text-white [&>button]:hover:bg-primary [&>button]:hover:text-white [&>button]:shadow-lg [&>button]:shadow-primary/30",
          outside: "[&>button]:text-muted-foreground/40",
        }}
        components={{
          DayButton: (props) => {
            const { day, modifiers, ...rest } = props;
            const hasTasks = modifiers.hasTasks;
            return (
              <button {...rest}>
                {day.date.getDate()}
                {hasTasks && !modifiers.selected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          },
        }}
      />

      <div className="flex flex-col gap-6 flex-1 min-w-[280px]">
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            {selected ? formatDateTime(selected).split(" às")[0] : "Selecione um dia"}
          </h3>

          {cardsOnSelectedDay.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma tarefa com prazo neste dia.</p>
          ) : (
            <div className="space-y-2">
              {cardsOnSelectedDay.map((card) => (
                <button
                  key={card.id}
                  onClick={() => onCardClick(card)}
                  className="w-full text-left bg-background border border-border rounded-xl p-3 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", priorityConfig[card.priority].dot)} />
                      <span className="text-xs text-muted-foreground truncate">{card.columnName}</span>
                    </div>
                    <Assignee card={card} />
                  </div>
                  <p className="text-sm font-medium">{card.title}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Próximas tarefas
          </h3>

          {upcomingCards.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum prazo próximo.</p>
          ) : (
            <div className="space-y-2">
              {upcomingCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => onCardClick(card)}
                  className="w-full text-left bg-background border border-border rounded-xl p-3 hover:border-primary/40 transition-colors flex items-center gap-3"
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", priorityConfig[card.priority].dot)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{card.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{card.columnName} · {formatDate(card.dueDate!)}</p>
                  </div>
                  <Assignee card={card} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
