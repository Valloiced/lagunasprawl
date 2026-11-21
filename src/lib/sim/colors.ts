/** Colour ramps for the simulation grids. All return packed [r, g, b]. */
import { LULC_CLASSES } from "@/data/constants";

export type Rgb = [number, number, number];

const CLASS_RGB = new Map<number, Rgb>(
  LULC_CLASSES.map((c) => [
    c.id,
    [
      parseInt(c.color.slice(1, 3), 16),
      parseInt(c.color.slice(3, 5), 16),
      parseInt(c.color.slice(5, 7), 16),
    ] as Rgb,
  ])
);

export const NODATA: Rgb = [244, 244, 245];

export function classColor(id: number): Rgb {
  return CLASS_RGB.get(id) ?? NODATA;
}

function lerp(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function ramp(stops: Rgb[], t: number): Rgb {
  if (!(t > 0)) return stops[0];
  if (t >= 1) return stops[stops.length - 1];
  const x = t * (stops.length - 1);
  const i = Math.floor(x);
  return lerp(stops[i], stops[i + 1], x - i);
}

/** Sequential ramp for transition potential and probability surfaces. */
const HEAT: Rgb[] = [
  [253, 245, 230],
  [253, 212, 158],
  [253, 160, 92],
  [240, 105, 60],
  [204, 44, 44],
  [128, 12, 42],
];

export function heat(t: number): Rgb {
  return ramp(HEAT, t);
}

/** Cool ramp, for driver layers, so they never read as "risk". */
const COOL: Rgb[] = [
  [247, 251, 255],
  [198, 219, 239],
  [107, 174, 214],
  [33, 113, 181],
  [8, 48, 107],
];

export function cool(t: number): Rgb {
  return ramp(COOL, t);
}

/** Terrain-ish ramp for elevation and slope. */
const TERRAIN: Rgb[] = [
  [237, 248, 233],
  [199, 233, 192],
  [161, 217, 155],
  [199, 184, 120],
  [186, 142, 96],
  [140, 107, 84],
];

export function terrain(t: number): Rgb {
  return ramp(TERRAIN, t);
}

export const AGREEMENT = {
  hit: [22, 163, 74] as Rgb,
  miss: [37, 99, 235] as Rgb,
  falseAlarm: [220, 38, 38] as Rgb,
  correctPersistence: [228, 228, 231] as Rgb,
};

export const NEW_BUILT: Rgb = [250, 204, 21];
export const EXISTING_BUILT: Rgb = [113, 113, 122];
export const CONSTRAINED: Rgb = [196, 181, 253];

/**
 * Percentile stretch for display only. Driver layers are wildly different in
 * range (metres, persons, radiance) and a linear stretch on the raw min/max
 * leaves most of them flat, so clip the tails before ramping.
 */
export function percentileRange(
  values: Float32Array,
  lowPct = 2,
  highPct = 98
): [number, number] {
  const finite: number[] = [];
  const stride = Math.max(1, Math.floor(values.length / 20000));
  for (let i = 0; i < values.length; i += stride) {
    if (Number.isFinite(values[i])) finite.push(values[i]);
  }
  if (!finite.length) return [0, 1];
  finite.sort((a, b) => a - b);
  const lo = finite[Math.floor((finite.length - 1) * (lowPct / 100))];
  const hi = finite[Math.floor((finite.length - 1) * (highPct / 100))];
  return hi > lo ? [lo, hi] : [lo, lo + 1];
}
