import { useMemo } from "react";
import { municipalities, provinces } from "../data/areas";

export function useAreaData() {
  const allProvinces = useMemo(() => provinces, []);
  const allMunicipalities = useMemo(
    () => [...municipalities].sort((left, right) => left.name.localeCompare(right.name)),
    []
  );

  const getCitiesByProvince = (provinceSlug: string) => {
    return allMunicipalities.filter(
      (m) => m.provinceSlug === provinceSlug.toLowerCase()
    );
  };

  return {
    provinces: allProvinces,
    municipalities: allMunicipalities,
    getCitiesByProvince,
  };
}
