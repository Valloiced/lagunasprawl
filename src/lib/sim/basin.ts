/**
 * Loader for the basin-wide animation written by src/s18_basin_anim.py.
 *
 * The browser cannot re-run the model over the whole watershed - 8 driver
 * bands across 70.2 M cells is 2.24 GB and one prediction pass is 3.96 billion
 * tree traversals - so the basin view plays back the published run's own
 * allocation instead. The order is not decorative: s12_forecast.py assembles
 * its most-likely map by converting the top-`demand` cells by ensemble
 * conversion frequency, so replaying in descending frequency is the order that
 * map was actually built in.
 *
 * The picture is 40 m per pixel. Every number the page prints is counted at
 * the native 10 m resolution and shipped per frame alongside it.
 */
import { fetchBinary } from "./format";

const MAGIC_BASIN = 0x4142534c; // "LSBA" little-endian

export const BASIN_STATE = {
  outside: 0,
  water: 1,
  built2025: 2,
  never: 3,
  step1: 4,
  step2: 5,
} as const;

export interface BasinAnimation {
  width: number;
  height: number;
  downsample: number;
  frames: number;
  state: Uint8Array;
  frame: Uint8Array;
  municipality: Uint8Array;
  /** pixel indices converting on each frame, per step */
  buckets1: Int32Array[];
  buckets2: Int32Array[];
}

export async function loadBasinAnimation(url: string): Promise<BasinAnimation> {
  const buf = await fetchBinary(url);
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== MAGIC_BASIN) throw new Error("not a basin animation");
  const width = dv.getUint32(8, true);
  const height = dv.getUint32(12, true);
  const downsample = dv.getUint32(16, true);
  const frames = dv.getUint32(20, true);

  const n = width * height;
  let off = 24;
  const state = new Uint8Array(buf, off, n);
  off += n;
  const frame = new Uint8Array(buf, off, n);
  off += n;
  const municipality = new Uint8Array(buf, off, n);

  // bucket pixels by the frame they light up on, so each animation tick paints
  // a couple of thousand pixels instead of rescanning four million
  const buckets1 = bucketise(state, frame, BASIN_STATE.step1, frames);
  const buckets2 = bucketise(state, frame, BASIN_STATE.step2, frames);

  return { width, height, downsample, frames, state, frame, municipality, buckets1, buckets2 };
}

function bucketise(
  state: Uint8Array,
  frame: Uint8Array,
  want: number,
  frames: number
): Int32Array[] {
  const counts = new Int32Array(frames);
  for (let i = 0; i < state.length; i++) if (state[i] === want) counts[frame[i]]++;
  const out: Int32Array[] = [];
  for (let f = 0; f < frames; f++) out.push(new Int32Array(counts[f]));
  const fill = new Int32Array(frames);
  for (let i = 0; i < state.length; i++) {
    if (state[i] !== want) continue;
    const f = frame[i];
    out[f][fill[f]++] = i;
  }
  return out;
}

/** Palette for the basin view, kept distinct from the window view's ramps. */
export const BASIN_COLORS = {
  outside: [0, 0, 0, 0],
  water: [41, 128, 185, 90],
  built2025: [90, 90, 100, 190],
  never: [0, 0, 0, 0],
  step1: [250, 204, 21, 255],
  step2: [234, 88, 12, 255],
  // a conversion flashes bright for a few frames before settling
  flash: [255, 255, 255, 255],
} as const;
