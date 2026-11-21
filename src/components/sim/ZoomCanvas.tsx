"use client";

/**
 * A close-up of a few dozen cells, drawn big enough to see each one.
 *
 * At the scale of the full window a 10 m cell is a single screen pixel, so the
 * idea at the heart of a cellular automaton - that a cell's fate depends on the
 * cells touching it - is invisible. Here each cell is a square with a grid line
 * around it, and the neighbourhood effect can be pointed at.
 */
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface ZoomCanvasProps {
  /** full padded grid width */
  width: number;
  pad: number;
  /** top-left of the crop, in core coordinates */
  x0: number;
  y0: number;
  /** cells per side */
  n: number;
  /** colour for one full-grid cell index, as [r, g, b] */
  cellColor: (i: number) => readonly [number, number, number];
  revision?: number;
  /** full-grid index of the cell under the pointer, or null */
  onHoverCell?: (cell: number | null) => void;
  onPickCell?: (cell: number) => void;
  /** full-grid index to outline */
  markedCell?: number | null;
  className?: string;
}

export default function ZoomCanvas({
  width,
  pad,
  x0,
  y0,
  n,
  cellColor,
  revision = 0,
  onHoverCell,
  onPickCell,
  markedCell,
  className,
}: ZoomCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  const toCell = (ev: React.PointerEvent<HTMLCanvasElement>): number | null => {
    const el = ref.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cx = Math.floor(((ev.clientX - r.left) / r.width) * n);
    const cy = Math.floor(((ev.clientY - r.top) / r.height) * n);
    if (cx < 0 || cy < 0 || cx >= n || cy >= n) return null;
    return (y0 + cy + pad) * width + (x0 + cx + pad);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const size = Math.max(1, Math.round(el.clientWidth * dpr));
    if (el.width !== size || el.height !== size) {
      el.width = size;
      el.height = size;
    }
    const cell = el.width / n;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const i = (y0 + r + pad) * width + (x0 + c + pad);
        const [R, G, B] = cellColor(i);
        ctx.fillStyle = `rgb(${R},${G},${B})`;
        ctx.fillRect(c * cell, r * cell, cell + 0.5, cell + 0.5);
      }
    }
    // grid lines only where cells are large enough to read as cells
    if (cell >= 6) {
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k <= n; k++) {
        const p = Math.round(k * cell) + 0.5;
        ctx.moveTo(p, 0);
        ctx.lineTo(p, el.height);
        ctx.moveTo(0, p);
        ctx.lineTo(el.width, p);
      }
      ctx.stroke();
    }
    if (markedCell != null) {
      const mx = (markedCell % width) - pad - x0;
      const my = Math.floor(markedCell / width) - pad - y0;
      if (mx >= 0 && my >= 0 && mx < n && my < n) {
        ctx.lineWidth = Math.max(2, cell * 0.14);
        ctx.strokeStyle = "rgba(9,9,11,0.95)";
        ctx.strokeRect(mx * cell, my * cell, cell, cell);
        ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.lineWidth = Math.max(1, cell * 0.07);
        ctx.strokeRect(mx * cell, my * cell, cell, cell);
      }
    }
  }, [width, pad, x0, y0, n, cellColor, revision, markedCell]);

  return (
    <canvas
      ref={ref}
      className={cn("aspect-square w-full rounded-xl border border-border bg-muted", className)}
      style={{ imageRendering: "pixelated" }}
      onPointerMove={(e) => onHoverCell?.(toCell(e))}
      onPointerLeave={() => onHoverCell?.(null)}
      onClick={(e) => {
        const c = toCell(e as unknown as React.PointerEvent<HTMLCanvasElement>);
        if (c != null) onPickCell?.(c);
      }}
    />
  );
}
