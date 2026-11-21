"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "lulc_pipeline_complete";

/**
 * Returns whether the pipeline simulation has been completed.
 * `isReady === null` means we haven't checked localStorage yet (hydrating).
 * `isReady === false` means the pipeline has not been run.
 * `isReady === true` means the pipeline has been completed.
 */
export function usePipelineReady() {
  const [isReady, setIsReady] = useState<boolean | null>(null);

  useEffect(() => {
    // Pipeline outputs ship with the app, so default to ready unless the user
    // explicitly reset it (e.g. via a demo toggle that writes "false").
    setIsReady(localStorage.getItem(STORAGE_KEY) !== "false");
  }, []);

  const markReady = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsReady(true);
  }, []);

  return { isReady, markReady };
}
