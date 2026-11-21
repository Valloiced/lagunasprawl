import { AreaLulcProfile, LulcYearData, ModelMetrics } from "@/data/types";
import { CLASS_ID } from "@/data/constants";
import { getModelMetricsForYear } from "@/data/model-metrics";

export interface AreaAction {
  title: string;
  timeframe: string;
  description: string;
  accent: "rose" | "amber" | "emerald" | "blue";
}

export interface AreaNarrative {
  tone: "priority" | "watch" | "steady";
  toneLabel: string;
  headline: string;
  summary: string;
  keyPoints: string[];
  actions: AreaAction[];
  mapPrompt: string;
}

export interface ValidationStory {
  summary: string;
  cards: { label: string; value: string; note: string }[];
  classRows: { className: string; label: string; value: number; note: string }[];
}

export function getYearData(profile: AreaLulcProfile, year: number): LulcYearData | undefined {
  return profile.yearlyData.find((entry) => entry.year === year);
}

export function getClassPercentage(yearData: LulcYearData | undefined, classId: number): number {
  return yearData?.classes.find((entry) => entry.classId === classId)?.percentage ?? 0;
}

export function formatClassName(className: string): string {
  return className.replace(/_/g, " ");
}

export function getDominantClassLabel(yearData: LulcYearData | undefined): string {
  if (!yearData) return "No data";
  const winner = [...yearData.classes].sort((left, right) => right.percentage - left.percentage)[0];
  return winner ? formatClassName(winner.className) : "No data";
}

export function getNetChange(profile: AreaLulcProfile, classId: number, startYear: number, endYear: number): number {
  return (
    getClassPercentage(getYearData(profile, endYear), classId) -
    getClassPercentage(getYearData(profile, startYear), classId)
  );
}

export function getAreaNarrative(
  profile: AreaLulcProfile,
  context: {
    areaName: string;
    areaType: "watershed" | "province" | "city";
    provinceName?: string;
    isLakeAdjacent?: boolean;
    municipalityCount?: number;
  }
): AreaNarrative {
  const built2015 = getClassPercentage(getYearData(profile, 2015), CLASS_ID.BUILT_UP);
  const built2025 = getClassPercentage(getYearData(profile, 2025), CLASS_ID.BUILT_UP);
  const agriculture2025 = getClassPercentage(getYearData(profile, 2025), CLASS_ID.AGRICULTURE);
  const forest2015 = getClassPercentage(getYearData(profile, 2015), CLASS_ID.FOREST);
  const forest2025 = getClassPercentage(getYearData(profile, 2025), CLASS_ID.FOREST);
  const open2025 = getClassPercentage(getYearData(profile, 2025), CLASS_ID.AGRICULTURE);

  const historicGrowth = built2025 - built2015;
  const forestLoss = forest2015 - forest2025;

  let tone: AreaNarrative["tone"] = "steady";
  if (built2025 >= 32 || historicGrowth >= 8 || (context.isLakeAdjacent && built2025 >= 24)) {
    tone = "priority";
  } else if (built2025 >= 24 || historicGrowth >= 4 || forestLoss >= 2) {
    tone = "watch";
  }

  const toneLabel =
    tone === "priority" ? "Needs strong growth controls" : tone === "watch" ? "Needs active monitoring" : "Relatively stable";

  const placeLabel =
    context.areaType === "watershed"
      ? "the whole watershed"
      : context.areaType === "province"
        ? `${context.areaName} province`
        : context.areaName;

  const summary =
    tone === "priority"
      ? `${placeLabel} is already under visible development pressure. The clearest job now is to keep future growth inside serviced corridors and protect the land that still slows flooding, cools neighborhoods, and filters runoff.`
      : tone === "watch"
        ? `${placeLabel} is not yet the most stressed part of the basin, but the trend is moving in that direction. This is the stage where early planning is cheaper than later cleanup or retrofitting.`
        : `${placeLabel} still has room to manage growth more calmly. The main opportunity is to lock in protective zoning and green buffers before pressure intensifies.`;

  const keyPoints = [
    `${built2025.toFixed(1)}% of the area is built-up in 2025, up from ${built2015.toFixed(1)}% in 2015 (${historicGrowth >= 0 ? "+" : ""}${historicGrowth.toFixed(1)} points over the observed decade).`,
    forest2025 > 0
      ? `Forest and vegetation account for ${forest2025.toFixed(1)}% today${forestLoss > 0.4 ? ` after slipping ${forestLoss.toFixed(1)} points since 2015` : ", which remains a major stabilizing land cover."}`
      : "Forest cover is already limited, so every remaining green pocket matters.",
    agriculture2025 >= 12
      ? `Agriculture still covers ${agriculture2025.toFixed(1)}%, which means there is still something meaningful to protect from unplanned conversion.`
      : `Agricultural land is already limited at ${agriculture2025.toFixed(1)}%, so future growth decisions will have to focus on smarter reuse and drainage upgrades instead of simply opening new land.`,
  ];

  const actions: AreaAction[] = [];

  actions.push({
    title: historicGrowth >= 5 ? "Keep new growth inside serviced corridors" : "Tighten growth review before pressure rises",
    timeframe: "Next 12 months",
    description:
      historicGrowth >= 5
        ? "Prioritize infill, corridor-based growth, and phased utility expansion so outward spread does not consume every open buffer."
        : "Use permit review, zoning updates, and drainage checks to make sure low-risk land is used first and scattered expansion stays limited.",
    accent: tone === "priority" ? "rose" : "amber",
  });

  if (context.isLakeAdjacent || context.areaType === "watershed") {
    actions.push({
      title: "Strengthen runoff and shoreline protection",
      timeframe: "Next 6-18 months",
      description:
        "Reserve setback zones, expand vegetated drainage edges, and require stormwater controls in lakeside or low-lying growth areas so more hard surfaces do not directly translate into dirtier runoff.",
      accent: "blue",
    });
  }

  if (forest2025 >= 28 || forestLoss >= 1.5) {
    actions.push({
      title: "Protect remaining upland and slope vegetation",
      timeframe: "Next 18 months",
      description:
        "Keep forested slopes and large green fragments intact, especially where they still buffer runoff, reduce erosion, and hold back heat across expanding settlements.",
      accent: "emerald",
    });
  }

  if (agriculture2025 >= 12 || open2025 >= 10) {
    actions.push({
      title: "Reserve open land for parks, flood storage, and food production",
      timeframe: "Next 1-2 years",
      description:
        "Do not let all remaining open land default into piecemeal conversion. Identify which tracts should stay productive, which should absorb water, and which can carry compact growth safely.",
      accent: "amber",
    });
  }

  if (actions.length < 3) {
    actions.push({
      title: "Translate the model into a local action list",
      timeframe: "Quarterly review",
      description:
        "Use the trend maps as an early-warning tool, then turn them into a short local checklist for zoning, drainage, transport, and green-space decisions.",
      accent: "blue",
    });
  }

  return {
    tone,
    toneLabel,
    headline:
      tone === "priority"
        ? "Growth is real and should be guided now"
        : tone === "watch"
          ? "Growth is manageable, but the warning signs are visible"
          : "This area still has a chance to stay ahead of sprawl",
    summary,
    keyPoints,
    actions: actions.slice(0, 3),
    mapPrompt:
      context.areaType === "watershed"
        ? "Open the interactive map to see where the observed land-cover shifts appear across the basin."
        : `Use the interactive map to see how ${context.areaName} sits within the larger watershed trend.`,
  };
}

function describeKappa(kappa: number): string {
  if (kappa >= 0.8) return "strong agreement beyond random chance";
  if (kappa >= 0.6) return "moderate-to-strong agreement";
  if (kappa >= 0.4) return "fair agreement";
  return "limited agreement";
}

function getClassLabel(score: number): string {
  if (score >= 0.9) return "Very strong";
  if (score >= 0.8) return "Strong";
  if (score >= 0.7) return "Good";
  if (score >= 0.6) return "Moderate";
  return "Needs caution";
}

export function getValidationStory(year: number = 2025): ValidationStory {
  const metrics = getModelMetricsForYear(year) ?? getModelMetricsForYear(2025);
  if (!metrics) {
    return {
      summary: "No validation metrics are available.",
      cards: [],
      classRows: [],
    };
  }

  return {
    summary: `The ${metrics.year} model matched reviewed samples ${metrics.overallAccuracy.toFixed(1)}% of the time, and the kappa score of ${metrics.kappa.toFixed(2)} indicates ${describeKappa(metrics.kappa)}. In simple terms: this is useful decision-support evidence, but it should still be paired with local knowledge before policy decisions are finalized.`,
    cards: [
      {
        label: "Overall accuracy",
        value: `${metrics.overallAccuracy.toFixed(1)}%`,
        note: "How often the model matched the reviewed validation samples.",
      },
      {
        label: "Kappa",
        value: metrics.kappa.toFixed(2),
        note: "How much better the classification performed than random guessing.",
      },
      {
        // Not a cross-validation score. There is no CV in this pipeline: the
        // figure is a design-based interval from the stratified estimator over
        // the human-labeled reference points.
        label: "95% confidence interval",
        value: `±${metrics.accuracyCi95.toFixed(1)} pts`,
        note: `Overall accuracy is ${metrics.overallAccuracy.toFixed(1)}% with a 95% interval of ±${metrics.accuracyCi95.toFixed(1)} points, estimated from the stratified reference sample.`,
      },
    ],
    classRows: metrics.perClass.map((entry) => ({
      className: entry.className,
      label: getClassLabel(entry.f1Score),
      value: Math.round(entry.f1Score * 100),
      note: `F1 score blends precision and recall for ${formatClassName(entry.className)}.`,
    })),
  };
}

export function getComparisonMetrics(profile: AreaLulcProfile) {
  const data2015 = getYearData(profile, 2015);
  const data2025 = getYearData(profile, 2025);
  const built2015 = getClassPercentage(data2015, CLASS_ID.BUILT_UP);
  const built2025 = getClassPercentage(data2025, CLASS_ID.BUILT_UP);
  const forest2025 = getClassPercentage(data2025, CLASS_ID.FOREST);

  return [
    {
      label: "Built-up now (2025)",
      value: `${built2025.toFixed(1)}%`,
      note: "Share of land that is already urbanized or built over.",
    },
    {
      label: "Change since 2015",
      value: `${getNetChange(profile, CLASS_ID.BUILT_UP, 2015, 2025).toFixed(1)} pts`,
      note: "Built-up gain over the last observed decade.",
    },
    {
      label: "2015 baseline",
      value: `${built2015.toFixed(1)}%`,
      note: "Built-up share at the start of the observed period.",
    },
    {
      label: "Dominant cover",
      value: getDominantClassLabel(data2025),
      note: `Forest is ${forest2025.toFixed(1)}% in the current view.`,
    },
  ];
}

export function getMetricSource(year: number = 2025): ModelMetrics | undefined {
  return getModelMetricsForYear(year);
}
