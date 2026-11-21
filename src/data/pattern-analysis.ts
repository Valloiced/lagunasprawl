// Spatial pattern recognition for the /patterns page.
// Shares, landscape metrics and per-municipality typologies all come from the
// Landscape Expansion Index run (src/s15_lei.py, Liu et al. 2010). The class
// descriptions below are editorial; every number is generated.
export {
  PATTERN_INTERVALS,
  LANDSCAPE_METRICS,
  MUNICIPAL_PATTERNS,
  PATTERN_IS_MOCK,
  LEI_BUFFER_M,
} from "./generated/patterns.generated";
export type {
  IntervalPatternShares,
  LandscapeMetricsYear,
  MunicipalPatternReal,
  GrowthPatternId,
} from "./generated/patterns.generated";

import type { GrowthPatternId } from "./generated/patterns.generated";

export interface GrowthPattern {
  id: GrowthPatternId;
  label: string;
  leiRange: string;
  color: string;
  description: string;
  planningNote: string;
}

export const GROWTH_PATTERNS: GrowthPattern[] = [
  {
    id: "infill",
    label: "Infill",
    leiRange: "LEI > 50",
    color: "#6366f1",
    description:
      "New built-up cells that fill gaps mostly surrounded by existing urban land. Densifies the existing footprint without extending it.",
    planningNote:
      "Generally the most efficient pattern — uses existing roads and services. High infill share indicates consolidation, not sprawl.",
  },
  {
    id: "edge",
    label: "Edge expansion",
    leiRange: "0 < LEI ≤ 50",
    color: "#f59e0b",
    description:
      "New cells attached to the rim of existing urban patches, pushing the urban boundary outward in contiguous rings or corridors.",
    planningNote:
      "The dominant mode in most growing regions. Manageable when guided along planned corridors; costly when it consumes prime farmland.",
  },
  {
    id: "leapfrog",
    label: "Leapfrog",
    leiRange: "LEI = 0",
    color: "#ef4444",
    description:
      "Detached new patches with no shared border with existing urban land — subdivisions and developments that jump ahead of the urban front.",
    planningNote:
      "The classic sprawl signature. Fragments farmland and habitat, and demands new infrastructure. A rising leapfrog share is an early-warning signal.",
  },
];

export function getPattern(id: GrowthPatternId): GrowthPattern {
  return GROWTH_PATTERNS.find((p) => p.id === id)!;
}


