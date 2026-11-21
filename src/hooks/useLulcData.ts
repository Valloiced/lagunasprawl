import { useMemo } from "react";
import { ViewLevel, AreaLulcProfile } from "../data/types";
import { getWatershedLulcData, getProvinceLulcData, getCityLulcData } from "../data/stats";
import { getMunicipality, getProvince } from "../data/areas";

export function useLulcData(level: ViewLevel, slug: string = "") {
  const profile = useMemo<AreaLulcProfile | null>(() => {
    if (level === "watershed") {
      return {
        slug: "watershed",
        name: "Laguna de Bay Watershed",
        type: "watershed",
        yearlyData: getWatershedLulcData(),
      };
    }
    
    if (level === "province" && slug) {
      const province = getProvince(slug);
      return {
        slug,
        name: province?.name ?? slug.charAt(0).toUpperCase() + slug.slice(1),
        type: "province",
        yearlyData: getProvinceLulcData(slug),
      };
    }
    
    if (level === "city" && slug) {
      const city = getMunicipality(slug);
      if (!city) return null;
      return {
        slug,
        name: city.name,
        type: "city",
        yearlyData: getCityLulcData(slug),
      };
    }

    return null;
  }, [level, slug]);

  return { profile };
}
