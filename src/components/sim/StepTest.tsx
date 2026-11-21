"use client";

/**
 * Step 3 - does it actually work?
 *
 * The future cannot be checked, so the model is run on a period whose answer is
 * known: from the real 2020 map to 2025, compared cell by cell with the real
 * 2025 map. The result is shown the way it should be defended - the hard number
 * first (exact 10 m cells are rarely hit), then the number that matters for
 * planning (neighbourhoods are), then the comparison with chance.
 */
import { useCallback } from "react";
import { ArrowRight, FlaskConical } from "lucide-react";
import GridCanvas from "./GridCanvas";
import { ActionButton, Busy, Details, SpeakerNotes, StepTitle, Swatch } from "./ui";
import { count } from "./plain";
import type { ActProps } from "./shared";
import { AGREEMENT, EXISTING_BUILT, NODATA } from "@/lib/sim/colors";
import { VALIDATION_VARIANTS, NULL_MODEL } from "@/data/generated/analysis.generated";

// the published internal validation; both fields are always emitted by s14 for
// this variant, but the shared type marks them optional
const VARIANT = VALIDATION_VARIANTS[0];
const THESIS = {
  fom: VARIANT.fom,
  fomRandomBaseline: VARIANT.fomRandomBaseline ?? 0,
  fomMultiRes: VARIANT.fomMultiRes ?? [{ resolution: "10 m", fom: VARIANT.fom }],
};

export default function StepTest({ sim, tile, run, goTo, notes }: ActProps) {
  const { loaded, validation, status, progress } = sim.state;
  const running = status === "running" && !!progress && progress.phase === "validation";

  const paint = useCallback(
    (out: Uint8ClampedArray) => {
      if (!loaded) return;
      const { width, pad, core, mask, lulc2020 } = loaded;
      let p = 0;
      for (let y = pad; y < pad + core; y++) {
        for (let x = pad; x < pad + core; x++) {
          const i = y * width + x;
          let c = NODATA;
          if (mask[i]) {
            const o = validation?.observedChange[i];
            const s = validation?.simulatedChange[i];
            if (o && s) c = AGREEMENT.hit;
            else if (o) c = AGREEMENT.miss;
            else if (s) c = AGREEMENT.falseAlarm;
            else if (lulc2020[i] === 2) c = EXISTING_BUILT;
            else c = [238, 238, 241];
          }
          out[p++] = c[0];
          out[p++] = c[1];
          out[p++] = c[2];
          out[p++] = 255;
        }
      }
    },
    [loaded, validation]
  );

  const thesis10 = THESIS.fomMultiRes[0].fom;
  const thesis500 = THESIS.fomMultiRes[THESIS.fomMultiRes.length - 1].fom;
  const timesRandom = THESIS.fom / THESIS.fomRandomBaseline;

  return (
    <div className="flex flex-col gap-6">
      <StepTitle
        kicker="Zoomed back out"
        question="Does it actually work?"
        answer="We can't check 2035 yet, so we tested it on the past: start from the real 2020 map, let the model predict 2025, and compare with the real 2025 map."
      />

      <div className="grid gap-2 sm:grid-cols-3">
        {[
          ["1", "Start from the real 2020 map"],
          ["2", "Let the model grow it to 2025"],
          ["3", "Compare with the real 2025 map"],
        ].map(([n, t]) => (
          <div key={n} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background">
              {n}
            </span>
            <span className="text-sm font-medium">{t}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,440px)_1fr]">
        <div className="flex flex-col gap-3">
          <GridCanvas
            width={loaded?.width ?? 320}
            height={loaded?.height ?? 320}
            pad={loaded?.pad ?? 32}
            core={loaded?.core ?? 256}
            paint={paint}
            revision={sim.state.revision}
          />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Swatch color={AGREEMENT.hit} label="predicted, and it happened" />
            <Swatch color={AGREEMENT.miss} label="happened, but missed" />
            <Swatch color={AGREEMENT.falseAlarm} label="predicted, didn't happen" />
            <Swatch color={EXISTING_BUILT} label="already built in 2020" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ActionButton
              onClick={() => sim.validate(tile.demandValidation, run.runs, run.seed)}
              disabled={!loaded || status === "running"}
            >
              <FlaskConical className="h-4 w-4" />
              {validation ? "Run the test again" : "Run the test"}
            </ActionButton>
            {running && progress && <Busy label={`run ${progress.done} of ${progress.total}`} />}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {validation ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                In this area, just now
              </p>
              <p className="mt-2 text-base leading-7">
                <strong>{count(validation.hits + validation.misses)}</strong> cells really became
                built-up here between 2020 and 2025. The model put{" "}
                <strong className="text-emerald-700 dark:text-emerald-400">
                  {count(validation.hits)}
                </strong>{" "}
                of its predictions on exactly those cells.
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Many of the rest landed nearby rather than on the exact cell &mdash; which is
                why the score climbs as you zoom out:
              </p>
              <ScaleBars
                rows={validation.multiResolution.map((m) => ({
                  label: m.resolutionM === 10 ? "exact 10 m cell" : `${m.resolutionM} m area`,
                  value: m.fom,
                }))}
                max={Math.max(0.4, ...validation.multiResolution.map((m) => m.fom))}
                color="bg-sky-500"
              />
            </div>
          ) : (
            <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Press &ldquo;Run the test&rdquo; to score this area.
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              The whole watershed, in the thesis
            </p>
            <ScaleBars
              rows={THESIS.fomMultiRes.map((m) => ({
                label: m.resolution === "10 m" ? "exact 10 m cell" : `${m.resolution} area`,
                value: m.fom,
              }))}
              max={0.4}
              color="bg-emerald-500"
            />
            <p className="mt-3 text-sm leading-6">
              <strong>About {timesRandom.toFixed(0)}&times; better than chance.</strong>{" "}
              Placing the same amount of growth at random scores{" "}
              {THESIS.fomRandomBaseline.toFixed(2)}; the model scores {THESIS.fom.toFixed(2)}.
            </p>
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
            <p className="font-semibold">What this means</p>
            <p className="mt-1">
              The model is not a tool for predicting which individual lot gets built. It{" "}
              <em>is</em>{" "}
              good at showing which neighbourhoods are under pressure &mdash; which
              is the question planners need answered.
            </p>
          </div>
        </div>
      </div>

      <SpeakerNotes
        show={notes}
        points={[
          "How do we know it works? We can't check 2035 yet, so we tested it on the past.",
          "We started from the real 2020 map, let the model predict 2025, and compared that with the real 2025 map. [Press Run the test.]",
          "Green is where the model predicted growth and it really happened. Blue is growth it missed. Red is growth it predicted that didn't happen.",
          <>
            The score we use is called the Figure of Merit: correct growth, divided by all
            growth that either happened or was predicted. At the exact 10-metre cell it is{" "}
            {thesis10.toFixed(2)}{" "}
            for the whole watershed &mdash; hitting the exact lot is hard.
          </>,
          <>
            But look at bigger areas: at 500 metres it rises to {thesis500.toFixed(2)}. The model
            usually puts growth in the right neighbourhood, just not on the exact cell. And it is
            about {timesRandom.toFixed(0)} times better than placing growth at random.
          </>,
          "So it is a planning tool for finding areas under growth pressure, not a tool for predicting individual lots.",
        ]}
      />

      <div>
        <ActionButton onClick={() => goTo(0)}>
          Back to the whole watershed
          <ArrowRight className="h-4 w-4" />
        </ActionButton>
      </div>

      <Details summary="Technical details">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Figure of Merit (Pontius et al.) = hits &divide; (hits + misses + false alarms). It
            ignores land that stayed the same, which is most of the map, so it cannot be
            inflated by predicting no change.
          </li>
          <li>
            Why not overall accuracy? Around 96% of cells do not change in five years, so
            &ldquo;predict nothing changes&rdquo; already scores kappa{" "}
            {NULL_MODEL.kappaNull.toFixed(2)} &mdash; slightly above the model&apos;s{" "}
            {NULL_MODEL.kappaSim.toFixed(2)}. That is a property of the metric, not the model.
          </li>
          <li>
            Multi-resolution FoM (Pontius et al. 2008): counts are summed into larger blocks and
            a hit is the smaller of predicted and real change per block, so near misses stop
            counting against the model once the block contains both.
          </li>
          <li>
            The test places exactly as much growth as really occurred, so it measures where the
            model puts growth, not how much. This area&apos;s test is {run.runs} runs averaged;
            the thesis figure is the whole watershed.
          </li>
        </ul>
      </Details>
    </div>
  );
}

function ScaleBars({
  rows,
  max,
  color,
}: {
  rows: { label: string; value: number }[];
  max: number;
  color: string;
}) {
  return (
    <div className="mt-3 space-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 text-xs text-muted-foreground">{r.label}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <span className="w-10 text-right text-xs font-semibold tabular-nums">{r.value.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}
