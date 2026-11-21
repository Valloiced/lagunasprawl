import type { EngineParams } from "@/lib/sim/engine";
import type { SimTileMeta } from "@/data/generated/sim-tiles.generated";
import type { useSimEngine } from "./useSimEngine";

/** Run settings that belong to the page, not to the engine's own parameters. */
export interface RunSettings {
  /** multiplies the Markov demand, for the sensitivity question */
  demandScale: number;
  /** Monte Carlo ensemble size */
  runs: number;
  seed: number;
}

export interface ActProps {
  sim: ReturnType<typeof useSimEngine>;
  tile: SimTileMeta;
  params: EngineParams;
  setParams: (p: Partial<EngineParams>) => void;
  run: RunSettings;
  setRun: (r: Partial<RunSettings>) => void;
  goTo: (act: number) => void;
  /** auto-play is walking the steps unattended */
  presenting: boolean;
  /** show the presenter's speaking notes on each step */
  notes: boolean;
}

export function fmtCells(n: number): string {
  return n.toLocaleString();
}

export function fmtKm2(cells: number, digits = 2): string {
  return `${(cells * 1e-4).toFixed(digits)} km²`;
}

