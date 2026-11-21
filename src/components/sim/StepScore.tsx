"use client";

/**
 * Step 1 - machine learning: which spots are likely to be built on?
 *
 * One map, one spot, one score. The presenter points at a likely spot, reads out
 * what the model saw there in plain words, walks one decision tree as a list of
 * yes/no questions, and then flips to an unlikely spot for contrast. That pair
 * - "this one scores 97%, this one scores 3%, here is why" - is the whole
 * machine-learning half of the model, and it is computed live for whichever
 * spot is on screen.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, MousePointerClick, X } from "lucide-react";
import GridCanvas from "./GridCanvas";
import ZoomCanvas from "./ZoomCanvas";
import {
  ActionButton,
  Details,
  LikelihoodMeter,
  RampLegend,
  SpeakerNotes,
  StepTitle,
  Swatch,
} from "./ui";
import { FACTORS, count, likelihoodWord, pct, splitQuestion } from "./plain";
import type { ActProps } from "./shared";
import { EXISTING_BUILT, cool, heat, NODATA, percentileRange, terrain } from "@/lib/sim/colors";
import { DRIVER_IMPORTANCE, TRANSITION_BENCHMARK } from "@/data/generated/analysis.generated";
import { SIM_MODEL } from "@/data/generated/sim-tiles.generated";

const GROUPS = ["Development nearby", "Access", "People and activity", "Land"] as const;

const sigmoid = (m: number) => 1 / (1 + Math.exp(-m));

export default function StepScore({
  sim,
  goTo,
  notes,
  block,
  cell,
  setCell,
}: ActProps & {
  block: { x0: number; y0: number; n: number };
  cell: number | null;
  setCell: (c: number) => void;
}) {
  const { loaded, reset, explain } = sim.state;
  // the cell clicked one rung up, if there was one
  const picked = cell;
  const setPicked = setCell;

  /** a strongly likely and a clearly unlikely spot, for the side-by-side */
  const examples = useMemo(() => {
    if (!reset?.tp) return null;
    const scored: { i: number; p: number }[] = [];
    for (let i = 0; i < reset.tp.length; i++) {
      if (reset.candidateMask[i] && reset.tp[i] > 0) scored.push({ i, p: reset.tp[i] });
    }
    if (!scored.length) return null;
    scored.sort((a, b) => b.p - a.p);
    return {
      likely: scored[0].i,
      // low but not the very bottom, so it is a real spot someone could point at
      unlikely: scored[Math.floor(scored.length * 0.97)].i,
    };
  }, [reset]);

  const selected = picked ?? examples?.likely ?? null;

  // Keep the worker's explanation in step with the spot on screen. A fresh
  // scoring pass (new area, or a changed setting) re-asks even for the same
  // cell index, because the answer may have changed underneath it.
  const { explainCell } = sim;
  const requested = useRef<{ cell: number; reset: unknown } | null>(null);
  useEffect(() => {
    if (selected == null || !reset) return;
    const last = requested.current;
    if (last && last.cell === selected && last.reset === reset) return;
    requested.current = { cell: selected, reset };
    explainCell(selected);
  }, [selected, reset, explainCell]);

  // Only trust an explanation for the spot on screen, and only one carrying the
  // representative tree - a worker started before that field existed (a stale
  // tab, a hot reload) would otherwise crash the step instead of re-asking.
  const current = explain && explain.cell === selected && explain.keyTree ? explain : null;

  const cellColor = useCallback(
    (i: number): [number, number, number] => {
      if (!loaded || !loaded.mask[i]) return NODATA;
      if (loaded.lulc2025[i] === 2) return EXISTING_BUILT;
      const tp = reset?.tp;
      return tp && tp[i] > 0 ? heat(tp[i]) : [238, 238, 241];
    },
    [loaded, reset]
  );

  const paint = useCallback(
    (out: Uint8ClampedArray) => {
      if (!loaded) return;
      const { width, pad, core, mask, lulc2025 } = loaded;
      const tp = reset?.tp;
      let p = 0;
      for (let y = pad; y < pad + core; y++) {
        for (let x = pad; x < pad + core; x++) {
          const i = y * width + x;
          let c = NODATA;
          if (mask[i]) {
            if (lulc2025[i] === 2) c = EXISTING_BUILT;
            else if (tp && tp[i] > 0) c = heat(tp[i]);
            else c = [238, 238, 241];
          }
          out[p++] = c[0];
          out[p++] = c[1];
          out[p++] = c[2];
          out[p++] = 255;
        }
      }
    },
    [loaded, reset]
  );

  const keyVote = current?.keyTree.leaf ?? 0;
  const importance = DRIVER_IMPORTANCE.slice(0, 5);
  const maxImp = importance[0]?.importance ?? 1;
  const topTwo = importance.slice(0, 2).map((d) => labelFor(d.feature).toLowerCase());
  const pickedIsUnlikely = examples && selected === examples.unlikely;

  return (
    <div className="flex flex-col gap-6">
      <StepTitle
        kicker="Zoomed to 10 m"
        tag={{ label: "Machine learning", tone: "ml" }}
        question="Why was this cell scored the way it was?"
        answer="The bottom rung: one 10 m cell. This is the machine-learning half - the part that decides where growth is likely, before the automaton places any of it."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,440px)_1fr]">
        <div className="flex flex-col gap-3">
          <ZoomCanvas
            width={loaded?.width ?? 320}
            pad={loaded?.pad ?? 32}
            x0={block.x0}
            y0={block.y0}
            n={block.n}
            cellColor={cellColor}
            revision={sim.state.revision}
            onPickCell={setPicked}
            markedCell={selected}
          />
          <RampLegend ramp={heat} from="unlikely" to="very likely" label="Likelihood of being built on" />
          <div className="flex flex-wrap items-center gap-2">
            <Swatch color={EXISTING_BUILT} label="already built" />
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton
              tone={pickedIsUnlikely ? "secondary" : "primary"}
              onClick={() => examples && setPicked(examples.likely)}
              disabled={!examples}
            >
              Show a likely spot
            </ActionButton>
            <ActionButton
              tone={pickedIsUnlikely ? "primary" : "secondary"}
              onClick={() => examples && setPicked(examples.unlikely)}
              disabled={!examples}
            >
              Show an unlikely spot
            </ActionButton>
          </div>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MousePointerClick className="h-4 w-4" />
            Or click any cell in the block above.
          </p>
          <GridCanvas
            width={loaded?.width ?? 320}
            height={loaded?.height ?? 320}
            pad={loaded?.pad ?? 32}
            core={loaded?.core ?? 256}
            paint={paint}
            revision={sim.state.revision}
            box={block}
            markedCell={selected}
            className="max-w-[170px]"
          />
          <p className="text-[11px] text-muted-foreground">
            The same cell, shown on the 2.5 km area for context.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              This spot&apos;s score
            </p>
            <div className="mt-2">
              {current ? (
                <LikelihoodMeter p={current.tp} word={likelihoodWord(current.tp)} />
              ) : (
                <p className="text-sm text-muted-foreground">Scoring...</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              What the model sees here
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {GROUPS.map((g) => (
                <div key={g}>
                  <p className="text-xs font-semibold">{g}</p>
                  <ul className="mt-1 space-y-1">
                    {FACTORS.map((f, idx) =>
                      f.group === g ? (
                        <li key={f.key} className="text-sm leading-5">
                          <span className="text-muted-foreground">{f.label}:</span>{" "}
                          <span className="font-medium tabular-nums">
                            {current && Number.isFinite(current.features[idx])
                              ? f.format(current.features[idx])
                              : "—"}
                          </span>
                        </li>
                      ) : null
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              How it decides
            </p>
            <p className="mt-2 text-sm leading-6">
              The model is <strong>{SIM_MODEL.nTrees} small decision trees</strong>. Each
              one asks a few yes-or-no questions about the spot and casts a small vote.
              {current && (
                <>
                  {" "}
                  Here is the one that pushed hardest on this spot (tree{" "}
                  {current.keyTree.index + 1}):
                </>
              )}
            </p>
            {current && (
              <>
                <ol className="mt-3 space-y-1.5">
                  {current.keyTree.path.map((s, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm"
                    >
                      <span className="flex-1">{splitQuestion(s.feature, s.threshold)}</span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                          s.goLeft
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                            : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                        }`}
                      >
                        {s.goLeft ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        {s.goLeft ? "Yes" : "No"}
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-sm">
                  This tree votes{" "}
                  <strong className={keyVote >= 0 ? "text-red-600" : "text-sky-700"}>
                    strongly {keyVote >= 0 ? "towards" : "against"}
                  </strong>{" "}
                  this spot being built on. The other {SIM_MODEL.nTrees - 1} trees vote too, some
                  each way.
                </p>
                <VoteChart margins={current.margins} final={current.tp} />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          What matters most to the model
        </p>
        <div className="mt-3 space-y-2">
          {importance.map((d) => (
            <div key={d.feature} className="flex items-center gap-3">
              <span className="w-56 shrink-0 text-sm">{labelFor(d.feature)}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-violet-500"
                  style={{ width: `${(d.importance / maxImp) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Measured by scrambling one factor at a time and seeing how much worse the model
          gets. Night-time lights and nearness to existing buildings matter most &mdash;
          each about twice as much as the next factor.
        </p>
      </div>

      <SpeakerNotes
        show={notes}
        points={[
          "This is the first part, the machine learning. Every open spot in this area has been scored. Red means likely to be built on, pale means unlikely, grey is already built.",
          current ? (
            <>
              Take this spot. The model gives it <strong>{pct(current.tp)}</strong> &mdash;{" "}
              {likelihoodWord(current.tp).toLowerCase()}.
            </>
          ) : (
            "Take one spot and read its score."
          ),
          "To score it, the model looks at eleven things: how close it is to existing buildings, roads, town centres and economic zones; the terrain; the population; and how bright it is at night.",
          `It decides with ${SIM_MODEL.nTrees} small decision trees. Each asks a few yes-or-no questions - like the ones on screen - and casts a small vote. All the votes are added up into the final score.`,
          "Now compare an unlikely spot. [Click 'Show an unlikely spot'.] Different surroundings, so the trees vote the other way.",
          `It learned all of this from real growth between 2016 and 2020. The two things that matter most are ${topTwo.join(" and ")}.`,
        ]}
      />

      <div>
        <ActionButton onClick={() => goTo(4)}>
          Zoom back out: does the model actually work?
          <ArrowRight className="h-4 w-4" />
        </ActionButton>
      </div>

      <Details summary="Technical details">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Model: gradient-boosted decision trees (XGBoost), {SIM_MODEL.nTrees} trees of depth
            6, {count(SIM_MODEL.nNodes)} decision points in total.
          </li>
          <li>
            Score = the logistic function of (baseline {SIM_MODEL.intercept.toFixed(3)} + the
            sum of all {SIM_MODEL.nTrees} leaf votes). This page computes it live and checks
            it against the thesis output file.
          </li>
          <li>
            Trained on 2016&ndash;2020 conversions, split into 5 km spatial blocks so the test
            area never touches the training area. Area under the ROC curve on held-out blocks:{" "}
            {TRANSITION_BENCHMARK.map((b) => `${b.model} ${b.auc.toFixed(3)}`).join(", ")}.
            XGBoost was selected.
          </li>
          <li>
            The three &ldquo;development nearby&rdquo; factors are recomputed whenever the
            map changes. That is what connects this part to part 2.
          </li>
        </ul>
        {loaded && <FactorMaps sim={sim} />}
      </Details>
    </div>
  );
}

function labelFor(feature: string): string {
  return FACTORS.find((f) => f.key === feature)?.label ?? feature;
}

/** The running score as trees are added, drawn in percent rather than log-odds. */
function VoteChart({ margins, final }: { margins: Float32Array; final: number }) {
  const W = 320;
  const H = 80;
  const path = useMemo(() => {
    return Array.from(margins, (m, i) => {
      const x = (i / (margins.length - 1)) * W;
      const y = H - sigmoid(m) * (H - 8) - 4;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  }, [margins]);
  return (
    <div className="mt-3">
      <p className="text-xs text-muted-foreground">
        The score as all {margins.length} trees vote, one after another:
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full" role="img" aria-label="Score as trees vote">
        <line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="currentColor" strokeOpacity="0.15" strokeDasharray="3 3" />
        <path d={path} fill="none" stroke="currentColor" strokeWidth={2} className="text-violet-600" />
      </svg>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>tree 1</span>
        <span className="font-semibold text-foreground">final score {pct(final)}</span>
        <span>tree {margins.length}</span>
      </div>
    </div>
  );
}

/** Each input as its own map, for a panelist who asks to see one. */
function FactorMaps({ sim }: { sim: ActProps["sim"] }) {
  const { loaded } = sim.state;
  const options = [
    { key: "viirs_forecast", label: "Night-time lights", ramp: cool },
    { key: "dist_roads", label: "Distance to a major road", ramp: cool },
    { key: "dist_centers", label: "Distance to a town centre", ramp: cool },
    { key: "dist_peza", label: "Distance to an economic zone", ramp: cool },
    { key: "pop", label: "Population", ramp: cool },
    { key: "elevation", label: "Elevation", ramp: terrain },
    { key: "slope", label: "Slope", ramp: terrain },
    { key: "dist_rivers", label: "Distance to a river", ramp: cool },
  ];
  const [key, setKey] = useState(options[0].key);
  const opt = options.find((o) => o.key === key) ?? options[0];
  const layer = loaded?.drivers[key];
  const range = useMemo(() => (layer ? percentileRange(layer) : [0, 1]), [layer]);

  const paint = useCallback(
    (out: Uint8ClampedArray) => {
      if (!loaded || !layer) return;
      const { width, pad, core, mask } = loaded;
      const [lo, hi] = range;
      const span = hi - lo || 1;
      let p = 0;
      for (let y = pad; y < pad + core; y++) {
        for (let x = pad; x < pad + core; x++) {
          const i = y * width + x;
          const v = layer[i];
          const c = mask[i] && Number.isFinite(v) ? opt.ramp((v - lo) / span) : NODATA;
          out[p++] = c[0];
          out[p++] = c[1];
          out[p++] = c[2];
          out[p++] = 255;
        }
      }
    },
    [loaded, layer, range, opt]
  );

  if (!loaded) return null;
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-[260px_1fr]">
      <GridCanvas
        width={loaded.width}
        height={loaded.height}
        pad={loaded.pad}
        core={loaded.core}
        paint={paint}
      />
      <div>
        <p className="text-xs font-semibold">See one factor as a map</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setKey(o.key)}
              className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                o.key === key
                  ? "border-sky-500 bg-sky-50 font-semibold text-sky-900 dark:bg-sky-950 dark:text-sky-100"
                  : "border-border hover:bg-muted"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <RampLegend ramp={opt.ramp} from="low" to="high" label={opt.label} />
        </div>
      </div>
    </div>
  );
}
