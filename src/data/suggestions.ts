import { Suggestion } from "./types";

// Rule catalog for the suggestions engine (src/lib/suggestions-engine.ts).
// Thresholds are evaluated against the real 2015–2025 zonal statistics.

export const BASE_SUGGESTIONS: Suggestion[] = [
  {
    id: "sug-1",
    category: "urban_growth",
    severity: "critical",
    title: "Rapid Urbanization Detected",
    description: "Built-up area has grown by more than 10 percentage points since 2015.",
    metric: ">10 pts growth",
    recommendation: "Review zoning policies to manage growth sustainably and plan for necessary infrastructure.",
  },
  {
    id: "sug-2",
    category: "agriculture",
    severity: "warning",
    title: "Significant Agriculture Loss",
    description: "Agricultural lands have decreased by over 10 percentage points since 2015.",
    metric: ">10 pts drop",
    recommendation: "Protect remaining farmland through agricultural preservation zones and incentives.",
  },
  {
    id: "sug-3",
    category: "forest",
    severity: "critical",
    title: "Critical Forest Depletion",
    description: "Forest and vegetation cover has fallen below the critical 15% threshold.",
    metric: "<15% remaining",
    recommendation: "Prioritize aggressive reforestation programs and strictly enforce anti-logging ordinances.",
  },
  {
    id: "sug-4",
    category: "urban_growth",
    severity: "warning",
    title: "Green Buffer Enhancement Needed",
    description: "Built-up area exceeds 40%, increasing urban heat and reducing permeability.",
    metric: ">40% built-up",
    recommendation: "Establish green buffer zones, urban parks, and mandate permeable surfaces in new developments.",
  },
  {
    id: "sug-5",
    category: "water",
    severity: "warning",
    title: "Lake Runoff Risk",
    description: "High built-up density near the lake shore increases direct runoff and pollution.",
    metric: "Adjacent & >30% built",
    recommendation: "Implement riparian buffers, strict wastewater management, and coastal setback regulations.",
  },
  {
    id: "sug-6",
    category: "urban_growth",
    severity: "critical",
    title: "Severe Sprawl Trajectory",
    description: "If the observed 2015–2025 growth rate continues, built-up area would exceed 60% within a decade.",
    metric: ">60% extrapolated",
    recommendation: "Shift development strategy toward vertical densification and transit-oriented development instead of outward expansion.",
  },
  {
    id: "sug-7",
    category: "general",
    severity: "info",
    title: "Open Land Opportunity",
    description: "Significant open land available that has not yet been converted.",
    metric: ">20% open land",
    recommendation: "Strategic land banking opportunity for future parks, conservation, or structured mixed-use development.",
  }
];
