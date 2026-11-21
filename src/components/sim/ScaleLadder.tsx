"use client";

/**
 * The zoom ladder, on screen at all times.
 *
 * A defence goes wrong when the room loses track of what it is looking at. The
 * presentation walks from the whole watershed down to a single 10 m cell and
 * back out, and this strip says where on that walk the screen currently is,
 * with the real width of each scope. Clicking a rung jumps there.
 */
import { cn } from "@/lib/utils";

export interface Rung {
  /** short name for the scope */
  label: string;
  /** how wide the thing on screen actually is */
  width: string;
  /** what the eye can resolve at this scope */
  see: string;
}

export const RUNGS: Rung[] = [
  { label: "Whole watershed", width: "73 km across", see: "where growth lands" },
  { label: "One corridor", width: "2.5 km across", see: "the model running" },
  { label: "One block", width: "320 m across", see: "individual cells" },
  { label: "One cell", width: "10 m across", see: "why this cell" },
];

export default function ScaleLadder({
  current,
  onSelect,
  trailing,
}: {
  /** index into RUNGS, or -1 when the step is not a place on the ladder */
  current: number;
  onSelect: (index: number) => void;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-stretch gap-1.5 rounded-xl border border-border bg-card p-1.5">
      {RUNGS.map((r, i) => {
        const active = i === current;
        const passed = current > i;
        return (
          <button
            key={r.label}
            type="button"
            onClick={() => onSelect(i)}
            aria-current={active ? "true" : undefined}
            className={cn(
              "group relative flex min-w-[9rem] flex-1 flex-col rounded-lg px-3 py-2 text-left transition-colors",
              active
                ? "bg-sky-600 text-white"
                : passed
                  ? "bg-muted hover:bg-muted/70"
                  : "hover:bg-muted"
            )}
          >
            <span className="flex items-center gap-1.5">
              <ZoomBox depth={i} active={active} />
              <span className="text-sm font-semibold leading-tight">{r.label}</span>
            </span>
            <span
              className={cn(
                "mt-0.5 text-[11px] tabular-nums",
                active ? "text-sky-100" : "text-muted-foreground"
              )}
            >
              {r.width} &middot; {r.see}
            </span>
          </button>
        );
      })}
      {trailing}
    </div>
  );
}

/** Nested squares: one for the watershed, four for a single cell. */
function ZoomBox({ depth, active }: { depth: number; active: boolean }) {
  const stroke = active ? "currentColor" : "currentColor";
  return (
    <svg viewBox="0 0 16 16" className={cn("h-4 w-4 shrink-0", active ? "" : "opacity-60")} aria-hidden>
      {Array.from({ length: depth + 1 }, (_, k) => {
        const inset = k * 2.2;
        return (
          <rect
            key={k}
            x={1 + inset}
            y={1 + inset}
            width={14 - inset * 2}
            height={14 - inset * 2}
            rx="1.5"
            fill={k === depth ? stroke : "none"}
            fillOpacity={k === depth ? 0.9 : 0}
            stroke={stroke}
            strokeWidth="1.2"
            strokeOpacity={k === depth ? 1 : 0.45}
          />
        );
      })}
    </svg>
  );
}

/**
 * A thumbnail of the scope one rung up, with the current scope outlined on it.
 * Answers "where is this?" without leaving the step.
 */
export function Locator({
  title,
  children,
  caption,
}: {
  title: string;
  children: React.ReactNode;
  caption: string;
}) {
  return (
    <figure className="w-full max-w-[150px]">
      <figcaption className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {title}
      </figcaption>
      {children}
      <figcaption className="mt-1 text-[11px] leading-4 text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}
