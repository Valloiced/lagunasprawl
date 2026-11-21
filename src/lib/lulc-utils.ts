import { LulcYearData } from "../data/types";

export function getLulcTrend(
  historical: LulcYearData[],
  classId: number
): { diff: number; percentChange: number; direction: "up" | "down" | "flat" } {
  if (historical.length < 2) return { diff: 0, percentChange: 0, direction: "flat" };
  
  const startYear = historical[0];
  const endYear = historical.filter(d => !d.isPredicted).pop() || historical[historical.length - 1];

  const startVal = startYear.classes.find(c => c.classId === classId)?.percentage || 0;
  const endVal = endYear.classes.find(c => c.classId === classId)?.percentage || 0;

  const diff = endVal - startVal;
  const percentChange = startVal > 0 ? (diff / startVal) * 100 : 0;
  
  let direction: "up" | "down" | "flat" = "flat";
  if (diff > 0.5) direction = "up";
  else if (diff < -0.5) direction = "down";

  return { diff, percentChange, direction };
}

export function findDominantClass(yearData: LulcYearData) {
  return [...yearData.classes].sort((a, b) => b.percentage - a.percentage)[0];
}
