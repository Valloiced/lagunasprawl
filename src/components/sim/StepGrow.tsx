"use client";

/**
 * Step 2 - cellular automata: how does growth spread over time?
 *
 * The automaton is a three-phase loop, and the page plays each phase slowly
 * enough to point at while it happens:
 *
 *   1. score   every open spot, with the model from part 1
 *   2. build   on the likeliest spots, cells appearing in the order drawn
 *   3. update  the neighbourhood - new buildings change their surroundings, so
 *              the scores around them change
 *
 * Phase 3 is the part that makes it a cellular automaton rather than a ranked
 * list, so it gets its own colour, its own close-up, and a switch that turns it
 * off to prove the point. The computation is real and finishes in about a
 * second; only the playback is paced.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Play, RotateCcw, ZoomIn } from "lucide-react";
import GridCanvas from "./GridCanvas";
import {
  ActionButton,
  Details,
  PartTag,
  SpeakerNotes,
  StepTitle,
  Slider,
  Swatch,
  Toggle,
} from "./ui";
import { count, km2 } from "./plain";
import type { ActProps } from "./shared";
import { EXISTING_BUILT, heat, NEW_BUILT, NODATA, type Rgb } from "@/lib/sim/colors";
import { SIM_BASIN_DEMAND } from "@/data/generated/sim-tiles.generated";

type Phase = "idle" | "scoring" | "score" | "build" | "update" | "done";

/** playback pacing, in milliseconds after the step's result arrives */
const T_SCORE = 1400;
const T_BUILD = 5400;
const T_UPDATE = 8400;

const LATER: Rgb = [234, 88, 12];
const ROSE: Rgb = [37, 99, 235];
const FELL: Rgb = [220, 38, 38];
const OPEN: Rgb = [238, 238, 241];

const STEP_LABELS = ["2025 → 2030", "2030 → 2035"];

function mix(c: Rgb, t: number): Rgb {
  return [
    Math.round(c[0] + (255 - c[0]) * t),
    Math.round(c[1] + (255 - c[1]) * t),
    Math.round(c[2] + (255 - c[2]) * t),
  ];
}

export default function StepGrow({
  sim,
  tile,
  params,
  setParams,
  run,
  setRun,
  goTo,
  notes,
  block,
  setBlock,
}: ActProps & {
  block: { x0: number; y0: number; n: number };
  setBlock: (b: { x0: number; y0: number; n: number }) => void;
}) {
  const { loaded, reset, steps, status } = sim.state;
  const [now, setNow] = useState(0);
  const [view, setView] = useState<"auto" | "buildings" | "scores" | "changes">("auto");

  const demands = useMemo(
    () => [
      Math.round(tile.demand2030 * run.demandScale),
      Math.round(tile.demand2035 * run.demandScale),
    ],
    [tile, run.demandScale]
  );

  const latest = steps.length ? steps[steps.length - 1] : null;
  const received = latest?.receivedAt ?? 0;
  const elapsed = latest ? Math.max(0, now - received) : 0;
  const animating = !!latest && (now < received || elapsed < T_UPDATE);

  // the playback clock; state is only ever set from the timer callback
  useEffect(() => {
    if (!animating) return;
    const id = window.setInterval(() => setNow(performance.now()), 50);
    return () => window.clearInterval(id);
  }, [animating, received]);

  const computing = status === "running";
  const phase: Phase = computing
    ? "scoring"
    : !latest
      ? "idle"
      : now < received || elapsed < T_SCORE
        ? "score"
        : elapsed < T_BUILD
          ? "build"
          : elapsed < T_UPDATE
            ? "update"
            : "done";
  const buildFraction =
    phase === "score" ? 0 : phase === "build" ? (elapsed - T_SCORE) / (T_BUILD - T_SCORE) : 1;

  /** draw order of every conversion, per step, so cells can appear in turn */
  const orders = useMemo(() => {
    if (!loaded) return [];
    return steps.map((s) => {
      const o = new Int32Array(loaded.width * loaded.height).fill(-1);
      for (let k = 0; k < s.picks.length; k++) o[s.picks[k]] = k;
      return o;
    });
  }, [loaded, steps]);

  const change = useMemo(() => {
    if (!latest || !reset) return null;
    let rose = 0;
    let fell = 0;
    for (let i = 0; i < latest.tpAfter.length; i++) {
      if (!reset.candidateMask[i] || latest.built[i]) continue;
      const d = latest.tpAfter[i] - latest.tp[i];
      if (d > 1e-4) rose++;
      else if (d < -1e-4) fell++;
    }
    return { rose, fell };
  }, [latest, reset]);

  const effectiveView =
    view === "auto"
      ? phase === "update" || phase === "done"
        ? "changes"
        : phase === "build"
          ? "buildings"
          : "scores"
      : view;

  const cellColor = useCallback(
    (i: number): Rgb => {
      if (!loaded) return NODATA;
      if (!loaded.mask[i]) return NODATA;
      if (loaded.lulc2025[i] === 2) return EXISTING_BUILT;
      const last = steps.length - 1;
      // conversions from finished steps, and the revealed part of the current one
      for (let k = 0; k <= last; k++) {
        const o = orders[k]?.[i] ?? -1;
        if (o < 0) continue;
        const shown = k < last || o < buildFraction * steps[k].picks.length;
        if (shown) return k === 0 ? NEW_BUILT : LATER;
      }
      if (effectiveView === "changes" && latest) {
        const d = latest.tpAfter[i] - latest.tp[i];
        if (d > 0.002) return mix(ROSE, 1 - Math.min(1, d / 0.25));
        if (d < -0.002) return mix(FELL, 1 - Math.min(1, -d / 0.25));
        return OPEN;
      }
      if (effectiveView === "buildings") {
        const tp = latest ? latest.tp : reset?.tp;
        return tp && tp[i] > 0 ? mix(heat(tp[i]), 0.65) : OPEN;
      }
      const tp = latest ? (phase === "done" ? latest.tpAfter : latest.tp) : reset?.tp;
      return tp && tp[i] > 0 ? heat(tp[i]) : OPEN;
    },
    [loaded, steps, orders, buildFraction, effectiveView, latest, reset, phase]
  );

  const paint = useCallback(
    (out: Uint8ClampedArray) => {
      if (!loaded) return;
      const { width, pad, core } = loaded;
      let p = 0;
      for (let y = pad; y < pad + core; y++) {
        for (let x = pad; x < pad + core; x++) {
          const c = cellColor(y * width + x);
          out[p++] = c[0];
          out[p++] = c[1];
          out[p++] = c[2];
          out[p++] = 255;
        }
      }
    },
    [loaded, cellColor]
  );

  const nextStep = steps.length;
  const inFlight = computing || animating;
  const builtSoFar = latest ? Math.round(buildFraction * latest.picks.length) : 0;
  const drawDemand = demands[Math.min(nextStep, 1)];

  const grow = () => {
    if (nextStep >= demands.length) return;
    setView("auto");
    sim.step(demands[nextStep], run.seed + nextStep, STEP_LABELS[nextStep]);
  };

  const startOver = () => {
    setView("auto");
    sim.reset("2025");
  };

  const shareOfBasin = (tile.demand2030 / SIM_BASIN_DEMAND.demand_cells_per_5yr_step) * 100;

  return (
    <div className="flex flex-col gap-6">
      <StepTitle
        kicker="Zoomed to 2.5 km"
        tag={{ label: "Cellular automata", tone: "ca" }}
        question="How does growth spread over time?"
        answer="One corridor of the watershed, and from here on the model is genuinely running in your browser. Growth comes in 5-year steps, each repeating the same three moves."
      />

      <Loop phase={phase} candidates={reset?.active ?? 0} demand={drawDemand} change={change} frozen={params.freezeDynamic} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,460px)_1fr]">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            {(
              [
                ["auto", "Follow the run"],
                ["scores", "Scores"],
                ["buildings", "Buildings"],
                ["changes", "What changed"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                disabled={v === "changes" && !latest}
                className={`flex-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors disabled:opacity-40 ${
                  view === v ? "bg-card shadow-sm" : "text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <GridCanvas
            width={loaded?.width ?? 320}
            height={loaded?.height ?? 320}
            pad={loaded?.pad ?? 32}
            core={loaded?.core ?? 256}
            paint={paint}
            revision={sim.state.revision + Math.floor(elapsed / 50)}
            box={block}
            onPickCell={(c) => {
              if (!loaded) return;
              const x = (c % loaded.width) - loaded.pad;
              const y = Math.floor(c / loaded.width) - loaded.pad;
              const max = loaded.core - block.n;
              setBlock({
                x0: Math.max(0, Math.min(max, Math.round(x - block.n / 2))),
                y0: Math.max(0, Math.min(max, Math.round(y - block.n / 2))),
                n: block.n,
              });
            }}
          />
          <Legend view={effectiveView} />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {nextStep < demands.length ? (
              <ActionButton onClick={grow} disabled={!reset || inFlight}>
                <Play className="h-4 w-4" />
                Grow {STEP_LABELS[nextStep]}
              </ActionButton>
            ) : (
              <ActionButton onClick={() => goTo(2)} disabled={inFlight}>
                Both steps done &mdash; zoom in to one block
                <ArrowRight className="h-4 w-4" />
              </ActionButton>
            )}
            <ActionButton tone="secondary" onClick={startOver} disabled={inFlight || !steps.length}>
              <RotateCcw className="h-4 w-4" />
              Start over
            </ActionButton>
          </div>

          <StatusCard
            phase={phase}
            latest={latest}
            builtSoFar={builtSoFar}
            change={change}
            frozen={params.freezeDynamic}
          />

          <div className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-sky-500 bg-sky-50 p-3 dark:bg-sky-950">
            <div className="flex-1">
              <p className="text-sm font-semibold">Still too small to see a cell?</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                The dashed box is 320 m across. Zoom into it and step the three moves by
                hand. Click anywhere on the map to move the box first.
              </p>
            </div>
            <ActionButton onClick={() => goTo(2)}>
              <ZoomIn className="h-4 w-4" />
              Zoom in to the box
            </ActionButton>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              How much gets built each step?
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums">
              {km2(drawDemand, 2)}{" "}
              <span className="text-base font-medium text-muted-foreground">in this area</span>
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              That is this area&apos;s part ({shareOfBasin.toFixed(1)}%) of{" "}
              {SIM_BASIN_DEMAND.demand_km2_per_5yr_step}{" "}
              km&sup2; across the whole watershed.
              The amount comes from how fast the watershed <em>actually</em>{" "}
              grew between
              2016 and 2025 &mdash; the model decides where, not how much.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
            <Toggle
              label="Turn off the neighbour effect"
              checked={params.freezeDynamic}
              onChange={(v) => setParams({ freezeDynamic: v })}
              hint="Then new buildings no longer change their surroundings' scores. Run a step and the 'What changed' map stays empty - proof that phase 3 is doing real work."
            />
          </div>
        </div>
      </div>

      <SpeakerNotes
        show={notes}
        points={[
          "This is the second part, the cellular automata. It is what turns a map of scores into growth over time.",
          <>
            Each 5-year step does three things. One: score every open spot, using the model
            we just saw.
          </>,
          <>
            Two: build on the most likely spots. How much? {km2(demands[0], 2)} in this area
            &mdash; that amount comes from the real growth rate from 2016 to 2025, not from the
            model. [Press Grow.]
          </>,
          "Watch the yellow cells appear. They go mostly to the highest scores, but not strictly in order - there is some randomness, because real development does not happen perfectly in rank order.",
          change ? (
            <>
              Three: the neighbourhood updates. The new buildings changed their surroundings, so
              the model re-scores. <strong>{count(change.rose)}</strong>{" "}
              spots became more
              likely &mdash; blue &mdash; mostly open land the new buildings came close to.{" "}
              {count(change.fell)}{" "}
              became less likely &mdash; red &mdash; mostly spots whose
              block was already filling up. [Point at the close-up.]
            </>
          ) : (
            "Three: the neighbourhood updates. New buildings change their surroundings, so the model scores everything again."
          ),
          "That feedback is the cellular automata idea: every cell's future depends on its neighbours. Then the loop repeats - press Grow again for 2030 to 2035.",
          "[Optional] If I turn off the neighbour effect and run it again, nothing changes after building. Without it, the second step would ignore what the first step built.",
        ]}
      />

      <Details summary="Technical details">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Candidates: {count(reset?.candidates ?? 0)} open, developable cells; the{" "}
            {count(reset?.active ?? 0)} scoring at least {params.tpFloor} stay in play.
          </li>
          <li>
            Building is a weighted random draw without replacement. Each cell&apos;s weight is
            its score to the power of {params.sharpen}, which strongly favours high scores
            while still letting development scatter. Below {params.scoreFloor} a cell gets no
            weight.
          </li>
          <li>
            The neighbour effect is three model inputs &mdash; distance to existing buildings,
            and the built share of the 30 m and 50 m blocks around a cell &mdash; recomputed
            from the new map after every step.
          </li>
          <li>
            Why some scores fall: across all three areas, cells whose score rose were on average
            105&ndash;145 m from buildings before the step and stayed in mostly open blocks
            (6&ndash;18% built after). Cells whose score fell were already 35&ndash;80 m away and
            their block filled in (up to 55% built). In other words, the model treats open land
            inside a block that is already filling up as less likely to be built next.
          </li>
          <li>
            Built-up never reverts. The same rule is used when testing the model against real
            maps.
          </li>
        </ul>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Slider
            label="How strongly high scores are favoured"
            value={params.sharpen}
            min={1}
            max={8}
            step={0.5}
            onChange={(v) => setParams({ sharpen: v })}
            format={(v) => `power ${v}`}
            hint="The thesis uses 5. At 1 growth scatters widely."
          />
          <Slider
            label="Random seed"
            value={run.seed}
            min={0}
            max={40}
            step={1}
            onChange={(v) => setRun({ seed: v })}
            hint="Change it and grow again to see how much is the model and how much is chance."
          />
          <Toggle
            label="Protection scenario"
            checked={params.constraint === "constraint_protection"}
            onChange={(v) => setParams({ constraint: v ? "constraint_protection" : "constraint" })}
            hint="Adds a 100 m lake-shore buffer and protected areas as no-build zones."
          />
          <Toggle
            label="Build strictly in score order"
            checked={params.deterministic}
            onChange={(v) => setParams({ deterministic: v })}
            hint="Removes the randomness. Growth becomes compact blobs, which is not how real development arrives."
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Changing any of these starts the area over from 2025.
        </p>
      </Details>
    </div>
  );
}

function Loop({
  phase,
  candidates,
  demand,
  change,
  frozen,
}: {
  phase: Phase;
  candidates: number;
  demand: number;
  change: { rose: number; fell: number } | null;
  frozen: boolean;
}) {
  const active = (k: 1 | 2 | 3) =>
    (k === 1 && (phase === "scoring" || phase === "score")) ||
    (k === 2 && phase === "build") ||
    (k === 3 && phase === "update");
  const items: { k: 1 | 2 | 3; title: string; body: string; tag?: React.ReactNode }[] = [
    {
      k: 1,
      title: "Score every open spot",
      body: `The part 1 model scores ${count(candidates)} spots.`,
      tag: <PartTag label="Machine learning" tone="ml" />,
    },
    {
      k: 2,
      title: "Build on the likeliest",
      body: `${km2(demand, 2)} of new built-up land is placed.`,
    },
    {
      k: 3,
      title: "Neighbours update",
      body: frozen
        ? "Switched off: scores stay as they were."
        : change
          ? `${count(change.rose)} spots became more likely.`
          : "New buildings change nearby scores.",
      tag: <PartTag label="Cellular automata" tone="ca" />,
    },
  ];
  return (
    <div className="grid items-stretch gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto]">
      {items.map((it, idx) => (
        <FragmentRow key={it.k} last={idx === items.length - 1}>
          <div
            className={`rounded-xl border p-3 transition-colors ${
              active(it.k)
                ? "border-sky-500 bg-sky-50 shadow-sm dark:bg-sky-950"
                : "border-border bg-card"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  active(it.k) ? "bg-sky-600 text-white" : "bg-muted text-foreground"
                }`}
              >
                {it.k}
              </span>
              <span className="font-semibold">{it.title}</span>
              {it.tag}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{it.body}</p>
          </div>
        </FragmentRow>
      ))}
    </div>
  );
}

function FragmentRow({ children, last }: { children: React.ReactNode; last: boolean }) {
  return (
    <>
      {children}
      <div className="hidden items-center justify-center px-1 text-muted-foreground md:flex">
        {last ? (
          <span className="flex items-center gap-1 text-xs font-semibold">
            <RotateCcw className="h-4 w-4" />
            repeat
          </span>
        ) : (
          <ArrowRight className="h-5 w-5" />
        )}
      </div>
    </>
  );
}

function StatusCard({
  phase,
  latest,
  builtSoFar,
  change,
  frozen,
}: {
  phase: Phase;
  latest: { label: string; allocated: number } | null;
  builtSoFar: number;
  change: { rose: number; fell: number } | null;
  frozen: boolean;
}) {
  let title = "Ready";
  let body: React.ReactNode = "Press Grow to run the first 5-year step.";
  if (phase === "scoring") {
    title = "Scoring every open spot...";
    body = "The model is running all 400 trees over this area.";
  } else if (phase === "score") {
    title = `${latest?.label}: 1. scores`;
    body = "Red is where the model most wants to build.";
  } else if (phase === "build") {
    title = `${latest?.label}: 2. building`;
    body = (
      <>
        <span className="text-2xl font-bold tabular-nums text-foreground">
          {count(builtSoFar)}
        </span>{" "}
        of {count(latest?.allocated ?? 0)} cells built
      </>
    );
  } else if (phase === "update" || phase === "done") {
    title = `${latest?.label}: 3. neighbours updated`;
    body = frozen ? (
      "Neighbour effect is off, so no scores changed."
    ) : change ? (
      <>
        <span className="font-semibold text-blue-700 dark:text-blue-400">
          {count(change.rose)} more likely
        </span>
        {", "}
        <span className="font-semibold text-red-700 dark:text-red-400">
          {count(change.fell)} less likely
        </span>
        {". "}
        Open land that the new buildings came close to went up; spots whose block was
        already filling up went down.
      </>
    ) : (
      "Scores updated."
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Now
      </p>
      <p className="mt-1 font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}

function Legend({ view }: { view: "scores" | "buildings" | "changes" }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Swatch color={EXISTING_BUILT} label="built in 2025" />
      <Swatch color={NEW_BUILT} label="new by 2030" />
      <Swatch color={LATER} label="new by 2035" />
      {view === "changes" ? (
        <>
          <Swatch color={ROSE} label="score went up" />
          <Swatch color={FELL} label="score went down" />
        </>
      ) : (
        <Swatch color={heat(0.9)} label="high score" />
      )}
    </div>
  );
}
