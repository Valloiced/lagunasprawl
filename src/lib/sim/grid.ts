/**
 * The two neighbourhood operators the CA depends on, ported to match SciPy.
 *
 * `distance_transform_edt` and `uniform_filter` are what make this a cellular
 * automaton rather than a static suitability ranking: after every step they are
 * recomputed from the new built-up state, so the model's next prediction sees
 * the growth it just placed. Both are exact ports - stage 17's self-test
 * rebuilds each tile's whole transition-potential surface through these
 * functions and diffs it against the pipeline's own raster.
 */

/**
 * A finite stand-in for "no source in this row". Infinity would make the
 * parabola intersections evaluate Inf - Inf = NaN, and every comparison
 * against NaN is false, which silently corrupts the lower envelope.
 */
const NO_SOURCE = 1e20;

/**
 * Exact squared Euclidean distance transform (Felzenszwalb & Huttenlocher
 * 2012), the same algorithm SciPy uses. `f` is the cost row: 0 on a source
 * cell, NO_SOURCE elsewhere. Result is in squared cell units.
 */
function edt1d(f: Float64Array, d: Float64Array, v: Int32Array, z: Float64Array) {
  const n = f.length;
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s =
      (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dx = q - v[k];
    d[q] = dx * dx + f[v[k]];
  }
}

/**
 * Euclidean distance from every cell to the nearest `true` in `src`, in cells.
 *
 * Kept at double precision: the pipeline does `edt(...) * 10` in float64 and
 * only then casts to float32, so rounding here first would cost a low bit on
 * every cell. With an empty `src` every cell comes back at 1e10, which the
 * caller mins away against the precomputed outside-the-tile distance.
 */
export function distanceTransform(
  src: Uint8Array,
  w: number,
  h: number,
  out: Float64Array = new Float64Array(w * h)
): Float64Array {
  const n = Math.max(w, h);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  const tmp = new Float64Array(w * h);

  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = src[y * w + x] ? 0 : NO_SOURCE;
    edt1d(f.subarray(0, h) as Float64Array, d, v, z);
    for (let y = 0; y < h; y++) tmp[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) f[x] = tmp[row + x];
    edt1d(f.subarray(0, w) as Float64Array, d, v, z);
    for (let x = 0; x < w; x++) out[row + x] = Math.sqrt(d[x]);
  }
  return out;
}

/** Reflect index into [0, n) the way SciPy's default `mode="reflect"` does. */
function reflect(i: number, n: number): number {
  while (i < 0 || i >= n) {
    if (i < 0) i = -i - 1;
    if (i >= n) i = 2 * n - i - 1;
  }
  return i;
}

/**
 * Separable box mean over a `size` x `size` window, matching
 * `scipy.ndimage.uniform_filter(a, size)` including its reflect boundary.
 * Only the tile core is ever read back, and the core sits 32 cells inside the
 * exported grid, so the boundary rule never touches a cell that matters - it is
 * matched anyway so the self-test can compare the full window.
 */
export function uniformFilter(
  src: Float32Array,
  w: number,
  h: number,
  size: number,
  out: Float32Array = new Float32Array(w * h)
): Float32Array {
  const half = (size - 1) >> 1;
  const tmp = new Float32Array(w * h);

  // Axis order and the final divide both matter. SciPy filters axis 0 then
  // axis 1 and divides the window sum by `size`; multiplying by a precomputed
  // 1/size instead moves nb5 by one ulp on a few thousand cells, and a single
  // ulp either side of a tree's split threshold sends that cell down the other
  // branch. The tile self-test catches exactly this.
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let acc = 0;
      for (let k = -half; k <= half; k++) acc += src[reflect(y + k, h) * w + x];
      tmp[y * w + x] = acc / size;
    }
  }
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let k = -half; k <= half; k++) acc += tmp[row + reflect(x + k, w)];
      out[row + x] = acc / size;
    }
  }
  return out;
}
