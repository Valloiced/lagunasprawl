"use client";

/**
 * Step 4 - the whole watershed to 2035.
 *
 * The finale: the loop from part 2, applied to all of Laguna de Bay. Press play
 * and 595,420 cells fill in by 2030 and 604,255 more by 2035, in the order the
 * model was most confident about them. This replays the thesis run rather than
 * recomputing it - at watershed scale that takes minutes - and says so, in the
 * technical details rather than across the middle of the screen.
 *
 * The picture is 40 m per pixel. Every number on screen is counted at 10 m.
 */
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Gauge, MapPin, Pause, Play, RotateCcw, ZoomIn } from "lucide-react";
import { ActionButton, Details, PartTag, SpeakerNotes, Stat, StepTitle } from "./ui";
import { fmtCells, fmtKm2, type ActProps } from "./shared";
import {
  BASIN_ANIM,
  BASIN_FRAME_CELLS_2030,
  BASIN_FRAME_CELLS_2035,
  BASIN_MUNICIPALITIES,
} from "@/data/generated/basin-anim.generated";
import { BASIN_COLORS, loadBasinAnimation, type BasinAnimation } from "@/lib/sim/basin";
import { SIM_BASIN_DEMAND, SIM_TILES } from "@/data/generated/sim-tiles.generated";

const BasinRunMap = dynamic(() => import("./BasinRunMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
      Loading map...
    </div>
  ),
});

const SPEEDS = [
  { label: "Slow", fps: 7 },
  { label: "Normal", fps: 16 },
  { label: "Fast", fps: 40 },
];

/** running totals of exact 10 m cells, so the counters never lag the picture */
function cumulative(counts: number[]): number[] {
  const out: number[] = [];
  let acc = 0;
  for (const c of counts) {
    acc += c;
    out.push(acc);
  }
  return out;
}

const CUM_2030 = cumulative(BASIN_FRAME_CELLS_2030);
const CUM_2035 = cumulative(BASIN_FRAME_CELLS_2035);

export default function StepForecast({
  tile,
  goTo,
  presenting,
  notes,
  onSelectTile,
}: ActProps & { onSelectTile: (id: string) => void }) {
  const [anim, setAnim] = useState<BasinAnimation | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 390 KB for the whole watershed: the picture is 40 m per pixel, and the
  // frame buckets are built once on arrival so each animation tick paints a
  // couple of thousand pixels instead of rescanning four million.
  useEffect(() => {
    let live = true;
    loadBasinAnimation(BASIN_ANIM.url)
      .then((a) => {
        if (live) setAnim(a);
      })
      .catch((e) => {
        if (live) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      live = false;
    };
  }, []);
  /**
   * One linear position across both steps, so the clock never has to reach
   * into another piece of state mid-update: -1 is the observed 2025 map,
   * 0..frames-1 is 2025->2030, frames..2*frames-1 is 2030->2035.
   */
  const [pos, setPos] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  // mirrored into a ref for the ticker; written in an effect rather than
  // during render, and declared before the clock so it is always current by
  // the time the clock reads it
  const posRef = useRef(pos);
  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  const total = BASIN_ANIM.frames * 2;
  const step: 0 | 1 | 2 = pos < 0 ? 0 : pos < BASIN_ANIM.frames ? 1 : 2;
  const frame = pos < 0 ? -1 : pos < BASIN_ANIM.frames ? pos : pos - BASIN_ANIM.frames;
  const done = pos >= total - 1;
  const progress = Math.min(1, (pos + 1) / total);

  // An unattended run plays without anyone pressing anything, so presentation
  // mode drives the clock directly instead of pushing `playing` from an effect.
  const running = (playing || presenting) && !done;

  // Frame clock. Position is derived from wall-clock time rather than counted
  // per tick, so a throttled or backgrounded tab resumes at the right place
  // instead of drifting behind. The animation is paced for watching; the run
  // it replays is a finished artefact, so speed changes nothing about it.
  const anchorRef = useRef({ at: 0, pos: -1 });

  useEffect(() => {
    if (!running || !anim) return;
    anchorRef.current = { at: performance.now(), pos: posRef.current };
    const fps = SPEEDS[speed].fps;
    const id = window.setInterval(() => {
      const { at, pos: from } = anchorRef.current;
      const elapsed = (performance.now() - at) / 1000;
      const next = Math.min(from + Math.floor(elapsed * fps), total - 1);
      if (next === posRef.current) return;
      posRef.current = next;
      setPos(next);
      if (next >= total - 1) setPlaying(false);
    }, 40);
    return () => window.clearInterval(id);
  }, [running, anim, speed, total]);

  const start = useCallback(() => {
    setPos((p) => (p >= BASIN_ANIM.frames * 2 - 1 ? -1 : p));
    setPlaying(true);
  }, []);

  const restart = useCallback(() => {
    setPlaying(false);
    setPos(-1);
  }, []);

  const converted = useMemo(() => {
    if (step === 0 || frame < 0) return 0;
    const idx = Math.min(frame, BASIN_ANIM.frames - 1);
    return step === 1 ? CUM_2030[idx] : CUM_2030[CUM_2030.length - 1] + CUM_2035[idx];
  }, [step, frame]);

  const stepConverted = useMemo(() => {
    if (step === 0 || frame < 0) return 0;
    const idx = Math.min(frame, BASIN_ANIM.frames - 1);
    return step === 1 ? CUM_2030[idx] : CUM_2035[idx];
  }, [step, frame]);

  const stepDemand = step === 2 ? BASIN_ANIM.step2Cells : BASIN_ANIM.step1Cells;
  const builtNow = BASIN_ANIM.builtUp2025Cells + converted;

  /** municipalities whose own growth is peaking around this frame */
  const active = useMemo(() => {
    if (step === 0 || frame < 0) return [];
    return BASIN_MUNICIPALITIES.filter(
      (m) => Math.abs(m.peakFrame - frame) <= 6 && m.step1Cells + m.step2Cells > 2000
    )
      .sort((a, b) => b.step1Cells + b.step2Cells - (a.step1Cells + a.step2Cells))
      .slice(0, 4);
  }, [step, frame]);

  const yearLabel = done
    ? "2035"
    : step === 2
      ? "2030 → 2035"
      : step === 1
        ? "2025 → 2030"
        : "2025";
  const phaseLabel = done ? "Forecast" : step === 0 ? "Observed" : "Simulating";

  const top = BASIN_MUNICIPALITIES.slice(0, 4).map((m) => m.name);
  const growthPct = (BASIN_ANIM.step1Cells + BASIN_ANIM.step2Cells) / BASIN_ANIM.builtUp2025Cells;

  return (
    <div className="flex flex-col gap-5">
      <StepTitle
        kicker="Start here · 73 km across"
        question="Where will the Laguna de Bay watershed grow by 2035?"
        answer={
          <>
            Press play and watch the forecast fill in. Then we zoom in, rung by rung, until
            you can see the two parts of the model working on single cells.
          </>
        }
      />

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3 dark:border-violet-900 dark:bg-violet-950/30">
          <PartTag label="Machine learning" tone="ml" />
          <p className="mt-1.5 text-sm leading-6">
            <strong>Decides where.</strong>{" "}
            It learned from real growth in 2016&ndash;2020
            and scores every 10 &times; 10 m spot for how likely it is to be built on.
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
          <PartTag label="Cellular automata" tone="ca" />
          <p className="mt-1.5 text-sm leading-6">
            <strong>Decides how it spreads.</strong> Every five years it builds on the best
            spots, then re-scores everything, because new buildings change their
            neighbourhood.
          </p>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-3">
          <div className="relative h-[520px] overflow-hidden rounded-xl border border-border">
            <BasinRunMap anim={anim} frame={frame} step={step} />
            <div className="pointer-events-none absolute left-3 top-3 z-[500] rounded-lg bg-background/90 px-3 py-2 shadow-sm backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                {phaseLabel}
              </p>
              <p className="text-2xl font-bold tabular-nums leading-tight">{yearLabel}</p>
            </div>
            {!anim && !error && (
              <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[500] text-center">
                <span className="rounded-full bg-background/90 px-3 py-1 text-xs text-muted-foreground shadow-sm">
                  Loading the basin run ({(BASIN_ANIM.gzipBytes / 1024).toFixed(0)} KB)...
                </span>
              </div>
            )}
            {error && (
              <div className="absolute inset-x-3 bottom-3 z-[500] rounded-lg bg-red-50 px-3 py-2 text-xs text-red-900 shadow-sm dark:bg-red-950 dark:text-red-200">
                {error}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={running ? () => setPlaying(false) : start}
              disabled={!anim}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-40"
            >
              {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {running ? "Pause" : done ? "Run again" : step === 0 ? "Run to 2035" : "Resume"}
            </button>
            <button
              type="button"
              onClick={restart}
              disabled={!anim || step === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-40"
            >
              <RotateCcw className="h-4 w-4" />
              Back to 2025
            </button>
            <div className="ml-auto flex items-center gap-1 rounded-lg bg-muted p-1">
              <Gauge className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
              {SPEEDS.map((s, i) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setSpeed(i)}
                  className={`rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
                    speed === i ? "bg-card shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold">
                {step === 0 ? "Not started" : done ? "Complete" : `Growing ${yearLabel}`}
              </span>
              <span className="font-mono tabular-nums text-muted-foreground">
                {(progress * 100).toFixed(0)}%
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-600 transition-[width] duration-100"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>2025</span>
              <span>2030</span>
              <span>2035</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Stat
              label="Converted so far"
              value={fmtKm2(converted, 1)}
              sub={`${fmtCells(converted)} cells at 10 m`}
              tone={converted > 0 ? "warn" : "default"}
            />
            <Stat
              label="This step"
              value={`${((stepConverted / stepDemand) * 100 || 0).toFixed(0)}%`}
              sub={`of ${fmtKm2(stepDemand, 1)} demand`}
            />
            <Stat
              label="Built-up now"
              value={fmtKm2(builtNow, 0)}
              sub={`from ${fmtKm2(BASIN_ANIM.builtUp2025Cells, 0)} in 2025`}
            />
            <Stat
              label="Growth"
              value={`+${((converted / BASIN_ANIM.builtUp2025Cells) * 100).toFixed(1)}%`}
              sub="against the 2025 built-up area"
            />
          </div>

          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              {active.length ? "Building now" : "Where the growth lands"}
            </p>
            <div className="mt-2 space-y-1.5">
              {(active.length
                ? active
                : BASIN_MUNICIPALITIES.slice(0, 6)
              ).map((m) => {
                const t = m.step1Cells + m.step2Cells;
                const max = BASIN_MUNICIPALITIES[0].step1Cells + BASIN_MUNICIPALITIES[0].step2Cells;
                return (
                  <div key={m.id} className="flex items-center gap-2">
                    <span className="w-28 shrink-0 truncate text-xs">{m.name}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-orange-500"
                        style={{ width: `${(t / max) * 100}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-[11px] font-semibold tabular-nums">
                      {fmtKm2(t, 1)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border bg-card p-3">
            <Swatch color={BASIN_COLORS.built2025} label="built-up in 2025" />
            <Swatch color={BASIN_COLORS.step1} label="new by 2030" />
            <Swatch color={BASIN_COLORS.step2} label="new by 2035" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-sky-500 bg-sky-50 p-4 dark:bg-sky-950">
        <div className="flex-1">
          <p className="text-base font-semibold">
            That is the answer. Now let us look at how it was produced.
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            At this size a cell is invisible, so we zoom into one corridor where the model
            runs live in front of you.
          </p>
        </div>
        <ActionButton onClick={() => goTo(1)}>
          <ZoomIn className="h-4 w-4" />
          Zoom in to {tile.label.split(" - ")[0]}
        </ActionButton>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>Zoom into:</span>
        {SIM_TILES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelectTile(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
              t.id === tile.id
                ? "border-sky-500 bg-sky-50 font-semibold text-sky-900 dark:bg-sky-950 dark:text-sky-100"
                : "border-border hover:bg-muted"
            }`}
          >
            <MapPin className="h-3 w-3" />
            {t.label.replace(" - ", " – ")}
          </button>
        ))}
      </div>

      <SpeakerNotes
        show={notes}
        points={[
          "Finally, the whole watershed. This is the same loop, from 2025 to 2035. [Press Run.]",
          "Grey is what was already built in 2025. Yellow is new growth by 2030, orange by 2035. The spots the model is most confident about fill in first.",
          <>
            In total that is about {fmtKm2(BASIN_ANIM.step1Cells + BASIN_ANIM.step2Cells, 0)}{" "}
            of new built-up land &mdash; a {(growthPct * 100).toFixed(1)}% increase in ten years.
          </>,
          <>
            Most of it goes to {top.slice(0, -1).join(", ")} and {top[top.length - 1]}{" "}
            &mdash;
            the southern corridor along the expressway.
          </>,
          "One honest note: at this size the model cannot run in a browser, so this plays back the thesis run. In the next steps we zoom in far enough that it does run, live.",
        ]}
      />

      <Details summary="Technical details">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            This view replays the thesis forecast rather than recomputing it. Across the whole
            watershed, the model&apos;s inputs are 2.24 GB and one scoring pass is about four
            billion tree decisions &mdash; minutes, not milliseconds. The small-area steps
            before this one run the same model live.
          </li>
          <li>
            Cells appear in order of how often they were built across 25 random runs, which is
            how the thesis forecast map was assembled: most frequent first, until{" "}
            {SIM_BASIN_DEMAND.demand_km2_per_5yr_step}{" "}
            km&sup2; per 5-year step is placed.
          </li>
          <li>
            The picture is simplified to 40 m pixels so the whole watershed loads quickly
            ({(BASIN_ANIM.gzipBytes / 1024).toFixed(0)} KB). Every number shown is counted at
            the full 10 m resolution.
          </li>
          <li>
            {fmtCells(BASIN_ANIM.nonMonotonicCells)} cells (
            {fmtKm2(BASIN_ANIM.nonMonotonicCells, 2)}) appear in the thesis 2030 map but not
            its 2035 map, because each year was cut from the runs separately. Built-up land
            doesn&apos;t revert, so they stay built here: 2035 shows{" "}
            {fmtKm2(BASIN_ANIM.builtUp2035Cells, 1)} against the{" "}
            {fmtKm2(BASIN_ANIM.publishedBuiltUp2035Cells, 1)} in the forecast table.
          </li>
        </ul>
      </Details>
    </div>
  );
}

function Swatch({ color, label }: { color: readonly number[]; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span
        className="h-2.5 w-2.5 rounded-sm border border-black/10"
        style={{ backgroundColor: `rgba(${color[0]},${color[1]},${color[2]},${color[3] / 255})` }}
      />
      {label}
    </span>
  );
}
