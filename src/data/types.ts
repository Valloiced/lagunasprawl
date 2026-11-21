export interface LulcClass {
  id: number;
  name: string;
  label: string;
  color: string;
  description: string;
}

export interface LulcClassData {
  classId: number;
  className: string;
  areaHa: number;
  percentage: number;
}

export interface LulcYearData {
  year: number;
  isPredicted: boolean;
  classes: LulcClassData[];
  totalAreaHa: number;
}

export interface Municipality {
  slug: string;
  name: string;
  province: string;
  provinceSlug: string;
  center: [number, number]; // [lat, lng]
  areaHa: number;
  isLakeAdjacent: boolean;
  hasBoundary?: boolean;
}

export interface Province {
  slug: string;
  name: string;
  center: [number, number];
  areaHa: number;
  municipalityCount: number;
  description: string;
  hasBoundary?: boolean;
}

export interface AreaLulcProfile {
  slug: string;
  name: string;
  type: "watershed" | "province" | "city";
  yearlyData: LulcYearData[];
}

export interface Suggestion {
  id: string;
  category: "urban_growth" | "agriculture" | "forest" | "water" | "general";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  metric: string;
  recommendation: string;
}

export interface ModelMetrics {
  year: number;
  overallAccuracy: number;
  kappa: number;
  /** design-based 95% confidence half-width on overallAccuracy, in points */
  accuracyCi95: number;
  /** standard error behind that interval, in points */
  accuracyStdError: number;
  trainingSamples: number;
  testSamples: number;
  satellite: string;
  perClass: {
    className: string;
    precision: number;
    recall: number;
    f1Score: number;
    support: number;
  }[];
  features: string[];
}

export interface BandStatistic {
  className: string;
  classId: number;
  bands: {
    name: string;
    fullName: string;
    mean: number;
    std: number;
    description: string;
  }[];
}

export type ViewLevel = "watershed" | "province" | "city";
// 2015 labels the Sentinel-2 composite spanning Jul 2015 - Jun 2016.

// 2015/2020/2025 observed; 2030/2035 from the CA forecast (s12, s13).
export type Year = 2015 | 2020 | 2025 | 2030 | 2035 | 2040;

export interface SpatialLayer {
  id: string;
  label: string;
  kind: "raster" | "points" | "lines" | "polygons";
  source: string; // png or geojson path under /public
  color: string;
  description: string;
  defaultOn: boolean;
}

export interface ForecastScenario {
  id: string;
  name: string;
  description: string;
  builtUpHa2035: number;
  netGrowthHa: number;
  growthPct: number;
  /** cells the 25-run ensemble converts in at least half its runs */
  cellsHighProbability: number;
  overlay: string; // png path
  /** every projected horizon; 2040 is an extended scenario */
  horizons: Record<string, {
    builtUpHa: number; netGrowthHa: number;
    growthPct: number; cellsHighProbability: number;
  }>;
}

export interface DriverImportance {
  feature: string;
  label: string;
  importance: number;
}

export interface ValidationVariant {
  id: string;
  label: string;
  description: string;
  demandKm2: number;
  fom: number;
  fomRandomBaseline?: number;
  fomMultiRes?: { resolution: string; fom: number }[];
  quantityDisagreement: number;
  allocationDisagreement: number;
}
