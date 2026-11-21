/**
 * Proves the browser CA engine reproduces the pipeline, headlessly.
 *
 *     npm run check:engine
 *
 * Three assertions, and the page's credibility rests on all three:
 *
 *  1. Transition potential recomputed here from the exported driver bands
 *     matches tp_<base>.tif - the raster the published run actually wrote -
 *     to float32 rounding. Same check as `s17_sim_tile.py --selftest-only`,
 *     but through the TypeScript the browser runs.
 *  2. A step feeds back: the potential surface moves where cells converted.
 *  3. With the dynamic drivers frozen it does not move at all, which is the
 *     control that shows assertion 2 is measuring the automaton and not noise.
 *
 * Run it after touching anything in src/lib/sim or re-running stage 17.
 */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { parseModel, parseTile } from "../src/lib/sim/format";
import { CaEngine, fidelityReport, figureOfMerit } from "../src/lib/sim/engine";
import { Rng } from "../src/lib/sim/rng";

const SIM = new URL("../public/sim/", import.meta.url);
const TILES = ["santa-rosa-cabuyao", "antipolo-uplands", "san-pedro-binan"];
const TOLERANCE = 1e-5;

function load(name: string): ArrayBuffer {
  const b = gunzipSync(readFileSync(new URL(name, SIM)));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

const forest = parseModel(load("model.bin.gz"));
console.log(
  `model: ${forest.nTrees} trees, ${forest.nNodes.toLocaleString()} nodes, ` +
    `intercept ${forest.intercept}`
);

let worst = 0;
let failed = false;

for (const id of TILES) {
  const tile = parseTile(load(`tile_${id}.bin.gz`));
  const ref = parseTile(load(`tile_${id}.ref.bin.gz`));
  const engine = new CaEngine(tile, forest);

  for (const base of ["2025", "2020"] as const) {
    const t0 = performance.now();
    const { candidates, active, tpFull } = engine.reset(base);
    const ms = performance.now() - t0;
    const rep = fidelityReport(
      tpFull,
      ref.bands[`tp_${base}`] as Float32Array,
      engine.candidateMask(base)
    );
    worst = Math.max(worst, rep.maxAbsError);
    console.log(
      `[${id}] base ${base}: candidates ${candidates.toLocaleString()}, ` +
        `active ${active.toLocaleString()} | max |dTP| ${rep.maxAbsError.toExponential(3)}, ` +
        `mean ${rep.meanAbsError.toExponential(3)} | ${ms.toFixed(0)} ms`
    );
  }

  // activeTp on a step is the surface predicted at the START of that step, so
  // step 2's surface is the one that has seen step 1's conversions.
  engine.reset("2025");
  const t1 = performance.now();
  const first = engine.step(2000, new Rng(0));
  const tp1 = first.activeTp.slice();
  const second = engine.step(2000, new Rng(1));
  const perStep = (performance.now() - t1) / 2;

  let moved = 0;
  let rose = 0;
  let sum = 0;
  for (let i = 0; i < tp1.length; i++) {
    const d = second.activeTp[i] - tp1[i];
    if (Math.abs(d) > 1e-4) {
      moved++;
      sum += d;
      if (d > 0) rose++;
    }
  }
  console.log(
    `[${id}] step: ${first.allocated.toLocaleString()} cells in ${perStep.toFixed(0)} ms/step | ` +
      `feedback moved ${moved.toLocaleString()} cells (${rose.toLocaleString()} up, ` +
      `mean ${moved ? (sum / moved).toExponential(2) : 0})`
  );
  if (moved === 0) {
    console.error(`[${id}] FAIL: no CA feedback - the surface did not react to a step`);
    failed = true;
  }

  engine.params = { ...engine.params, freezeDynamic: true };
  engine.reset("2025");
  const frozenA = engine.step(2000, new Rng(0)).activeTp.slice();
  const frozenB = engine.step(2000, new Rng(1)).activeTp;
  let frozenMoved = 0;
  for (let i = 0; i < frozenA.length; i++) {
    if (Math.abs(frozenB[i] - frozenA[i]) > 1e-9) frozenMoved++;
  }
  console.log(`[${id}] frozen-dynamics control: ${frozenMoved} cells moved (expect 0)`);
  if (frozenMoved !== 0) {
    console.error(`[${id}] FAIL: dynamic drivers moved while frozen`);
    failed = true;
  }
  engine.params = { ...engine.params, freezeDynamic: false };
}

const o = Uint8Array.from([1, 1, 0, 0, 1]);
const s = Uint8Array.from([1, 0, 1, 0, 1]);
const f = figureOfMerit(o, s);
if (f.hits !== 2 || f.misses !== 1 || f.falseAlarms !== 1 || Math.abs(f.fom - 0.5) > 1e-12) {
  console.error("FAIL: figureOfMerit disagrees with a hand count");
  failed = true;
}

console.log(`\nworst |dTP| across every tile and base: ${worst.toExponential(3)}`);
if (worst > TOLERANCE || failed) {
  console.error("FAIL");
  process.exit(1);
}
console.log("PASS - the browser engine reproduces the pipeline surface");
