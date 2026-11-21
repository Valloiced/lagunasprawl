import { LulcYearData } from "./types";
import {
  GENERATED_TOTAL_WATERSHED_AREA_HA,
  GENERATED_WATERSHED_LULC_DATA,
} from "./generated/watershed-stats.generated";
import {
  GENERATED_MUNICIPALITY_LULC,
  GENERATED_PROVINCE_LULC,
} from "./generated/area-stats.generated";

// All values come from zonal statistics over the classified rasters
// (scripts/python/09_zonal_stats.py → 10_generate_web_assets.py).
// 2030 and 2035 are CA forecast years, emitted by s14_web_stats.py with
// isPredicted: true. No hand-authored years remain.

export function getWatershedLulcData(): LulcYearData[] {
  return GENERATED_WATERSHED_LULC_DATA;
}

export function getProvinceLulcData(provinceSlug: string): LulcYearData[] {
  return GENERATED_PROVINCE_LULC[provinceSlug] ?? [];
}

export function getCityLulcData(citySlug: string): LulcYearData[] {
  return GENERATED_MUNICIPALITY_LULC[citySlug] ?? [];
}

export function getCityLulcForYear(citySlug: string, year: number): LulcYearData | undefined {
  return getCityLulcData(citySlug).find((entry) => entry.year === year);
}

export const TOTAL_WATERSHED_AREA_HA = GENERATED_TOTAL_WATERSHED_AREA_HA;
