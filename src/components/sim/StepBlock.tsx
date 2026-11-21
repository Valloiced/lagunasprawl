"use client";

/**
 * Step 3 - one 320 m block, where the algorithm becomes visible.
 *
 * Two rungs up, growth is a colour spreading across a map. Here a cell is a
 * square you can point at, and the three moves of the automaton are advanced by
 * hand, one button press each, so the presenter sets the pace and the room has
 * time to follow:
 *
 *   1 score   every open cell gets a number
 *   2 build   the demand is drawn, cells flip one after another
 *   3 update  the neighbours of the new buildings are re-scored
 *
 * The engine is the same one the other steps use; only the viewport and the
 * pacing change. Nothing here is a mock-up of the algorithm - it is the
 * algorithm, cropped to 32 x 32 cells.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Play, RotateCcw, ZoomIn } from "lucide-react";
import GridCanvas from "./GridCanvas";
import ZoomCanvas from "./ZoomCanvas";
import { Locator } from "./ScaleLadder";
import { ActionButton, Details, PartTag, SpeakerNotes, StepTitle, Swatch } from "./ui";
import { count, likelihoodWord, pct } from "./plain";
import type { ActProps } from "./shared";
import { EXISTING_BUILT, heat, NEW_BUILT, NODATA, type Rgb } from "@/lib/sim/colors";

const LATER: Rgb = [234, 88, 12];
const ROSE: Rgb = [37, 99, 235];
const FELL: Rgb = [220, 38, 38];
const OPEN: Rgb = [238, 238, 241];
const REVEAL_MS = 3200;

type Phase = 0 | 1 | 2 | 3;

const PHASES: { n: Phase; button: string; title: string; body: string; tone?: "ml" | "ca" }[] = [
  {
    n: 1,
    button: "1 · Score the open cells",
    title: "Every open cell gets a number",
    body: "The machine-learning model reads each cell's surroundings and scores how likely it is to be built on. Darker red is a higher score.",
    tone: "ml",
  },
  {
    n: 2,
    button: "2 · Build on the best cells",
    title: "The likeliest cells are built",
    body: "The 5-year demand is drawn from those scores, strongly favouring the high ones. Watch the cells flip one after another, in the order they were drawn.",
  },
  {
    n: 3,
    button: "3 · Update the neighbours",
    title: "The new buildings change their surroundings",
    body: "Distance to buildings and the built share of each neighbourhood are measured again, and every remaining cell is re-scored. Blue went up, red went down.",
    tone: "ca",
  },
];

export default function StepBlock({
  sim,
  tile,
  run,
  goTo,
  notes,
  presenting,
  block,
  setBlock,
  cell,
  setCell,
}: ActProps & {
  block: { x0: number; y0: number; n: number };
  setBlock: (b: { x0: number; y0: number; n: number }) => void;
  cell: number | null;
  setCell: (c: number) => void;
}) {
  const { loaded, reset, steps, status } = sim.state;
  const [phase, setPhase] = useState<Phase>(0);
  const [awaiting, setAwaiting] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const lastAuto = useRef(0);
  const statusRef = useRef(status);
  const revealingRef = useRef(false);

  const demands = useMemo(
    () => [
      Math.round(tile.demand2030 * run.demandScale),
      Math.round(tile.demand2035 * run.demandScale),
    ],
    [tile, run.demandScale]
  );

  const shown = steps.length ? steps[steps.length - 1] : null;
  // waiting only counts while the step we asked for has not landed; steps run
  // from another rung of the ladder (or by auto-play) are shown straight away
  const pending = awaiting != null && steps.length <= awaiting;
  const arrived = pending ? null : shown;
  const revealFrom = arrived?.receivedAt ?? 0;
  const revealing = phase === 2 && !!arrived && (now < revealFrom || now - revealFrom < REVEAL_MS);
  const reveal =
    phase < 2 ? 0 : !arrived ? 0 : Math.min(1, Math.max(0, (now - revealFrom) / REVEAL_MS));

  useEffect(() => {
    statusRef.current = status;
    revealingRef.current = revealing;
  });

  useEffect(() => {
    if (!revealing) return;
    const id = window.setInterval(() => setNow(performance.now()), 50);
    return () => window.clearInterval(id);
  }, [revealing, revealFrom]);

  /**
   * Draw order per step, as a lookup rather than a search: the painter runs per
   * cell, and scanning tens of thousands of picks inside it would crawl.
   */
  const orders = useMemo(() => {
    if (!loaded) return [];
    return steps.map((s) => {
      const o = new Int32Array(loaded.width * loaded.height).fill(-1);
      for (let k = 0; k < s.picks.length; k++) o[s.picks[k]] = k;
      return o;
    });
  }, [loaded, steps]);
  const order = orders.length ? orders[orders.length - 1] : null;

  /** conversions that fall inside this block, for the counter */
  const inBlock = useMemo(() => {
    if (!loaded || !shown) return 0;
    let n = 0;
    for (let k = 0; k < shown.picks.length; k++) {
      const i = shown.picks[k];
      const x = (i % loaded.width) - loaded.pad - block.x0;
      const y = Math.floor(i / loaded.width) - loaded.pad - block.y0;
      if (x >= 0 && y >= 0 && x < block.n && y < block.n) n++;
    }
    return n;
  }, [loaded, shown, block]);

  // read outside the callback so its dependency list is complete and the
  // compiler can keep the memoization
  const stepCount = steps.length;

  const cellColor = useCallback(
    (i: number): Rgb => {
      if (!loaded || !loaded.mask[i]) return NODATA;
      if (loaded.lulc2025[i] === 2) return EXISTING_BUILT;
      // cells converted in an earlier step stay coloured
      for (let k = 0; k < orders.length - 1; k++) {
        if (orders[k][i] >= 0) return NEW_BUILT;
      }
      if (phase >= 2 && order && arrived) {
        const o = order[i];
        if (o >= 0 && o < reveal * arrived.picks.length) {
          return stepCount > 1 ? LATER : NEW_BUILT;
        }
      }
      if (phase === 3 && arrived) {
        const d = arrived.tpAfter[i] - arrived.tp[i];
        // most changes are a few points, so scale to that range - at the
        // projector this has to read from the back of a room
        if (d > 0.001) return blend(ROSE, 0.25 + 0.75 * Math.min(1, d / 0.08));
        if (d < -0.001) return blend(FELL, 0.25 + 0.75 * Math.min(1, -d / 0.08));
        return OPEN;
      }
      if (phase >= 1) {
        const tp = arrived ? arrived.tp : reset?.tp;
        return tp && tp[i] > 0 ? heat(tp[i]) : OPEN;
      }
      return OPEN;
    },
    [loaded, orders, order, arrived, reveal, phase, reset, stepCount]
  );

  const paintArea = useCallback(
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

  const advance = () => {
    if (phase === 0) return setPhase(1);
    if (phase === 1) {
      if (steps.length < demands.length) {
        setAwaiting(steps.length);
        setNow(performance.now());
        sim.step(demands[steps.length], run.seed + steps.length, "block");
      }
      return setPhase(2);
    }
    if (phase === 2) return setPhase(3);
    // start the next 5-year step
    setPhase(1);
  };

  // Unattended, nobody presses the buttons, so auto-play walks the same three
  // moves on a timer - the identical code path, just not hand-driven.
  const advanceRef = useRef(advance);
  useEffect(() => {
    advanceRef.current = advance;
  });
  useEffect(() => {
    if (!presenting || !reset) return;
    const id = window.setInterval(() => {
      if (statusRef.current === "running" || revealingRef.current) return;
      if (performance.now() - lastAuto.current < 5200) return;
      lastAuto.current = performance.now();
      advanceRef.current();
    }, 400);
    return () => window.clearInterval(id);
  }, [presenting, reset]);

  const restart = () => {
    setPhase(0);
    setAwaiting(null);
    sim.reset("2025");
  };

  const hovered = hover != null && loaded ? hover : null;
  const hoverScore = hovered != null ? (arrived ? arrived.tp[hovered] : (reset?.tp[hovered] ?? 0)) : 0;
  const hoverAfter = hovered != null && arrived ? arrived.tpAfter[hovered] : null;
  const hoverBuilt = hovered != null && loaded ? loaded.lulc2025[hovered] === 2 : false;

  const stepsDone = steps.length;
  const allDone = phase === 3 && stepsDone >= demands.length;
  const currentPhase = PHASES.find((p) => p.n === phase);
  const nextPhase = phase === 3 ? (allDone ? null : PHASES[0]) : PHASES.find((p) => p.n === phase + 1);
  const computing = status === "running" && phase === 2 && !arrived;

  return (
    <div className="flex flex-col gap-6">
      <StepTitle
        kicker="Zoomed to 320 m"
        question="What is the algorithm actually doing?"
        answer="One 32 by 32 block of cells, each 10 m across. Press the buttons one at a time and watch the three moves that make up every 5-year step."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-3">
          <ZoomCanvas
            width={loaded?.width ?? 320}
            pad={loaded?.pad ?? 32}
            x0={block.x0}
            y0={block.y0}
            n={block.n}
            cellColor={cellColor}
            revision={sim.state.revision + phase * 7 + Math.floor(reveal * 64)}
            onHoverCell={setHover}
            onPickCell={setCell}
            markedCell={cell}
            className="max-h-[560px]"
          />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Swatch color={EXISTING_BUILT} label="already built" />
            <Swatch color={NEW_BUILT} label="built this step" />
            <Swatch color={heat(0.9)} label="high score" />
            {phase === 3 && (
              <>
                <Swatch color={ROSE} label="score went up" />
                <Swatch color={FELL} label="score went down" />
              </>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Each square is one 10 &times; 10 m cell. Hover any of them to read its score;
            click one to take it to the next step.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border-2 border-sky-500 bg-sky-50 p-4 dark:bg-sky-950">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
              {phase === 0 ? "Ready" : `Move ${phase} of 3`}
              {stepsDone > 0 && phase > 0 && ` · ${stepsDone === 1 ? "2025–2030" : "2030–2035"}`}
            </p>
            <p className="mt-1 text-lg font-bold leading-tight">
              {phase === 0 ? "The block as it is in 2025" : currentPhase?.title}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {phase === 0
                ? "Grey cells are already built. The rest are open land the model may build on."
                : currentPhase?.body}
            </p>
            {currentPhase?.tone && (
              <div className="mt-2">
                <PartTag
                  label={currentPhase.tone === "ml" ? "Machine learning" : "Cellular automata"}
                  tone={currentPhase.tone}
                />
              </div>
            )}
            {phase === 2 && (
              <p className="mt-2 text-sm">
                <span className="text-2xl font-bold tabular-nums">
                  {computing ? "…" : count(Math.round(reveal * inBlock))}
                </span>{" "}
                of {count(inBlock)} cells in this block built
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {nextPhase ? (
                <ActionButton onClick={advance} disabled={!reset || revealing || computing}>
                  <Play className="h-4 w-4" />
                  {phase === 3 ? "Run the next 5-year step" : nextPhase.button}
                </ActionButton>
              ) : (
                <ActionButton onClick={() => goTo(3)}>
                  See why one cell was chosen
                  <ArrowRight className="h-4 w-4" />
                </ActionButton>
              )}
              <ActionButton tone="secondary" onClick={restart} disabled={status === "running"}>
                <RotateCcw className="h-4 w-4" />
                Reset
              </ActionButton>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {hovered == null ? "Hover a cell" : "This cell"}
            </p>
            {hovered == null ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Its score, and what happened to it.
              </p>
            ) : hoverBuilt ? (
              <p className="mt-1 text-sm">Already built-up in 2025.</p>
            ) : (
              <div className="mt-1 space-y-1 text-sm">
                <p>
                  Score:{" "}
                  <strong className="tabular-nums">{pct(hoverScore)}</strong>{" "}
                  <span className="text-muted-foreground">
                    ({likelihoodWord(hoverScore).toLowerCase()})
                  </span>
                </p>
                {hoverAfter != null && phase === 3 && (
                  <p>
                    After the neighbours updated:{" "}
                    <strong className="tabular-nums">{pct(hoverAfter)}</strong>{" "}
                    <span
                      className={
                        hoverAfter > hoverScore
                          ? "text-blue-700 dark:text-blue-400"
                          : hoverAfter < hoverScore
                            ? "text-red-700 dark:text-red-400"
                            : "text-muted-foreground"
                      }
                    >
                      ({hoverAfter > hoverScore ? "+" : ""}
                      {((hoverAfter - hoverScore) * 100).toFixed(1)} points)
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-start gap-3">
            <Locator
              title="Where this block is"
              caption="Dashed box inside the 2.5 km area. Click to move it."
            >
              <GridCanvas
                width={loaded?.width ?? 320}
                height={loaded?.height ?? 320}
                pad={loaded?.pad ?? 32}
                core={loaded?.core ?? 256}
                paint={paintArea}
                revision={sim.state.revision + phase * 7 + Math.floor(reveal * 64)}
                box={block}
                onPickCell={(c) => {
                  if (!loaded) return;
                  const x = (c % loaded.width) - loaded.pad;
                  const y = Math.floor(c / loaded.width) - loaded.pad;
                  const half = block.n / 2;
                  const max = loaded.core - block.n;
                  setBlock({
                    x0: Math.max(0, Math.min(max, Math.round(x - half))),
                    y0: Math.max(0, Math.min(max, Math.round(y - half))),
                    n: block.n,
                  });
                }}
              />
            </Locator>
            <ActionButton tone="secondary" onClick={() => goTo(1)}>
              <ZoomIn className="h-4 w-4 rotate-180" />
              Back out to the area
            </ActionButton>
          </div>
        </div>
      </div>

      <SpeakerNotes
        show={notes}
        points={[
          "Now we are down to 320 metres across. Every square you see is one 10-by-10-metre cell - the same cells the model works on.",
          "Grey is already built. The rest is open land. I'll take one 5-year step, one move at a time.",
          <>
            Move one: <strong>score</strong>. The machine-learning model gives every open
            cell a number. Darker red means more likely. [Press 1.]
          </>,
          <>
            Move two: <strong>build</strong>. The model has to place a fixed amount of new
            built-up land, and it draws from those scores &mdash; mostly the high ones.
            Watch them flip one by one. [Press 2.]
          </>,
          <>
            Move three: <strong>update the neighbours</strong>. This is the cellular automata
            part. Those new buildings changed their surroundings, so every remaining cell is
            measured and scored again. Blue cells went up, red went down. [Press 3.]
          </>,
          "Then the loop repeats for the next five years, starting from this new map. That is the whole algorithm.",
          "You can hover any cell to read its score before and after, and click one to see exactly why the model scored it that way.",
        ]}
      />

      <Details summary="Technical details">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            The block is a crop, not a separate simulation. Scores and draws are computed
            across the whole 2.5 km area; this view shows 1,024 of its{" "}
            {count(reset?.candidates ?? 0)} candidate cells.
          </li>
          <li>
            Cells appear in the order they were drawn. The draw is weighted by score to the
            power of 5, without replacement, so high scores are strongly favoured but the
            result still scatters the way real development does.
          </li>
          <li>
            Re-scoring after a step changes only three of the eleven inputs: distance to
            existing buildings, and the built share of the 30 m and 50 m blocks around each
            cell. The other eight are fixed terrain, access, population and night-lights.
          </li>
        </ul>
      </Details>
    </div>
  );
}

function blend(c: Rgb, t: number): Rgb {
  return [
    Math.round(255 + (c[0] - 255) * t),
    Math.round(255 + (c[1] - 255) * t),
    Math.round(255 + (c[2] - 255) * t),
  ];
}
