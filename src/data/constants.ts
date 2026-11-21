import { LulcClass, Year } from "./types";

// Pipeline class ids. An earlier generator used an incompatible scheme
// (1 = Built-up, 2 = Agriculture, 4 = Water) and the pages were written
// against it, so regenerating the data silently swapped Built-up for
// Water everywhere. Never write these as bare numbers again.
export const CLASS_ID = {
  WATER: 1,
  BUILT_UP: 2,
  FOREST: 3,
  AGRICULTURE: 4,
} as const;

// Class ids match the modeling pipeline (s03c_classify4_obia.py):
// 1 Water, 2 Built-up, 3 Forest, 4 Agriculture/open.
//
// Bare/Open (id 5) was retired. It covered under 1% of the watershed, could not
// be separated from fallow cropland at 10 m, and two analysts applied it
// inconsistently during validation (producer's accuracy ~1% in every year). It
// is merged into Agriculture at training time, so the maps contain no class 5
// and the legend must not offer one.
export const LULC_CLASSES: LulcClass[] = [
  {
    id: 2,
    name: "Built-up",
    label: "Built-up Area",
    color: "#e74c3c",
    description: "Urban, residential, commercial, industrial areas and roads",
  },
  {
    id: 4,
    name: "Agriculture",
    label: "Agriculture & Open Land",
    color: "#f39c12",
    description:
      "Rice paddies, cropland, plantations and farmland, including fallow, " +
      "plowed and harvested fields, plus bare and open ground",
  },
  {
    id: 3,
    name: "Forest_Vegetation",
    label: "Forest & Vegetation",
    color: "#27ae60",
    description: "Natural and secondary forests, dense vegetation cover",
  },
  {
    id: 1,
    name: "Water",
    label: "Water Bodies",
    color: "#2980b9",
    description: "Lakes, rivers, ponds, and aquaculture areas",
  },
];

// 2030 and 2035 come from the CA forecast (s12/s13), rendered by s10 into
// lulc_2030.png / lulc_2035.png. They are projections, not observations.
export const AVAILABLE_YEARS: Year[] = [2015, 2020, 2025, 2030, 2035, 2040];
export const PROJECTED_YEARS: Year[] = [2030, 2035, 2040];
// 2040 is three CA steps from the last observation. Population, night
// lights and road distances are all held at their last observed values,
// so uncertainty compounds - label it an extended scenario, not a peer
// of 2030.
export const EXTENDED_HORIZON_YEARS: Year[] = [2040];

export const WATERSHED_CENTER: [number, number] = [14.35, 121.3];
export const WATERSHED_ZOOM = 10;

export const WATERSHED_NAME = "Laguna de Bay Watershed";
export const STUDY_TITLE = "Urban Sprawl Analysis";
export const STUDY_SUBTITLE =
  "Land Use / Land Cover Classification & Prediction";

export function getClassColor(classId: number): string {
  return LULC_CLASSES.find((c) => c.id === classId)?.color ?? "#999";
}

export function getClassName(classId: number): string {
  return LULC_CLASSES.find((c) => c.id === classId)?.label ?? "Unknown";
}
