"use client";

import { useRef, useState, useEffect, useCallback, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  className?: string;
}

/**
 * Canvas horizontal estilo "agarrar e arrastar" (drag-to-pan), como Figma/Trello.
 *
 * Usa transform: translateX (NÃO overflow-scroll) para deslocar o board na horizontal.
 * Isso é proposital: o @hello-pangea/dnd não suporta "scroll containers aninhados".
 * Com translate, o canvas não é um scroll parent — então cada coluna pode rolar
 * verticalmente sozinha (seu próprio e único scroll parent), e o drag-and-drop de
 * cards continua funcionando sem o warning de nested scroll.
 *
 * - Arraste um espaço vazio do board para deslizar lateralmente (mouse e touch).
 * - O drag dos cards e o scroll vertical das colunas ficam intactos: o pan é ignorado
 *   quando o gesto começa sobre um card/botão/input ou sobre a lista de cards.
 * - Setas flutuantes + gradientes aparecem só quando há conteúdo escondido.
 */
export function BoardCanvas({ children, className }: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  const [offset, setOffset] = useState(0); // deslocamento horizontal (px, sempre <= 0)
  const [maxOffset, setMaxOffset] = useState(0); // quanto dá pra deslocar (px, >= 0)
  const [panning, setPanning] = useState(false);

  const drag = useRef({ active: false, startX: 0, startOffset: 0, moved: false });

  const clamp = useCallback((v: number, max: number) => Math.min(0, Math.max(-max, v)), []);

  const measure = useCallback(() => {
    const vp = viewport.current;
    const tr = track.current;
    if (!vp || !tr) return;
    const max = Math.max(0, tr.scrollWidth - vp.clientWidth);
    setMaxOffset(max);
    setOffset((o) => clamp(o, max));
  }, [clamp]);

  useEffect(() => {
    measure();
    const vp = viewport.current;
    const tr = track.current;
    if (!vp || !tr) return;
    const ro = new ResizeObserver(measure);
    ro.observe(vp);
    ro.observe(tr);
    return () => ro.disconnect();
  }, [measure]);

  const moveTo = useCallback(
    (next: number) => setOffset(clamp(next, maxOffset)),
    [clamp, maxOffset]
  );

  // Roda do mouse: converte vertical em horizontal, salvo quando o cursor está sobre uma
  // coluna que ainda pode rolar verticalmente na direção do gesto.
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (maxOffset === 0) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        moveTo(offset - e.deltaX);
        return;
      }
      const scroller = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-col-scroll]");
      if (scroller) {
        const max = scroller.scrollHeight - scroller.clientHeight;
        const down = e.deltaY > 0;
        const atTop = scroller.scrollTop <= 0;
        const atBottom = scroller.scrollTop >= max - 1;
        if (max > 0 && !((down && atBottom) || (!down && atTop))) return; // deixa a coluna rolar
      }
      moveTo(offset - e.deltaY);
    },
    [offset, maxOffset, moveTo]
  );

  function isInteractive(target: EventTarget | null): boolean {
    const node = target as HTMLElement | null;
    if (!node) return false;
    return !!node.closest(
      "[data-no-pan], [data-rfd-draggable-id], [data-col-scroll], button, a, input, textarea, select, [role='button']"
    );
  }

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (isInteractive(e.target)) return;
      drag.current = { active: true, startX: e.clientX, startOffset: offset, moved: false };
      setPanning(true);
    },
    [offset]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag.current.active) return;
      const dx = e.clientX - drag.current.startX;
      if (Math.abs(dx) > 3) drag.current.moved = true;
      moveTo(drag.current.startOffset + dx);
    },
    [moveTo]
  );

  const endPan = useCallback(() => {
    if (!drag.current.active) return;
    drag.current.active = false;
    setPanning(false);
  }, []);

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  }, []);

  const step = useCallback(
    (dir: 1 | -1) => {
      const vp = viewport.current;
      const amount = Math.max(320, (vp?.clientWidth ?? 600) * 0.7);
      moveTo(offset - dir * amount);
    },
    [offset, moveTo]
  );

  const canLeft = offset < -4;
  const canRight = offset > -(maxOffset - 4);

  return (
    <div className="relative flex-1 min-h-0 overflow-hidden">
      <div
        ref={viewport}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerLeave={endPan}
        onPointerCancel={endPan}
        onClickCapture={onClickCapture}
        className={cn(
          "h-full overflow-hidden touch-pan-y",
          panning ? "cursor-grabbing" : maxOffset > 0 ? "cursor-grab" : "cursor-default",
          className
        )}
      >
        <div
          ref={track}
          className={cn("h-full w-max will-change-transform", panning ? "" : "transition-transform duration-300 ease-out")}
          style={{ transform: `translate3d(${offset}px,0,0)` }}
        >
          {children}
        </div>
      </div>

      {/* Gradiente + seta esquerda */}
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent transition-opacity duration-300",
          canLeft ? "opacity-100" : "opacity-0"
        )}
      />
      <button
        onClick={() => step(-1)}
        aria-label="Rolar para a esquerda"
        className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full",
          "bg-card/80 backdrop-blur-md border border-border shadow-lg",
          "flex items-center justify-center text-foreground/70 hover:text-primary hover:border-primary/40 hover:scale-105",
          "transition-all duration-200",
          canLeft ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Gradiente + seta direita */}
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent transition-opacity duration-300",
          canRight ? "opacity-100" : "opacity-0"
        )}
      />
      <button
        onClick={() => step(1)}
        aria-label="Rolar para a direita"
        className={cn(
          "absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full",
          "bg-card/80 backdrop-blur-md border border-border shadow-lg",
          "flex items-center justify-center text-foreground/70 hover:text-primary hover:border-primary/40 hover:scale-105",
          "transition-all duration-200",
          canRight ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
