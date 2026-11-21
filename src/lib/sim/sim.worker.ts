/// <reference lib="webworker" />
/**
 * Worker host for the CA engine.
 *
 * Every prediction pass walks 400 trees over tens of thousands of cells; on the
 * main thread that would freeze the page mid-animation. The engine lives here,
 * the page sends commands and receives grids.
 */
import {
  BUILT_UP_CLASS,
  CaEngine,
  DEFAULT_PARAMS,
  fidelityReport,
  figureOfMerit,
  fomMultiResolution,
  fomRandomBaseline,
  type EngineParams,
} from "./engine";
import { explain, predict } from "./forest";
import { fetchBinary, parseModel, parseTile, type PackedForest, type Tile } from "./format";
import { Rng } from "./rng";
import type {
  Base,
  ExplainPayload,
  SimRequest,
  SimResponse,
} from "./protocol";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

let forest: PackedForest | null = null;
let tile: Tile | null = null;
let reference: Tile | null = null;
let engine: CaEngine | null = null;
/**
 * The 2020 -> 2025 test runs on its own engine. Sharing one would reset the
 * forecast engine to 2020 behind the page's back, and the next forecast step
 * would silently simulate from the wrong year.
 */
let testEngine: CaEngine | null = null;
let params: EngineParams = { ...DEFAULT_PARAMS };

function post(msg: SimResponse, transfer: Transferable[] = []) {
  ctx.postMessage(msg, transfer);
}

function progress(phase: string, done: number, total: number) {
  post({ type: "progress", phase, done, total });
}

function need<T>(v: T | null, what: string): T {
  if (!v) throw new Error(`${what} is not loaded yet`);
  return v;
}

/** Spread the active-set TP back over the full grid, for display. */
function scatter(e: CaEngine, tpActive: Float32Array): Float32Array {
  const out = new Float32Array(e.size);
  for (let i = 0; i < e.activeIdx.length; i++) out[e.activeIdx[i]] = tpActive[i];
  return out;
}

async function load(tileId: string, withReference: boolean) {
  const t0 = performance.now();
  const [modelBuf, tileBuf] = await Promise.all([
    forest ? Promise.resolve(null) : fetchBinary("/sim/model.bin.gz"),
    fetchBinary(`/sim/tile_${tileId}.bin.gz`),
  ]);
  if (modelBuf) forest = parseModel(modelBuf);
  tile = parseTile(tileBuf);
  reference = withReference
    ? parseTile(await fetchBinary(`/sim/tile_${tileId}.ref.bin.gz`))
    : null;
  engine = new CaEngine(tile, need(forest, "model"));
  engine.params = params;
  testEngine = null;

  const b = tile.bands;
  const drivers: Record<string, Float32Array> = {};
  for (const k of [
    "elevation",
    "slope",
    "dist_roads",
    "dist_rivers",
    "dist_peza",
    "dist_centers",
    "pop",
    "viirs_forecast",
    "viirs_validation",
    "dist_outside_2025",
    "dist_outside_2020",
  ]) {
    drivers[k] = b[k] as Float32Array;
  }
  const ref: Record<string, Float32Array | Uint8Array> | undefined = reference
    ? { ...reference.bands }
    : undefined;

  post({
    type: "loaded",
    payload: {
      width: tile.width,
      height: tile.height,
      core: tile.core,
      pad: tile.pad,
      lulc2016: b.lulc_2016 as Uint8Array,
      lulc2020: b.lulc_2020 as Uint8Array,
      lulc2025: b.lulc_2025 as Uint8Array,
      constraint: b.constraint as Uint8Array,
      mask: b.mask as Uint8Array,
      drivers,
      reference: ref,
      loadMs: performance.now() - t0,
    },
  });
}

function reset(base: Base) {
  const e = need(engine, "engine");
  const t0 = performance.now();
  const { candidates, active, tpFull } = e.reset(base);
  const candMask = e.candidateMask(base);

  let fidelity;
  if (reference) {
    const refBand = reference.bands[`tp_${base}`] as Float32Array | undefined;
    if (refBand) fidelity = fidelityReport(tpFull, refBand, candMask);
  }

  post({
    type: "reset",
    payload: {
      base,
      candidates,
      active,
      tp: tpFull,
      candidateMask: candMask,
      built: e.built.slice(),
      fidelity,
      ms: performance.now() - t0,
    },
  });
}

function step(demand: number, seed: number, label: string) {
  const e = need(engine, "engine");
  const t0 = performance.now();
  const r = e.step(demand, new Rng(seed));
  const before = scatter(e, r.activeTp);
  // re-score straight away so the page can show what the new buildings did to
  // their neighbours; with the neighbour effect frozen this equals `before`
  const after = scatter(e, e.rescore());
  post({
    type: "step",
    payload: {
      label,
      picks: r.picks,
      demand: r.demand,
      allocated: r.allocated,
      built: e.built.slice(),
      tp: before,
      tpAfter: after,
      builtCells: r.builtCells,
      ms: performance.now() - t0,
    },
  });
}

/**
 * The Monte Carlo ensemble: the same stochastic run repeated, accumulated into
 * a per-cell conversion frequency. That surface is the probability-of-
 * urbanisation map the pipeline publishes, and the modal map converts the
 * top-`demand` cells by frequency - the same convention as s12/s07.
 */
function ensemble(demands: number[], runs: number, seed: number) {
  const e = need(engine, "engine");
  const t0 = performance.now();
  const total = new Float32Array(e.size);
  const totalDemand = demands.reduce((a, b) => a + b, 0);

  for (let run = 0; run < runs; run++) {
    e.reset(e.base);
    const rng = new Rng(seed + run);
    for (const d of demands) {
      const r = e.step(d, rng);
      for (let i = 0; i < r.picks.length; i++) total[r.picks[i]] += 1;
    }
    progress("ensemble", run + 1, runs);
  }
  for (let i = 0; i < total.length; i++) total[i] /= runs;

  const order = Array.from(total.keys())
    .filter((i) => total[i] > 0)
    .sort((a, b) => total[b] - total[a])
    .slice(0, totalDemand);
  const modal = new Uint8Array(e.size);
  const lulc = e.tile.bands[`lulc_${e.base}`] as Uint8Array;
  for (let i = 0; i < modal.length; i++) modal[i] = lulc[i] === BUILT_UP_CLASS ? 1 : 0;
  for (const i of order) modal[i] = 1;

  post({
    type: "ensemble",
    payload: { frequency: total, modal, runs, demands, ms: performance.now() - t0 },
  });
}

/**
 * Internal validation, s07_ca_validate.py: simulate 2020 -> 2025 against the
 * frozen 2020 potential surface and score it on the observed 2025 map.
 *
 * Temporal monotonicity is enforced on the target the same way the pipeline
 * does it - built-up does not revert at this scale, so mapped losses are
 * classification churn and are not counted as change to reproduce.
 */
function validate(demand: number, runs: number, seed: number) {
  const t = need(tile, "tile");
  if (!testEngine) {
    testEngine = new CaEngine(t, need(forest, "model"));
    testEngine.params = params;
  }
  const e = testEngine;
  const t0 = performance.now();

  // the frozen surface s07 scores against - predicted once from the 2020 state
  // and never re-predicted, which is exactly what makes this run a test of the
  // transition model rather than of the automaton
  const tp = e.reset("2020").tpFull;
  const freq = new Float32Array(e.size);
  for (let run = 0; run < runs; run++) {
    const picks = e.validationDraw(tp, demand, new Rng(seed + run));
    for (let i = 0; i < picks.length; i++) freq[picks[i]] += 1;
    progress("validation", run + 1, runs);
  }
  for (let i = 0; i < freq.length; i++) freq[i] /= runs;

  const l20 = t.bands.lulc_2020 as Uint8Array;
  const l25 = t.bands.lulc_2025 as Uint8Array;
  const mask = t.bands.mask as Uint8Array;
  const observed = new Uint8Array(e.size);
  const inCore = new Uint8Array(e.size);
  for (let y = t.pad; y < t.pad + t.core; y++) {
    for (let x = t.pad; x < t.pad + t.core; x++) {
      const i = y * t.width + x;
      inCore[i] = 1;
      observed[i] =
        l25[i] === BUILT_UP_CLASS && l20[i] !== BUILT_UP_CLASS && mask[i] > 0 ? 1 : 0;
    }
  }

  const order = Array.from(freq.keys())
    .filter((i) => freq[i] > 0)
    .sort((a, b) => freq[b] - freq[a])
    .slice(0, demand);
  const simulated = new Uint8Array(e.size);
  for (const i of order) simulated[i] = 1;

  const scored = figureOfMerit(observed, simulated);
  const multi = fomMultiResolution(observed, simulated, t.width, t.height, [1, 5, 10, 25, 50]);
  let candidates = 0;
  const cand = e.candidateMask("2020");
  for (let i = 0; i < cand.length; i++) candidates += cand[i];
  let obsCount = 0;
  for (let i = 0; i < observed.length; i++) obsCount += observed[i];

  post({
    type: "validation",
    payload: {
      frequency: freq,
      simulatedChange: simulated,
      observedChange: observed,
      ...scored,
      fomRandom: fomRandomBaseline(candidates, obsCount, demand),
      multiResolution: multi.map((m) => ({
        resolutionM: m.resolutionM,
        fom: m.fom,
        hits: m.hits,
      })),
      demand,
      runs,
      ms: performance.now() - t0,
    },
  });
}

/** Everything the page needs to narrate one cell's trip through the forest. */
function explainCell(cell: number) {
  const e = need(engine, "engine");
  const f = need(forest, "model");
  const X = e.buildFeatures(Int32Array.of(cell), true);

  const traces = explain(f, X);
  const margins = new Float32Array(traces.length);
  traces.forEach((t, i) => (margins[i] = t.margin));
  const tp = predict(f, X, 1)[0];
  const topTrees = traces
    .map((t) => ({ tree: t.tree, leaf: t.leaf }))
    .sort((a, b) => Math.abs(b.leaf) - Math.abs(a.leaf))
    .slice(0, 12);

  const direction = traces[traces.length - 1].margin >= 0 ? 1 : -1;
  let key = traces[0];
  for (const t of traces) if (t.leaf * direction > key.leaf * direction) key = t;

  const payload: ExplainPayload = {
    cell,
    features: Array.from(X),
    tp,
    intercept: f.intercept,
    margins,
    firstPath: traces[0].path,
    firstLeaf: traces[0].leaf,
    keyTree: { index: key.tree, path: key.path, leaf: key.leaf },
    topTrees,
  };
  post({ type: "explain", payload });
}

ctx.onmessage = async (ev: MessageEvent<SimRequest>) => {
  const msg = ev.data;
  try {
    switch (msg.type) {
      case "load":
        await load(msg.tileId, msg.withReference);
        break;
      case "params":
        params = { ...params, ...msg.params };
        if (engine) engine.params = params;
        if (testEngine) testEngine.params = params;
        break;
      case "reset":
        reset(msg.base);
        break;
      case "step":
        step(msg.demand, msg.seed, msg.label);
        break;
      case "ensemble":
        ensemble(msg.demands, msg.runs, msg.seed);
        break;
      case "validate":
        validate(msg.demand, msg.runs, msg.seed);
        break;
      case "explain":
        explainCell(msg.cell);
        break;
    }
  } catch (err) {
    post({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
