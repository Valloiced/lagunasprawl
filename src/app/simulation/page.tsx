"use client";

/**
 * How the growth model works - a guided, five-step walkthrough.
 *
 * Built to be presented. Each step asks one question a thesis panel is already
 * asking, answers it in a sentence, and shows it happening: the big idea, the
 * machine-learning half, the cellular-automata half, the test against real
 * maps, and the forecast for the whole watershed. Speaking notes for each step
 * sit behind one switch, and every technical detail sits one click down.
 *
 * Underneath, nothing is simulated for show. Steps 1 to 3 run the thesis's own
 * trained model and allocation rule in the browser, on a 2.5 km area, and check
 * their output against the thesis raster; step 4 replays the full-watershed run.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  MessageSquareText,
  Pause,
  PlayCircle,
} from "lucide-react";
import StepForecast from "@/components/sim/StepForecast";
import StepGrow from "@/components/sim/StepGrow";
import StepBlock from "@/components/sim/StepBlock";
import StepScore from "@/components/sim/StepScore";
import StepTest from "@/components/sim/StepTest";
import ScaleLadder from "@/components/sim/ScaleLadder";
import { useSimEngine } from "@/components/sim/useSimEngine";
import { Busy, PartTag } from "@/components/sim/ui";
import type { RunSettings } from "@/components/sim/shared";
import { DEFAULT_PARAMS, type EngineParams } from "@/lib/sim/engine";
import { SIM_TILES } from "@/data/generated/sim-tiles.generated";
import { cn } from "@/lib/utils";

/**
 * The walk: start at the whole watershed, zoom in a rung at a time until a
 * single cell fills the screen, then step back out to ask whether it works.
 * `rung` indexes RUNGS in ScaleLadder; -1 means the step is not a viewpoint.
 */
const STEPS: { title: string; rung: number; part?: { label: string; tone: "ml" | "ca" } }[] = [
  { title: "Whole watershed", rung: 0 },
  { title: "One corridor", rung: 1, part: { label: "Cellular automata", tone: "ca" } },
  { title: "One block", rung: 2, part: { label: "Cellular automata", tone: "ca" } },
  { title: "One cell", rung: 3, part: { label: "Machine learning", tone: "ml" } },
  { title: "Does it work?", rung: -1 },
];

/**
 * Auto-play's script. Dwell times are a floor, not a schedule: a beat only
 * advances once the engine is idle, so a slow run stretches its beat rather
 * than being talked over. Module scope, so rendering never touches the
 * closures that carry out the actions.
 */
type BeatAction = "reset" | "grow0" | "grow1" | "test";

interface Beat {
  step: number;
  dwell: number;
  action?: BeatAction;
}

const BEAT_PLAN: Beat[] = [
  { step: 0, dwell: 24000 },
  { step: 1, dwell: 1500, action: "reset" },
  { step: 1, dwell: 10000, action: "grow0" },
  { step: 1, dwell: 11000, action: "grow1" },
  { step: 2, dwell: 1500, action: "reset" },
  // one full pass of the three moves at ~5.2 s each, plus the build reveal
  { step: 2, dwell: 20000 },
  { step: 3, dwell: 18000 },
  { step: 4, dwell: 14000, action: "test" },
];

export default function SimulationPage() {
  const sim = useSimEngine();
  const [chosenStep, setStep] = useState(0);
  const [notes, setNotes] = useState(false);
  const [tileId, setTileId] = useState(SIM_TILES[0].id);
  // the block and cell the lower rungs look at, shared so zooming in keeps
  // pointing at the same ground the rung above was showing
  const [block, setBlock] = useState<{ x0: number; y0: number; n: number } | null>(null);
  const [cell, setCell] = useState<number | null>(null);
  const [params, setParamsState] = useState<EngineParams>({ ...DEFAULT_PARAMS });
  const [run, setRunState] = useState<RunSettings>({ demandScale: 1, runs: 10, seed: 0 });

  const tile = useMemo(
    () => SIM_TILES.find((t) => t.id === tileId) ?? SIM_TILES[0],
    [tileId]
  );

  // Destructured deliberately: useSimEngine returns a fresh object each render,
  // so depending on `sim` would rebuild the auto-play actions every render and
  // re-fire the current beat. The callbacks themselves are stable.
  const { load, reset, setParams: pushParams, state, step: growStep, validate } = sim;
  const { status, loaded } = state;

  useEffect(() => {
    load(tileId);
  }, [load, tileId]);

  // score the area as soon as it loads, so every step has scores ready
  useEffect(() => {
    if (status === "ready" && loaded && !state.reset) reset("2025");
  }, [status, loaded, state.reset, reset]);

  const setParams = useCallback(
    (p: Partial<EngineParams>) => {
      setParamsState((prev) => {
        const next = { ...prev, ...p };
        pushParams(next);
        return next;
      });
      reset("2025");
    },
    [pushParams, reset]
  );

  const setRun = useCallback(
    (r: Partial<RunSettings>) => setRunState((prev) => ({ ...prev, ...r })),
    []
  );

  // -- auto-play ---------------------------------------------------------------
  const [beat, setBeat] = useState<number | null>(null);
  const beatStart = useRef(0);

  const demands = useMemo(
    () => [
      Math.round(tile.demand2030 * run.demandScale),
      Math.round(tile.demand2035 * run.demandScale),
    ],
    [tile, run.demandScale]
  );

  const runBeatAction = useCallback(
    (action: BeatAction) => {
      if (action === "reset") reset("2025");
      if (action === "grow0") growStep(demands[0], run.seed, "2025 → 2030");
      if (action === "grow1") growStep(demands[1], run.seed + 1, "2030 → 2035");
      if (action === "test") validate(tile.demandValidation, run.runs, run.seed);
    },
    [reset, growStep, demands, run.seed, run.runs, validate, tile.demandValidation]
  );

  const playing = beat !== null;
  const current = beat !== null ? (BEAT_PLAN[beat]?.step ?? chosenStep) : chosenStep;

  const startPlaying = useCallback(() => {
    reset("2025");
    beatStart.current = Date.now();
    setBeat(0);
  }, [reset]);

  // Leaving auto-play hands the step it reached back to manual navigation in
  // the same update. Doing it a render later flashes step 1 for a frame and
  // remounts the step, which throws away whatever it was showing.
  const stopPlaying = useCallback(() => {
    if (beat !== null) setStep(BEAT_PLAN[beat]?.step ?? 0);
    setBeat(null);
  }, [beat]);

  const firedBeat = useRef<number | null>(null);
  useEffect(() => {
    if (beat === null) {
      firedBeat.current = null;
      return;
    }
    if (firedBeat.current === beat) return;
    const b = BEAT_PLAN[beat];
    if (!b) return;
    firedBeat.current = beat;
    beatStart.current = Date.now();
    const action = b.action;
    if (!action) return;
    // on a timeout: the action posts to the worker and updates engine state,
    // which does not belong in an effect body
    const fire = window.setTimeout(() => runBeatAction(action), 0);
    return () => window.clearTimeout(fire);
  }, [beat, runBeatAction]);

  useEffect(() => {
    if (beat === null) return;
    const timer = window.setInterval(() => {
      const b = BEAT_PLAN[beat];
      if (!b) return;
      if (sim.state.status === "running") return;
      if (Date.now() - beatStart.current < b.dwell) return;
      const next = beat + 1;
      if (next >= BEAT_PLAN.length) {
        setStep(b.step);
        setBeat(null);
      } else {
        setBeat(next);
      }
    }, 400);
    return () => window.clearInterval(timer);
  }, [beat, sim.state.status]);

  const goTo = useCallback((next: number) => {
    setBeat(null);
    setStep(next);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") goTo(Math.min(current + 1, STEPS.length - 1));
      if (e.key === "ArrowLeft") goTo(Math.max(current - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, goTo]);

  /**
   * The block worth zooming into: a transition zone with all three ingredients.
   *
   * Ranking blocks by score alone picks one the step fills almost completely,
   * where every surviving cell ends up ringed by development and its score
   * falls - the close-up then argues the opposite of the point, even though
   * basin-wide the rises and falls are even. Ranking by mid-range cells alone
   * swings the other way, to a block with nothing built and nothing built in
   * it. So the block is chosen to hit a mix: roughly a third already built to
   * grow from, a quarter near-certain cells that will visibly convert, and a
   * third mid-range cells left standing to be re-scored.
   */
  const hotBlock = useMemo(() => {
    const r = state.reset;
    const l = state.loaded;
    if (!r?.tp || !l) return { x0: 112, y0: 112, n: 32 };
    const n = 32;
    const cells = n * n;
    const target = { built: 0.3, hot: 0.25, mid: 0.3 };
    let best = { x0: 112, y0: 112, cost: Infinity };
    for (let y0 = 0; y0 + n <= l.core; y0 += 8) {
      for (let x0 = 0; x0 + n <= l.core; x0 += 8) {
        let built = 0;
        let hot = 0;
        let mid = 0;
        for (let y = y0; y < y0 + n; y++) {
          for (let x = x0; x < x0 + n; x++) {
            const i = (y + l.pad) * l.width + (x + l.pad);
            if (l.lulc2025[i] === 2) {
              built++;
              continue;
            }
            const t = r.tp[i];
            if (t > 0.75) hot++;
            else if (t >= 0.2) mid++;
          }
        }
        const cost =
          Math.abs(built / cells - target.built) +
          Math.abs(hot / cells - target.hot) +
          Math.abs(mid / cells - target.mid);
        if (cost < best.cost) best = { x0, y0, cost };
      }
    }
    return { x0: best.x0, y0: best.y0, n };
  }, [state.reset, state.loaded]);

  const stepProps = {
    sim,
    tile,
    params,
    setParams,
    run,
    setRun,
    goTo,
    presenting: playing,
    notes,
  };
  const viewport = {
    block: block ?? hotBlock,
    setBlock,
    cell,
    setCell,
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">How the growth model works</h1>
          <p className="mt-1 max-w-2xl text-base leading-7 text-muted-foreground">
            Start at the whole watershed, then zoom in until you can see the algorithm
            work on single 10 m cells.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setNotes((v) => !v)}
            aria-pressed={notes}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
              notes
                ? "border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
                : "border-border hover:bg-muted"
            )}
          >
            <MessageSquareText className="h-4 w-4" />
            Speaking notes {notes ? "on" : "off"}
          </button>
          <button
            type="button"
            onClick={playing ? stopPlaying : startPlaying}
            disabled={!loaded}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-40",
              playing
                ? "border-sky-400 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100"
                : "border-border hover:bg-muted"
            )}
            title="Walk through every step on its own, running each part on the way"
          >
            {playing ? <Pause className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
            {playing ? "Stop auto-play" : "Auto-play"}
          </button>
          <button
            type="button"
            onClick={() => goTo(Math.max(current - 1, 0))}
            disabled={current === 0}
            className="rounded-lg border border-border p-2 transition-colors hover:bg-muted disabled:opacity-30"
            aria-label="Previous step"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => goTo(Math.min(current + 1, STEPS.length - 1))}
            disabled={current === STEPS.length - 1}
            className="rounded-lg border border-border p-2 transition-colors hover:bg-muted disabled:opacity-30"
            aria-label="Next step"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <nav aria-label="Steps" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {STEPS.map((s, i) => {
          const active = i === current;
          const done = i < current;
          return (
            <button
              key={s.title}
              type="button"
              onClick={() => goTo(i)}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors",
                active
                  ? "border-sky-500 bg-sky-50 dark:bg-sky-950"
                  : "border-border bg-card hover:bg-muted"
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                    active
                      ? "bg-sky-600 text-white"
                      : done
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {i + 1}
                </span>
                <span className="text-sm font-semibold leading-tight">{s.title}</span>
              </span>
              {s.part && <PartTag {...s.part} />}
            </button>
          );
        })}
      </nav>

      <ScaleLadder
        current={STEPS[current]?.rung ?? -1}
        onSelect={(rung) => {
          const target = STEPS.findIndex((s) => s.rung === rung);
          if (target >= 0) goTo(target);
        }}
      />

      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">The simulation could not run</p>
            <p className="mt-0.5 text-[13px]">{state.error}</p>
          </div>
        </div>
      )}

      {status === "loading" && (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Busy label={`Loading the model and the ${tile.label.replace(" - ", " – ")} area...`} />
        </div>
      )}

      {loaded && (
        <section className="min-h-[520px]">
          {current === 0 && <StepForecast {...stepProps} onSelectTile={setTileId} />}
          {current === 1 && <StepGrow {...stepProps} {...viewport} />}
          {current === 2 && <StepBlock {...stepProps} {...viewport} />}
          {current === 3 && <StepScore {...stepProps} {...viewport} />}
          {current === 4 && <StepTest {...stepProps} />}
        </section>
      )}
    </div>
  );
}
