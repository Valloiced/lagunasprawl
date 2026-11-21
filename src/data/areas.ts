import { Municipality, Province } from "./types";
import {
  GENERATED_MUNICIPALITIES,
  GENERATED_PROVINCES,
} from "./generated/areas.generated";

// Planning narratives are presentation text, kept here rather than in the
// generated registry. Everything quantitative comes from the pipeline.
const PROVINCE_DESCRIPTIONS: Record<string, string> = {
  laguna:
    "The main urban growth corridor of the basin. Industrial estates, housing expansion, and road access continue to pull development across the west and central lakeshore.",
  rizal:
    "A mixed upland and lakeshore province where hillside forest, flood-sensitive lowlands, and suburban growth pressure have to be managed together.",
  "metro-manila":
    "The most built-up part of the study area. The planning challenge here is less about opening new land and more about drainage, heat, runoff, and compact redevelopment.",
  cavite:
    "A peri-urban edge where subdivision growth can spread quickly unless open buffers and drainage corridors are reserved early.",
  batangas:
    "A fast-developing southern gateway where industrial and residential expansion needs to be balanced with farmland retention and flood management.",
  quezon:
    "A smaller, more rural share of the watershed where vegetation and agricultural land still dominate, making prevention cheaper than later recovery.",
};

export const municipalities: Municipality[] = GENERATED_MUNICIPALITIES;

export const provinces: Province[] = GENERATED_PROVINCES.map((province) => ({
  ...province,
  description: PROVINCE_DESCRIPTIONS[province.slug] ?? "",
})).sort((left, right) => right.municipalityCount - left.municipalityCount);

export function getProvince(slug: string): Province | undefined {
  return provinces.find((province) => province.slug === slug);
}

export function getMunicipality(slug: string): Municipality | undefined {
  return municipalities.find((municipality) => municipality.slug === slug);
}

export function getMunicipalitiesByProvince(provinceSlugOrName: string): Municipality[] {
  const normalized = provinceSlugOrName.toLowerCase();
  return municipalities.filter(
    (municipality) =>
      municipality.provinceSlug === normalized ||
      municipality.province.toLowerCase() === normalized
  );
}
