"use client";

/**
 * Draws one 256 x 256 core of a simulation tile at 10 m per cell.
 *
 * The caller fills an RGBA buffer for the core; this handles the scaling,
 * nearest-neighbour upsampling (every pixel here is a real 10 m cell and
 * smoothing it would be a lie), and translating pointer positions back into
 * flat indices on the full padded grid the engine works in.
 */
import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface GridCanvasProps {
  /** full padded grid */
  width: number;
  height: number;
  pad: number;
  core: number;
  /** fills a core*core RGBA buffer; called on every repaint */
  paint: (out: Uint8ClampedArray) => void;
  /** bump to force a repaint when the paint closure's data changed in place */
  revision?: number;
  onHoverCell?: (cell: number | null) => void;
  onPickCell?: (cell: number) => void;
  /** flat index on the full grid, drawn as a crosshair */
  markedCell?: number | null;
  /** a square in core coordinates, outlined - marks where a zoom view looks */
  box?: { x0: number; y0: number; n: number } | null;
  className?: string;
}

export default function GridCanvas({
  width,
  height,
  pad,
  core,
  paint,
  revision = 0,
  onHoverCell,
  onPickCell,
  markedCell,
  box,
  className,
}: GridCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferRef = useRef<HTMLCanvasElement | null>(null);

  const toCell = useCallback(
    (ev: React.PointerEvent<HTMLCanvasElement>): number | null => {
      const el = canvasRef.current;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const x = Math.floor(((ev.clientX - r.left) / r.width) * core);
      const y = Math.floor(((ev.clientY - r.top) / r.height) * core);
      if (x < 0 || y < 0 || x >= core || y >= core) return null;
      return (y + pad) * width + (x + pad);
    },
    [core, pad, width]
  );

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    if (!bufferRef.current) {
      bufferRef.current = document.createElement("canvas");
      bufferRef.current.width = core;
      bufferRef.current.height = core;
    }
    const buf = bufferRef.current;
    const bctx = buf.getContext("2d");
    const ctx = el.getContext("2d");
    if (!bctx || !ctx) return;

    const img = bctx.createImageData(core, core);
    paint(img.data);
    bctx.putImageData(img, 0, 0);

    const dpr = window.devicePixelRatio || 1;
    const size = Math.max(1, Math.round(el.clientWidth * dpr));
    if (el.width !== size || el.height !== size) {
      el.width = size;
      el.height = size;
    }
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, el.width, el.height);
    ctx.drawImage(buf, 0, 0, el.width, el.height);

    if (markedCell != null) {
      const mx = (markedCell % width) - pad;
      const my = Math.floor(markedCell / width) - pad;
      if (mx >= 0 && my >= 0 && mx < core && my < core) {
        const s = el.width / core;
        ctx.strokeStyle = "rgba(9, 9, 11, 0.9)";
        ctx.lineWidth = Math.max(1.5, s * 0.25);
        ctx.strokeRect(mx * s - s, my * s - s, s * 3, s * 3);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = Math.max(0.75, s * 0.12);
        ctx.strokeRect(mx * s - s, my * s - s, s * 3, s * 3);
      }
    }
    if (box) {
      const s = el.width / core;
      ctx.lineWidth = Math.max(2, s * 0.6);
      ctx.strokeStyle = "rgba(9, 9, 11, 0.85)";
      ctx.strokeRect(box.x0 * s, box.y0 * s, box.n * s, box.n * s);
      ctx.setLineDash([Math.max(4, s * 2), Math.max(3, s * 1.5)]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.strokeRect(box.x0 * s, box.y0 * s, box.n * s, box.n * s);
      ctx.setLineDash([]);
    }
  }, [paint, revision, core, pad, width, height, markedCell, box]);

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        "aspect-square w-full rounded-xl border border-border bg-muted",
        onPickCell && "cursor-crosshair",
        className
      )}
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
