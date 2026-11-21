"use client";

/**
 * React binding for the CA worker.
 *
 * The engine is deliberately not in React state - the grids are megabytes of
 * typed arrays and copying them through setState on every step would dominate
 * the frame budget. State here holds the latest payloads by reference plus a
 * revision counter the canvases watch.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { EngineParams } from "@/lib/sim/engine";
import type {
  Base,
  EnsemblePayload,
  ExplainPayload,
  LoadedPayload,
  ResetPayload,
  SimRequest,
  SimResponse,
  StepPayload,
  ValidationPayload,
} from "@/lib/sim/protocol";

export interface SimState {
  status: "idle" | "loading" | "ready" | "running" | "error";
  error: string | null;
  progress: { phase: string; done: number; total: number } | null;
  loaded: LoadedPayload | null;
  reset: ResetPayload | null;
  steps: StepPayload[];
  ensemble: EnsemblePayload | null;
  validation: ValidationPayload | null;
  explain: ExplainPayload | null;
  /** increments whenever any grid changes, so canvases know to repaint */
  revision: number;
}

const INITIAL: SimState = {
  status: "idle",
  error: null,
  progress: null,
  loaded: null,
  reset: null,
  steps: [],
  ensemble: null,
  validation: null,
  explain: null,
  revision: 0,
};

export function useSimEngine() {
  const workerRef = useRef<Worker | null>(null);
  const [state, setState] = useState<SimState>(INITIAL);

  useEffect(() => {
    const worker = new Worker(new URL("../../lib/sim/sim.worker.ts", import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (ev: MessageEvent<SimResponse>) => {
      const msg = ev.data;
      setState((prev) => {
        const next = { ...prev, revision: prev.revision + 1 };
        switch (msg.type) {
          case "loaded":
            return { ...next, status: "ready", loaded: msg.payload, progress: null };
          case "reset":
            return {
              ...next,
              status: "ready",
              reset: msg.payload,
              steps: [],
              ensemble: null,
              validation: null,
              progress: null,
            };
          case "step":
            return {
              ...next,
              status: "ready",
              steps: [...prev.steps, { ...msg.payload, receivedAt: performance.now() }],
              progress: null,
            };
          case "ensemble":
            return { ...next, status: "ready", ensemble: msg.payload, progress: null };
          case "validation":
            return {
              ...next,
              status: "ready",
              validation: { ...msg.payload, receivedAt: performance.now() },
              progress: null,
            };
          case "explain":
            return { ...next, explain: msg.payload };
          case "progress":
            return {
              ...next,
              progress: { phase: msg.phase, done: msg.done, total: msg.total },
            };
          case "error":
            return { ...next, status: "error", error: msg.message, progress: null };
        }
      });
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const send = useCallback((msg: SimRequest, busy = true) => {
    if (!workerRef.current) return;
    if (busy) setState((p) => ({ ...p, status: "running", error: null }));
    workerRef.current.postMessage(msg);
  }, []);

  return {
    state,
    load: useCallback(
      (tileId: string, withReference = true) => {
        setState((p) => ({ ...INITIAL, revision: p.revision + 1, status: "loading" }));
        send({ type: "load", tileId, withReference }, false);
      },
      [send]
    ),
    setParams: useCallback(
      (params: Partial<EngineParams>) => send({ type: "params", params }, false),
      [send]
    ),
    reset: useCallback((base: Base) => send({ type: "reset", base }), [send]),
    step: useCallback(
      (demand: number, seed: number, label: string) =>
        send({ type: "step", demand, seed, label }),
      [send]
    ),
    runEnsemble: useCallback(
      (demands: number[], runs: number, seed: number) =>
        send({ type: "ensemble", demands, runs, seed }),
      [send]
    ),
    validate: useCallback(
      (demand: number, runs: number, seed: number) =>
        send({ type: "validate", demand, runs, seed }),
      [send]
    ),
    explainCell: useCallback((cell: number) => send({ type: "explain", cell }, false), [send]),
  };
}
