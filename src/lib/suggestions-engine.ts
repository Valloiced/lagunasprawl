import { AreaLulcProfile, Suggestion } from "../data/types";
import { BASE_SUGGESTIONS } from "../data/suggestions";

export function generateSuggestions(
  profile: AreaLulcProfile,
  isLakeAdjacent: boolean = false
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  if (!profile || profile.yearlyData.length === 0) return suggestions;
  
  const data2015 = profile.yearlyData.find(d => d.year === 2015);
  const data2025 = profile.yearlyData.find(d => d.year === 2025);

  if (!data2015 || !data2025) return suggestions;

  const getPct = (data: typeof data2015, classId: number) => {
    return data.classes.find(c => c.classId === classId)?.percentage || 0;
  };

  const builtUp2015 = getPct(data2015, 1);
  const builtUp2025 = getPct(data2025, 1);
  const agri2015 = getPct(data2015, 2);
  const agri2025 = getPct(data2025, 2);
  const forest2025 = getPct(data2025, 3);
  const open2025 = getPct(data2025, 5);

  // 1. Rapid Urbanization (observed decade)
  if (builtUp2025 - builtUp2015 > 10) {
    suggestions.push(BASE_SUGGESTIONS.find(s => s.id === "sug-1")!);
  }

  // 2. Agriculture Loss (observed decade)
  if (agri2015 - agri2025 > 10) {
    suggestions.push(BASE_SUGGESTIONS.find(s => s.id === "sug-2")!);
  }

  // 3. Forest Below Threshold
  if (forest2025 < 15) {
    suggestions.push(BASE_SUGGESTIONS.find(s => s.id === "sug-3")!);
  }

  // 4. Green Buffer Needed
  if (builtUp2025 > 40) {
    suggestions.push(BASE_SUGGESTIONS.find(s => s.id === "sug-4")!);
  }

  // 5. Lake Runoff Risk
  if (isLakeAdjacent && builtUp2025 > 30) {
    suggestions.push(BASE_SUGGESTIONS.find(s => s.id === "sug-5")!);
  }

  // 6. Sprawl trajectory: extrapolate the observed 2015→2025 growth
  // one decade forward (no prediction model — straight-line trend).
  const extrapolatedBuilt = builtUp2025 + (builtUp2025 - builtUp2015);
  if (extrapolatedBuilt > 60) {
    suggestions.push(BASE_SUGGESTIONS.find(s => s.id === "sug-6")!);
  }

  // 7. Open Land Opportunity
  if (open2025 > 20) {
    suggestions.push(BASE_SUGGESTIONS.find(s => s.id === "sug-7")!);
  }

  return suggestions.filter(Boolean);
}
