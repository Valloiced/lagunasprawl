import { redirect } from "next/navigation";

/**
 * The old "How It Works" page.
 *
 * It ran a scripted terminal that replayed pre-written log lines on a timer -
 * an animation of a pipeline run rather than a pipeline run. /simulation
 * replaces it by executing the real transition model and the real CA
 * allocation in the browser, and the provenance content that was worth keeping
 * (satellite inputs, reference datasets, per-year accuracy) now lives in its
 * first act. Old links and bookmarks land there.
 */
export default function ModelPage() {
  redirect("/simulation");
}
