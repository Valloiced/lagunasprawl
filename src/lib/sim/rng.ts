/**
 * Seeded randomness for the allocation draw.
 *
 * The pipeline draws from NumPy's PCG64. That stream cannot be reproduced in a
 * browser, so an individual draw here will not match an individual draw there -
 * which is a property of Monte Carlo allocation, not a defect: the pipeline's
 * own 25 runs do not match each other either. What must match, and does, is the
 * rule being sampled and the weights it samples from. Compare ensembles, or
 * switch the page to its deterministic "top-weight" mode.
 */

/** xoshiro128** - small, fast, and good enough for allocation weights. */
export class Rng {
  private s0: number;
  private s1: number;
  private s2: number;
  private s3: number;

  constructor(seed: number) {
    // splitmix32 to spread a single integer seed over the whole state
    let x = seed >>> 0;
    const next = () => {
      x = (x + 0x9e3779b9) >>> 0;
      let z = x;
      z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
      z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
      return (z ^ (z >>> 15)) >>> 0;
    };
    this.s0 = next();
    this.s1 = next();
    this.s2 = next();
    this.s3 = next();
  }

  private nextUint(): number {
    const r = Math.imul(this.s1, 5);
    const result = Math.imul((r << 7) | (r >>> 25), 9) >>> 0;
    const t = (this.s1 << 9) >>> 0;
    this.s2 ^= this.s0;
    this.s3 ^= this.s1;
    this.s1 ^= this.s2;
    this.s0 ^= this.s3;
    this.s2 ^= t;
    this.s3 = ((this.s3 << 11) | (this.s3 >>> 21)) >>> 0;
    return result;
  }

  /** Uniform in (0, 1) - never exactly 0, so log() is always finite. */
  float(): number {
    return (this.nextUint() + 0.5) / 4294967296;
  }

  /** Standard Gumbel(0, 1). */
  gumbel(): number {
    return -Math.log(-Math.log(this.float()));
  }
}

/**
 * Weighted sampling without replacement, Efraimidis-Spirakis via Gumbel top-k -
 * the same trick as `weighted_sample` in s12_forecast.py. Drawing key
 * log(w) + Gumbel and taking the k largest is exactly equivalent to k
 * successive roulette draws, at O(n) instead of O(k*n).
 *
 * Returns indices into `weights`; zero-weight entries are never selected.
 */
export function weightedSample(
  rng: Rng,
  weights: Float64Array,
  k: number,
  keysOut?: Float64Array
): Int32Array {
  const n = weights.length;
  const keys = keysOut ?? new Float64Array(n);
  let eligible = 0;
  for (let i = 0; i < n; i++) {
    if (weights[i] > 0) {
      keys[i] = Math.log(weights[i]) + rng.gumbel();
      eligible++;
    } else {
      keys[i] = -Infinity;
    }
  }
  const take = Math.min(k, eligible);
  if (take <= 0) return new Int32Array(0);

  // partial selection: index sort by key, descending, first `take` only
  const idx = new Int32Array(n);
  for (let i = 0; i < n; i++) idx[i] = i;
  quickselectDesc(idx, keys, 0, n - 1, take - 1);
  const out = idx.slice(0, take);
  out.sort((a, b) => keys[b] - keys[a]);
  return out;
}

/** Hoare selection so only the top `k` region is ordered - argpartition. */
function quickselectDesc(
  idx: Int32Array,
  keys: Float64Array,
  lo: number,
  hi: number,
  k: number
) {
  while (lo < hi) {
    const pivot = keys[idx[(lo + hi) >> 1]];
    let i = lo;
    let j = hi;
    while (i <= j) {
      while (keys[idx[i]] > pivot) i++;
      while (keys[idx[j]] < pivot) j--;
      if (i <= j) {
        const t = idx[i];
        idx[i] = idx[j];
        idx[j] = t;
        i++;
        j--;
      }
    }
    if (k <= j) hi = j;
    else if (k >= i) lo = i;
    else return;
  }
}

/** Deterministic counterpart: the `k` heaviest cells, no draw at all. */
export function topK(weights: Float64Array, k: number): Int32Array {
  const n = weights.length;
  const keys = new Float64Array(n);
  let eligible = 0;
  for (let i = 0; i < n; i++) {
    keys[i] = weights[i] > 0 ? weights[i] : -Infinity;
    if (weights[i] > 0) eligible++;
  }
  const take = Math.min(k, eligible);
  if (take <= 0) return new Int32Array(0);
  const idx = new Int32Array(n);
  for (let i = 0; i < n; i++) idx[i] = i;
  quickselectDesc(idx, keys, 0, n - 1, take - 1);
  const out = idx.slice(0, take);
  out.sort((a, b) => keys[b] - keys[a]);
  return out;
}
