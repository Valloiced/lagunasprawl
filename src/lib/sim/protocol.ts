/** Message contract between the simulation page and its worker. */
import type { EngineParams, FidelityReport } from "./engine";

export type Base = "2025" | "2020";

export type SimRequest =
  | { type: "load"; tileId: string; withReference: boolean }
  | { type: "params"; params: Partial<EngineParams> }
  | { type: "reset"; base: Base }
  | { type: "step"; demand: number; seed: number; label: string }
  | { type: "ensemble"; demands: number[]; runs: number; seed: number }
  | { type: "validate"; demand: number; runs: number; seed: number }
  | { type: "explain"; cell: number };

export interface LoadedPayload {
  width: number;
  height: number;
  core: number;
  pad: number;
  /** class code per cell for each observed year, for the base maps */
  lulc2016: Uint8Array;
  lulc2020: Uint8Array;
  lulc2025: Uint8Array;
  constraint: Uint8Array;
  mask: Uint8Array;
  /** one driver layer per model feature, for the driver browser */
  drivers: Record<string, Float32Array>;
  reference?: Record<string, Float32Array | Uint8Array>;
  loadMs: number;
}

export interface ResetPayload {
  base: Base;
  candidates: number;
  active: number;
  tp: Float32Array;
  candidateMask: Uint8Array;
  built: Uint8Array;
  fidelity?: FidelityReport;
  ms: number;
}

export interface StepPayload {
  label: string;
  picks: Int32Array;
  demand: number;
  allocated: number;
  built: Uint8Array;
  /** likelihood over the grid that this step drew from */
  tp: Float32Array;
  /** likelihood once the neighbourhood has updated for the new buildings */
  tpAfter: Float32Array;
  builtCells: number;
  ms: number;
  /** stamped by the page on arrival, to pace its animation */
  receivedAt?: number;
}

export interface EnsemblePayload {
  frequency: Float32Array;
  modal: Uint8Array;
  runs: number;
  demands: number[];
  ms: number;
}

export interface ValidationPayload {
  frequency: Float32Array;
  /** modal simulated change, as a mask over the grid */
  simulatedChange: Uint8Array;
  observedChange: Uint8Array;
  fom: number;
  hits: number;
  misses: number;
  falseAlarms: number;
  fomRandom: number;
  multiResolution: { resolutionM: number; fom: number; hits: number }[];
  demand: number;
  runs: number;
  ms: number;
  /** stamped by the page on arrival, to pace its animation */
  receivedAt?: number;
}

export interface ExplainPayload {
  cell: number;
  features: number[];
  tp: number;
  intercept: number;
  /** cumulative margin after each tree, for the convergence plot */
  margins: Float32Array;
  /** the first tree's decision path, for the walkthrough */
  firstPath: {
    node: number;
    feature: number;
    threshold: number;
    x: number;
    goLeft: boolean;
  }[];
  firstLeaf: number;
  /**
   * The tree that pushed hardest in the direction of the final answer. Tree 1
   * is arbitrary and can vote against the overall result, which makes a poor
   * example to point at; this one is representative by construction.
   */
  keyTree: {
    index: number;
    path: { node: number; feature: number; threshold: number; x: number; goLeft: boolean }[];
    leaf: number;
  };
  /** leaf weight contributed by every tree, sorted by absolute size */
  topTrees: { tree: number; leaf: number }[];
}

export type SimResponse =
  | { type: "loaded"; payload: LoadedPayload }
  | { type: "reset"; payload: ResetPayload }
  | { type: "step"; payload: StepPayload }
  | { type: "ensemble"; payload: EnsemblePayload }
  | { type: "validation"; payload: ValidationPayload }
  | { type: "explain"; payload: ExplainPayload }
  | { type: "progress"; phase: string; done: number; total: number }
  | { type: "error"; message: string };
