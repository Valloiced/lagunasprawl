// AUTO-GENERATED context for the CA-ML analysis views.
// Real values come from the modeling pipeline (outputs/*.json, s06/s07).
// Per-year classification accuracy is now certified against 1,556
// human-labeled reference points; the forecast comes from s12/s13.
import {
  SpatialLayer,
  DriverImportance,
  ValidationVariant,
} from "../types";

export const SPATIAL_LAYERS: SpatialLayer[] = [
  {
    id: "tp",
    label: "Transition potential (2020)",
    kind: "raster",
    source: "/tp_2020.png",
    color: "#f0f921",
    description:
      "Machine-learning suitability for conversion to built-up, from the 2020 landscape state.",
    defaultOn: false,
  },
  {
    id: "forecast",
    label: "Urbanization probability (2035)",
    kind: "raster",
    source: "/prob_2035.png",
    color: "#ff2828",
    description:
      "Monte Carlo probability that a cell is built-up by 2035, across 25 CA runs.",
    defaultOn: false,
  },
  {
    id: "constraint",
    label: "Development constraints",
    kind: "raster",
    source: "/constraint.png",
    color: "#7850a0",
    description:
      "Cells blocked from urban growth: open water, protected areas, and slopes over 18 degrees.",
    defaultOn: false,
  },
  {
    id: "peza",
    label: "PEZA / industrial zones",
    kind: "points",
    source: "/geojson/peza.geojson",
    color: "#7c3aed",
    description: "15 verified economic zones driving industrial-led conversion.",
    defaultOn: true,
  },
  {
    id: "dpwh",
    label: "DPWH road corridors",
    kind: "points",
    source: "/geojson/dpwh_corridors.geojson",
    color: "#0ea5e9",
    description:
      "132 capacity-adding DPWH road projects (new roads, bypasses, missing links).",
    defaultOn: false,
  },
  {
    id: "protected",
    label: "Protected areas",
    kind: "polygons",
    source: "/geojson/protected.geojson",
    color: "#16a34a",
    description: "11 protected landscapes and reserves (405 km2) within the basin.",
    defaultOn: false,
  },
];

// Real - transition-potential model benchmark (s06 on the four-class maps,
// 5 km spatial-block cross-validation).
export const TRANSITION_BENCHMARK = [
  { model: "Logistic Regression", auc: 0.8841 },
  { model: "Random Forest", auc: 0.8827 },
  { model: "XGBoost", auc: 0.8899, selected: true },
];

// Real — permutation importance of the selected model (s06).
export const DRIVER_IMPORTANCE: DriverImportance[] = [
  { feature: "viirs", label: "Night-time lights", importance: 0.1331 },
  { feature: "dist_builtup", label: "Distance to built-up", importance: 0.123 },
  { feature: "elevation", label: "Elevation", importance: 0.0645 },
  { feature: "dist_peza", label: "Distance to PEZA zones", importance: 0.0448 },
  { feature: "dist_rivers", label: "Distance to rivers", importance: 0.0128 },
  { feature: "dist_roads", label: "Distance to major roads", importance: 0.0119 },
  { feature: "dist_centers", label: "Distance to town centers", importance: 0.0078 },
  { feature: "slope", label: "Slope", importance: 0.0053 },
  { feature: "nb5", label: "Neighborhood built-up (5x5)", importance: 0.0022 },
  { feature: "nb3", label: "Neighborhood built-up (3x3)", importance: 0.0 },
];

// Real - internal validation (s07 on the four-class maps). The persistence
// null scores kappa 0.7946 against the simulation's 0.7639;
// at ~4% conversion prevalence, metrics averaged over all cells reward
// predicting no change, which is why Figure of Merit is the headline.
export const VALIDATION_VARIANTS: ValidationVariant[] = [
  {
    id: "gross",
    label: "All detected change",
    description:
      "Every mapped conversion, temporal monotonicity enforced. Demand equals the size of the target set, so the model is scored on every cell it can reach.",
    demandKm2: 111.1,
    fom: 0.0943,
    fomRandomBaseline: 0.0471,
    fomMultiRes: [
      { resolution: "10 m", fom: 0.0943 },
      { resolution: "50 m", fom: 0.1158 },
      { resolution: "100 m", fom: 0.134 },
      { resolution: "250 m", fom: 0.1662 },
      { resolution: "500 m", fom: 0.1985 },
    ],
    quantityDisagreement: 0.0269,
    allocationDisagreement: 0.1219,
  },
];

// Real — independent product agreement (Chapter IV corroboration).
export const PRODUCT_AGREEMENT = [
  { product: "Dynamic World (2020)", overallAgreement: 82.0, builtF1: 0.807 },
  { product: "Dynamic World (2025)", overallAgreement: 81.5, builtF1: 0.835 },
  { product: "ESA WorldCover (2021)", overallAgreement: 74.8, builtF1: null },
];

// Forecast scenarios now come from the CA run (s13) via s14_web_stats.py.
export { FORECAST_SCENARIOS, FORECAST_HORIZONS, FORECAST_IS_MOCK,
         OBSERVED_2025_BUILT_UP_HA,
         SHORELAND_BUFFER_M, AVOIDED_SHORELAND_HA } from "./scenarios.generated";
export const PER_YEAR_ACCURACY_IS_MOCK = false;

// Null-model comparison, reported alongside FoM (Pontius & Millones 2011).

// Null-model comparison and the chance baseline, reported alongside FoM
// (Pontius & Millones 2011). The persistence null scores HIGHER on kappa
// and OA because ~96% of cells do not change; FoM is the metric that
// ignores persistence and scores only the change.
export const NULL_MODEL = {
  kappaSim: 0.7639,
  kappaNull: 0.7946,
  oaSim: 0.8511,
  oaNull: 0.8709,
  hits: 191587,
  misses: 919747,
  falseAlarms: 919747,
  fomRandomBaseline: 0.0471,
  fomRatioVsRandom: 2.0,
};
