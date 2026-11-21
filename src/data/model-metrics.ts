import { ModelMetrics } from "./types";
import { GENERATED_MODEL_METRICS } from "./generated/model-metrics.generated";

// Real classifier validation results from models/*_metadata.json.

export const modelMetrics: ModelMetrics[] = GENERATED_MODEL_METRICS;

export function getModelMetricsForYear(year: number): ModelMetrics | undefined {
  return modelMetrics.find((m) => m.year === year);
}
