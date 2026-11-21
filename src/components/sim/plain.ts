/**
 * The words the simulation page uses, in one place.
 *
 * The engine speaks in transition potential, dist_builtup and nb5. A thesis
 * panel does not, and neither should the person presenting to it. Everything
 * the page shows a human goes through here, so the vocabulary stays consistent
 * from the first step to the last and the technical name is always one
 * expander away rather than on the main screen.
 */

export interface Factor {
  key: string;
  /** what a planner would call it */
  label: string;
  /** one-line reason the model might care */
  why: string;
  group: "Development nearby" | "Access" | "Land" | "People and activity";
  format: (v: number) => string;
}

const metres = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(1)} km` : `${Math.round(v)} m`;

/** Order matches the model's input columns; do not reorder. */
export const FACTORS: Factor[] = [
  {
    key: "elevation",
    label: "Elevation",
    why: "High ground is harder and costlier to build on",
    group: "Land",
    format: (v) => `${Math.round(v)} m above sea level`,
  },
  {
    key: "slope",
    label: "Slope",
    why: "Steep land is rarely developed",
    group: "Land",
    format: (v) => `${v.toFixed(1)}° ${v < 3 ? "(flat)" : v < 8 ? "(gentle)" : "(steep)"}`,
  },
  {
    key: "dist_roads",
    label: "Distance to a major road",
    why: "Access drives development",
    group: "Access",
    format: metres,
  },
  {
    key: "dist_rivers",
    label: "Distance to a river",
    why: "Rivers attract settlement but also flood",
    group: "Access",
    format: metres,
  },
  {
    key: "dist_peza",
    label: "Distance to an economic zone",
    why: "PEZA zones pull in jobs and housing",
    group: "Access",
    format: metres,
  },
  {
    key: "dist_centers",
    label: "Distance to a town centre",
    why: "Towns grow outward from their centres",
    group: "Access",
    format: metres,
  },
  {
    key: "pop",
    label: "Population",
    why: "More people nearby, more demand for land",
    group: "People and activity",
    // WorldPop 100 m "people per pixel", bilinear-resampled to 10 m by
    // s02_preprocess.py - resampling keeps the value, so it stays per hectare
    format: (v) => `${v.toFixed(0)} people per hectare`,
  },
  {
    key: "viirs",
    label: "Night-time lights",
    why: "Brightness from space tracks economic activity",
    group: "People and activity",
    // VIIRS annual radiance, nW/cm2/sr at 500 m
    format: (v) => `${v.toFixed(1)} ${v < 5 ? "(dark)" : v < 20 ? "(lit up)" : "(bright)"}`,
  },
  {
    key: "dist_builtup",
    label: "Distance to existing buildings",
    why: "New development usually attaches to old",
    group: "Development nearby",
    format: metres,
  },
  {
    key: "nb3",
    label: "Buildings right next to it",
    // uniform_filter(size=3) averages the 3 x 3 block including the cell itself
    why: "Share of the 30 × 30 m block around it already built",
    group: "Development nearby",
    format: (v) => `${Math.round(v * 100)}% of the 30 × 30 m block`,
  },
  {
    key: "nb5",
    label: "Buildings in the wider block",
    why: "Share of the 50 × 50 m block around it already built",
    group: "Development nearby",
    format: (v) => `${Math.round(v * 100)}% of the 50 × 50 m block`,
  },
];

/** How likely, in words a room can say out loud. */
export function likelihoodWord(p: number): string {
  if (p >= 0.8) return "Very likely";
  if (p >= 0.6) return "Likely";
  if (p >= 0.4) return "Possible";
  if (p >= 0.2) return "Unlikely";
  return "Very unlikely";
}

export function pct(p: number, digits = 0): string {
  return `${(p * 100).toFixed(digits)}%`;
}

export function km2(cells: number, digits = 1): string {
  return `${(cells * 1e-4).toFixed(digits)} km²`;
}

export function count(n: number): string {
  return n.toLocaleString();
}

/**
 * A tree split, as a question a person would ask.
 * `x < threshold` is the branch the model takes left.
 */
export function splitQuestion(featureIndex: number, threshold: number): string {
  const f = FACTORS[featureIndex];
  if (!f) return "Unknown factor";
  switch (f.key) {
    case "dist_builtup":
      return `Is it within ${metres(threshold)} of existing buildings?`;
    case "dist_roads":
      return `Is it within ${metres(threshold)} of a major road?`;
    case "dist_rivers":
      return `Is it within ${metres(threshold)} of a river?`;
    case "dist_peza":
      return `Is it within ${metres(threshold)} of an economic zone?`;
    case "dist_centers":
      return `Is it within ${metres(threshold)} of a town centre?`;
    case "elevation":
      return `Is it lower than ${Math.round(threshold)} m?`;
    case "slope":
      return `Is the slope under ${threshold.toFixed(1)}°?`;
    case "pop":
      return `Are there fewer than ${threshold.toFixed(0)} people per hectare?`;
    case "viirs":
      return `Is it dimmer than ${threshold.toFixed(1)} at night?`;
    case "nb3":
      return `Is less than ${Math.round(threshold * 100)}% of the 30 m block around it built?`;
    case "nb5":
      return `Is less than ${Math.round(threshold * 100)}% of the 50 m block around it built?`;
    default:
      return `Is ${f.label.toLowerCase()} below ${threshold.toFixed(2)}?`;
  }
}
