/**
 * The CA engine, ported from the pipeline so the browser runs the real thing.
 *
 * Two modes, because the thesis runs two different simulations and the
 * difference between them is the point:
 *
 *   forecast    s12_forecast.py. Iterative. Transition potential is recomputed
 *               from the *current* built-up state at every step, so the cells
 *               converted in 2030 change the neighbourhood densities and the
 *               distance-to-built-up that decide 2035. This is the cellular
 *               automaton.
 *
 *   validation  s07_ca_validate.py. One shot, from the observed 2020 state,
 *               against a frozen transition-potential surface, scored on the
 *               observed 2025 map. No feedback - the run is a single draw, so
 *               it measures the transition model rather than the automaton.
 *
 * Everything else is shared: candidates are non-built, developable, in-basin
 * cells with finite drivers; weights are tp^SHARPEN with a floor; allocation is
 * roulette without replacement; built-up never reverts.
 */
import { predict } from "./forest";
import { distanceTransform, uniformFilter } from "./grid";
import { Rng, topK, weightedSample } from "./rng";
import type { PackedForest, Tile } from "./format";

export const BUILT_UP_CLASS = 2;
export const N_FEATURES = 11;
const RES_M = 10;

export type Base = "2025" | "2020";

export interface EngineParams {
  /** roulette exponent; the pipeline froze this at 5 after s07 */
  sharpen: number;
  /** cells scoring below this contribute no weight */
  scoreFloor: number;
  /** candidates below this are pruned from the active set entirely */
  tpFloor: number;
  /** "protection" swaps in the scenario constraint layer */
  constraint: "constraint" | "constraint_protection";
  /** freeze dist_builtup/nb3/nb5 at their base-state values - turns the CA
   *  into a static suitability ranking, which is the comparison that shows
   *  what the automaton is contributing */
  freezeDynamic: boolean;
  /** replace the roulette draw with a deterministic top-weight pick */
  deterministic: boolean;
}

export const DEFAULT_PARAMS: EngineParams = {
  sharpen: 5,
  scoreFloor: 0.01,
  tpFloor: 0.05,
  constraint: "constraint",
  freezeDynamic: false,
  deterministic: false,
};

export interface StepResult {
  /** flat grid indices converted this step, in draw order */
  picks: Int32Array;
  demand: number;
  allocated: number;
  /** transition potential over the active set at the start of this step */
  activeTp: Float32Array;
  builtCells: number;
}

export interface EnsembleResult {
  /** per-cell conversion frequency over the ensemble, full grid */
  frequency: Float32Array;
  /** modal map: the top-`demand` cells by frequency, as a built-up mask */
  modal: Uint8Array;
  runs: number;
  demandPerStep: number[];
}

export class CaEngine {
  readonly tile: Tile;
  readonly forest: PackedForest;
  readonly width: number;
  readonly height: number;
  readonly size: number;

  params: EngineParams = { ...DEFAULT_PARAMS };
  base: Base = "2025";

  /** current built-up state over the whole padded grid */
  built!: Uint8Array;
  /** flat indices eligible to convert, all inside the core */
  activeIdx!: Int32Array;
  /** feature matrix for the active set; static columns filled once */
  private X!: Float32Array;
  /** cells of the active set already converted in this run */
  private converted!: Uint8Array;
  private weights!: Float64Array;
  private tpActive!: Float32Array;
  private distIn!: Float64Array;
  private builtF32!: Float32Array;
  private nb3!: Float32Array;
  private nb5!: Float32Array;
  private distOutside!: Float32Array;

  constructor(tile: Tile, forest: PackedForest) {
    this.tile = tile;
    this.forest = forest;
    this.width = tile.width;
    this.height = tile.height;
    this.size = tile.width * tile.height;
  }

  private band(name: string): Float32Array {
    const b = this.tile.bands[name];
    if (!b) throw new Error(`tile is missing band "${name}"`);
    return b as Float32Array;
  }

  private byteBand(name: string): Uint8Array {
    const b = this.tile.bands[name];
    if (!b) throw new Error(`tile is missing band "${name}"`);
    return b as Uint8Array;
  }

  /** True where a cell may convert: the pipeline's candidate test, verbatim. */
  candidateMask(base: Base = this.base): Uint8Array {
    const { pad, core, width } = this.tile;
    const lulc = this.byteBand(`lulc_${base}`);
    const constraint = this.byteBand(this.params.constraint);
    const mask = this.byteBand("mask");
    const finite = this.byteBand(`finite_${base}`);
    const out = new Uint8Array(this.size);
    for (let y = pad; y < pad + core; y++) {
      for (let x = pad; x < pad + core; x++) {
        const i = y * width + x;
        out[i] =
          lulc[i] !== BUILT_UP_CLASS &&
          lulc[i] > 0 &&
          constraint[i] > 0 &&
          mask[i] > 0 &&
          finite[i] > 0
            ? 1
            : 0;
      }
    }
    return out;
  }

  /**
   * Reset to a base year and build the active set.
   *
   * Mirrors `build_active_set` in s12_forecast.py: predict transition potential
   * from the base state over every candidate, then drop the ones below tpFloor.
   * At roulette weight tp^5 those cells sit more than five orders of magnitude
   * below a median candidate, so pruning them changes nothing and halves the
   * per-step prediction cost.
   */
  reset(base: Base = this.base): { candidates: number; active: number; tpFull: Float32Array } {
    this.base = base;
    const lulc = this.byteBand(`lulc_${base}`);
    this.built = new Uint8Array(this.size);
    for (let i = 0; i < this.size; i++) this.built[i] = lulc[i] === BUILT_UP_CLASS ? 1 : 0;

    this.distOutside = this.band(`dist_outside_${base}`);
    this.builtF32 = new Float32Array(this.size);
    this.distIn = new Float64Array(this.size);
    this.nb3 = new Float32Array(this.size);
    this.nb5 = new Float32Array(this.size);

    const cand = this.candidateMask(base);
    const candIdx: number[] = [];
    for (let i = 0; i < this.size; i++) if (cand[i]) candIdx.push(i);

    // full-grid TP, for the heat map and the cell inspector
    const allIdx = Int32Array.from(candIdx);
    const X = this.buildFeatures(allIdx, true);
    const tp = predict(this.forest, X, allIdx.length);
    const tpFull = new Float32Array(this.size);
    for (let i = 0; i < allIdx.length; i++) tpFull[allIdx[i]] = tp[i];

    const keep: number[] = [];
    for (let i = 0; i < allIdx.length; i++) {
      if (tp[i] >= this.params.tpFloor) keep.push(allIdx[i]);
    }
    this.activeIdx = Int32Array.from(keep);
    this.X = this.buildFeatures(this.activeIdx, true);
    this.converted = new Uint8Array(this.activeIdx.length);
    this.weights = new Float64Array(this.activeIdx.length);
    this.tpActive = new Float32Array(this.activeIdx.length);

    return { candidates: allIdx.length, active: this.activeIdx.length, tpFull };
  }

  /**
   * Assemble the model's input matrix for `idx`.
   *
   * Column order is fixed by s06_transitions.py and must not be reordered:
   * elevation, slope, dist_roads, dist_rivers, dist_peza, dist_centers, pop,
   * viirs, dist_builtup, nb3, nb5.
   */
  buildFeatures(idx: Int32Array, withStatics: boolean, into?: Float32Array): Float32Array {
    const n = idx.length;
    const X = into ?? new Float32Array(n * N_FEATURES);
    if (withStatics) {
      const statics = [
        this.band("elevation"),
        this.band("slope"),
        this.band("dist_roads"),
        this.band("dist_rivers"),
        this.band("dist_peza"),
        this.band("dist_centers"),
        this.band("pop"),
        this.band(this.base === "2025" ? "viirs_forecast" : "viirs_validation"),
      ];
      for (let c = 0; c < statics.length; c++) {
        const src = statics[c];
        for (let i = 0; i < n; i++) X[i * N_FEATURES + c] = src[idx[i]];
      }
    }
    this.writeDynamic(idx, X);
    return X;
  }

  /**
   * Recompute the three state-dependent drivers and write them into `X`.
   *
   * dist_builtup is min(distance to built-up outside this window, distance to
   * built-up inside it). Cells outside never convert during a tile run, so the
   * outside half is a constant the exporter precomputed at full-basin extent;
   * conversions inside can only shorten the distance. The min of the two is the
   * global transform, exactly.
   */
  private writeDynamic(idx: Int32Array, X: Float32Array) {
    const n = idx.length;
    for (let i = 0; i < this.size; i++) this.builtF32[i] = this.built[i];
    distanceTransform(this.built, this.width, this.height, this.distIn);
    uniformFilter(this.builtF32, this.width, this.height, 3, this.nb3);
    uniformFilter(this.builtF32, this.width, this.height, 5, this.nb5);

    for (let i = 0; i < n; i++) {
      const g = idx[i];
      const row = i * N_FEATURES;
      const dIn = this.distIn[g] * RES_M;
      const dOut = this.distOutside[g];
      X[row + 8] = Math.fround(dIn < dOut ? dIn : dOut);
      X[row + 9] = this.nb3[g];
      X[row + 10] = this.nb5[g];
    }
  }

  /** Transition potential over the active set for the current state. */
  private predictActive(): Float32Array {
    if (!this.params.freezeDynamic) {
      this.writeDynamic(this.activeIdx, this.X);
    }
    predict(this.forest, this.X, this.activeIdx.length, this.tpActive);
    return this.tpActive;
  }

  /**
   * Transition potential for the current built-up state, without drawing.
   *
   * This is the re-prediction the next `step` would open with, run early so
   * the page can show the neighbourhood update the moment a step finishes -
   * the cellular-automaton feedback, made visible. It changes nothing: the
   * next step recomputes the same surface from the same state.
   */
  rescore(): Float32Array {
    return this.predictActive().slice();
  }

  /**
   * One allocation step. Mutates the built-up state.
   *
   * `ca_step` in s12_forecast.py: recompute the dynamic drivers, re-predict,
   * weight by tp^sharpen with everything under scoreFloor zeroed and everything
   * already converted zeroed, then draw `demand` cells without replacement.
   */
  step(demand: number, rng: Rng): StepResult {
    const tp = this.predictActive();
    const { sharpen, scoreFloor, deterministic } = this.params;
    for (let i = 0; i < tp.length; i++) {
      this.weights[i] = this.converted[i] || tp[i] < scoreFloor ? 0 : Math.pow(tp[i], sharpen);
    }
    const picksLocal = deterministic
      ? topK(this.weights, demand)
      : weightedSample(rng, this.weights, demand);

    const picks = new Int32Array(picksLocal.length);
    for (let i = 0; i < picksLocal.length; i++) {
      const local = picksLocal[i];
      const g = this.activeIdx[local];
      this.built[g] = 1;
      this.converted[local] = 1;
      picks[i] = g;
    }
    // count the core only - the 32-cell pad exists to make the neighbourhood
    // filters exact, not to be reported as area
    let builtCells = 0;
    const { pad, core, width } = this.tile;
    for (let y = pad; y < pad + core; y++) {
      for (let x = pad; x < pad + core; x++) builtCells += this.built[y * width + x];
    }
    return {
      picks,
      demand,
      allocated: picks.length,
      activeTp: this.tpActive.slice(),
      builtCells,
    };
  }

  /**
   * One shot against a frozen potential surface - s07_ca_validate.py.
   *
   * No re-prediction and no feedback: the 2020 potential surface is scored
   * once, the whole 5-year demand is drawn from it in a single draw, and the
   * result is compared against the observed 2025 map.
   */
  validationDraw(tp: Float32Array, demand: number, rng: Rng): Int32Array {
    const cand = this.candidateMask("2020");
    const idx: number[] = [];
    for (let i = 0; i < this.size; i++) {
      if (cand[i] && tp[i] >= this.params.scoreFloor) idx.push(i);
    }
    const w = new Float64Array(idx.length);
    for (let i = 0; i < idx.length; i++) w[i] = Math.pow(tp[idx[i]], this.params.sharpen);
    const picksLocal = this.params.deterministic
      ? topK(w, demand)
      : weightedSample(rng, w, demand);
    const out = new Int32Array(picksLocal.length);
    for (let i = 0; i < picksLocal.length; i++) out[i] = idx[picksLocal[i]];
    return out;
  }
}

export interface FidelityReport {
  cells: number;
  maxAbsError: number;
  meanAbsError: number;
  p99AbsError: number;
}

/**
 * Prove, in the browser, that this engine reproduces the pipeline's own output.
 *
 * `tpFull` is what the page just computed from the tile's driver bands; the
 * reference band is the corresponding window of tp_2025_net.tif, the raster
 * s12_forecast.py wrote during the published run. Agreement to float32 rounding
 * means the feature assembly, the tree walk and the driver values all match -
 * there is no room left for the page to be showing a mock-up. The same check
 * runs on the Python side in s17_sim_tile.py --selftest-only.
 */
export function fidelityReport(
  tpFull: Float32Array,
  reference: Float32Array,
  candidates: Uint8Array
): FidelityReport {
  const errs: number[] = [];
  let sum = 0;
  let max = 0;
  for (let i = 0; i < tpFull.length; i++) {
    if (!candidates[i]) continue;
    const e = Math.abs(tpFull[i] - reference[i]);
    errs.push(e);
    sum += e;
    if (e > max) max = e;
  }
  errs.sort((a, b) => a - b);
  return {
    cells: errs.length,
    maxAbsError: max,
    meanAbsError: errs.length ? sum / errs.length : 0,
    p99AbsError: errs.length ? errs[Math.min(errs.length - 1, Math.floor(errs.length * 0.99))] : 0,
  };
}

/** Figure of Merit: hits / (hits + misses + false alarms), Pontius et al. */
export function figureOfMerit(
  observedChange: Uint8Array,
  simulatedChange: Uint8Array
): { fom: number; hits: number; misses: number; falseAlarms: number } {
  let hits = 0;
  let misses = 0;
  let falseAlarms = 0;
  for (let i = 0; i < observedChange.length; i++) {
    const o = observedChange[i];
    const s = simulatedChange[i];
    if (o && s) hits++;
    else if (o) misses++;
    else if (s) falseAlarms++;
  }
  return {
    fom: hits / Math.max(hits + misses + falseAlarms, 1),
    hits,
    misses,
    falseAlarms,
  };
}

/**
 * Figure of Merit at progressively coarser resolutions (Pontius et al. 2008).
 *
 * Counts of observed and simulated change are summed into f x f blocks and hits
 * become min(observed, simulated), so a conversion predicted one cell away from
 * where it happened stops being both a miss and a false alarm once the block is
 * large enough to hold both. FoM rising with aggregation is the honest claim for
 * a 10 m land-change model: right neighbourhood, wrong parcel.
 */
export function fomMultiResolution(
  observedChange: Uint8Array,
  simulatedChange: Uint8Array,
  width: number,
  height: number,
  factors: number[]
) {
  return factors.map((f) => {
    if (f === 1) {
      const r = figureOfMerit(observedChange, simulatedChange);
      return { resolutionM: RES_M, ...r };
    }
    const bw = Math.ceil(width / f);
    const bh = Math.ceil(height / f);
    const o = new Int32Array(bw * bh);
    const s = new Int32Array(bw * bh);
    for (let y = 0; y < height; y++) {
      const by = ((y / f) | 0) * bw;
      for (let x = 0; x < width; x++) {
        const b = by + ((x / f) | 0);
        o[b] += observedChange[y * width + x];
        s[b] += simulatedChange[y * width + x];
      }
    }
    let hits = 0;
    let obs = 0;
    let sim = 0;
    for (let i = 0; i < o.length; i++) {
      hits += Math.min(o[i], s[i]);
      obs += o[i];
      sim += s[i];
    }
    const misses = obs - hits;
    const falseAlarms = sim - hits;
    return {
      resolutionM: f * RES_M,
      fom: hits / Math.max(hits + misses + falseAlarms, 1),
      hits,
      misses,
      falseAlarms,
    };
  });
}

/**
 * FoM expected if the same number of cells were allocated at random.
 *
 * Under random allocation expected hits are demand * prevalence; the ratio of
 * the achieved FoM to this is the honest statement of what the transition model
 * contributes over chance.
 */
export function fomRandomBaseline(
  nCandidates: number,
  nObserved: number,
  nAllocated: number
): number {
  if (!nCandidates) return 0;
  const hits = nAllocated * (nObserved / nCandidates);
  return hits / Math.max(nObserved + nAllocated - hits, 1);
}
