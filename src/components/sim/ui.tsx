"use client";

/** Small shared pieces for the simulation steps. */
import { cn } from "@/lib/utils";
import type { Rgb } from "@/lib/sim/colors";

export function Stat({
  label,
  value,
  sub,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "default" | "good" | "warn" | "bad";
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-3", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-xl font-bold tabular-nums tracking-tight",
          tone === "good" && "text-emerald-600 dark:text-emerald-400",
          tone === "warn" && "text-amber-600 dark:text-amber-400",
          tone === "bad" && "text-red-600 dark:text-red-400"
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  hint,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label className={cn("block", disabled && "opacity-50")}>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium">{label}</span>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-sky-600"
      />
      {hint && <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{hint}</p>}
    </label>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="block cursor-pointer select-none">
      <span className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-3.5 w-3.5 accent-sky-600"
        />
        <span className="text-xs font-medium">{label}</span>
      </span>
      {hint && <p className="mt-1 pl-5.5 text-[11px] leading-4 text-muted-foreground">{hint}</p>}
    </label>
  );
}

export function Swatch({ color, label }: { color: Rgb; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span
        className="h-2.5 w-2.5 rounded-sm border border-black/10"
        style={{ backgroundColor: `rgb(${color[0]},${color[1]},${color[2]})` }}
      />
      {label}
    </span>
  );
}

export function RampLegend({
  ramp,
  from,
  to,
  label,
}: {
  ramp: (t: number) => Rgb;
  from: string;
  to: string;
  label?: string;
}) {
  const stops = Array.from({ length: 24 }, (_, i) => {
    const c = ramp(i / 23);
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  });
  return (
    <div>
      {label && (
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          {label}
        </p>
      )}
      <div
        className="h-2 w-full rounded-full border border-black/10"
        style={{ backgroundImage: `linear-gradient(to right, ${stops.join(",")})` }}
      />
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{from}</span>
        <span>{to}</span>
      </div>
    </div>
  );
}



export function Busy({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
      {label}
    </span>
  );
}

/**
 * The top of every step: a question the room is already asking, and the
 * one-sentence answer. Everything else on the step supports that sentence.
 */
export function StepTitle({
  kicker,
  question,
  answer,
  tag,
}: {
  kicker: string;
  question: string;
  answer: React.ReactNode;
  tag?: { label: string; tone: "ml" | "ca" };
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {kicker}
        </span>
        {tag && <PartTag {...tag} />}
      </div>
      <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">{question}</h2>
      <p className="mt-2 max-w-3xl text-base leading-7 text-muted-foreground">{answer}</p>
    </div>
  );
}

/** The two halves of the model get one colour each, everywhere on the page. */
export function PartTag({ label, tone }: { label: string; tone: "ml" | "ca" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        tone === "ml"
          ? "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200"
          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
      )}
    >
      {label}
    </span>
  );
}

/**
 * What to say, while the step is on screen. Numbered because a presenter reads
 * them in order; hidden unless switched on, because the room does not need to
 * read over the presenter's shoulder.
 */
export function SpeakerNotes({ show, points }: { show: boolean; points: React.ReactNode[] }) {
  if (!show) return null;
  return (
    <aside className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-300">
        What to say
      </p>
      <ol className="mt-2 space-y-2">
        {points.map((p, i) => (
          <li key={i} className="flex gap-3 text-sm leading-6 text-amber-950 dark:text-amber-100">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[11px] font-bold text-amber-900 dark:bg-amber-900 dark:text-amber-100">
              {i + 1}
            </span>
            <span>{p}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

/**
 * The technical version, one click away. Native <details> so it needs no state
 * and keeps working with the keyboard and a screen reader.
 */
export function Details({
  summary,
  children,
}: {
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-xl border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">
        <span className="inline-block transition-transform group-open:rotate-90">&#9656;</span>
        {summary}
      </summary>
      <div className="border-t border-border px-4 py-4 text-sm leading-6">{children}</div>
    </details>
  );
}

/** A likelihood a room can read from the back: big number, bar, and a word. */
export function LikelihoodMeter({ p, word }: { p: number; word: string }) {
  const hue = p >= 0.6 ? "bg-red-500" : p >= 0.4 ? "bg-orange-400" : p >= 0.2 ? "bg-amber-300" : "bg-zinc-300";
  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-bold tabular-nums tracking-tight">
          {(p * 100).toFixed(0)}%
        </span>
        <span className="text-base font-semibold text-muted-foreground">{word}</span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-[width]", hue)} style={{ width: `${p * 100}%` }} />
      </div>
    </div>
  );
}

/** Primary action on a step. One per step, so the presenter never hunts. */
export function ActionButton({
  children,
  onClick,
  disabled,
  tone = "primary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-40",
        tone === "primary"
          ? "bg-sky-600 text-white hover:bg-sky-700"
          : "border border-border bg-card hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}
