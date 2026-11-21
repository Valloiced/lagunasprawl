/**
 * Inference over the packed XGBoost booster from src/s17_sim_tile.py.
 *
 * Same arithmetic the pipeline ran: walk every tree, `x < threshold` goes left,
 * sum the leaf weights, add the intercept (the logit of base_score), squash.
 * Stage 17 asserts this reproduces sklearn's predict_proba to 3e-08 before it
 * ships the file, and re-derives each tile's whole TP surface from the packed
 * copy to catch feature-assembly drift.
 */
import type { PackedForest } from "./format";

/**
 * Transition potential for `n` rows of `X` (row-major, nFeatures per row).
 * Writes into `out` and returns it.
 */
export function predict(
  f: PackedForest,
  X: Float32Array,
  n: number,
  out: Float32Array = new Float32Array(n)
): Float32Array {
  const { nTrees, nFeatures, offset, left, right, value, feature, intercept } = f;
  for (let i = 0; i < n; i++) {
    const row = i * nFeatures;
    let margin = intercept;
    for (let t = 0; t < nTrees; t++) {
      let node = offset[t];
      let feat = feature[node];
      while (feat !== 255) {
        node = X[row + feat] < value[node] ? left[node] : right[node];
        feat = feature[node];
      }
      margin += value[node];
    }
    out[i] = 1 / (1 + Math.exp(-margin));
  }
  return out;
}

export interface TreeStep {
  node: number;
  feature: number;
  threshold: number;
  x: number;
  goLeft: boolean;
}

export interface TreeTrace {
  tree: number;
  path: TreeStep[];
  leaf: number;
  /** running margin after this tree */
  margin: number;
  /** probability implied by the margin so far */
  runningProbability: number;
}

/**
 * The same walk, recorded. Feeds the per-cell explanation in the page: one
 * tree's decision path, its leaf weight, and how the running margin converges
 * to the transition potential as the other 399 trees vote.
 */
export function explain(f: PackedForest, x: Float32Array): TreeTrace[] {
  const { nTrees, offset, left, right, value, feature, intercept } = f;
  const traces: TreeTrace[] = [];
  let margin = intercept;
  for (let t = 0; t < nTrees; t++) {
    let node = offset[t];
    const path: TreeStep[] = [];
    let feat = feature[node];
    while (feat !== 255) {
      const goLeft = x[feat] < value[node];
      path.push({ node, feature: feat, threshold: value[node], x: x[feat], goLeft });
      node = goLeft ? left[node] : right[node];
      feat = feature[node];
    }
    margin += value[node];
    traces.push({
      tree: t,
      path,
      leaf: value[node],
      margin,
      runningProbability: 1 / (1 + Math.exp(-margin)),
    });
  }
  return traces;
}

/**
 * Shape of one tree, for drawing it. Nodes come back in the packed order, with
 * indices rebased to 0 so the caller can lay them out without knowing offsets.
 */
export interface TreeNode {
  index: number;
  feature: number;
  value: number;
  left: number;
  right: number;
  depth: number;
  isLeaf: boolean;
}

export function treeShape(f: PackedForest, t: number): TreeNode[] {
  const base = f.offset[t];
  const end = f.offset[t + 1];
  const nodes: TreeNode[] = [];
  const depth = new Int32Array(end - base);
  for (let i = base; i < end; i++) {
    const isLeaf = f.feature[i] === 255;
    const li = isLeaf ? -1 : f.left[i] - base;
    const ri = isLeaf ? -1 : f.right[i] - base;
    if (!isLeaf) {
      depth[li] = depth[i - base] + 1;
      depth[ri] = depth[i - base] + 1;
    }
    nodes.push({
      index: i - base,
      feature: f.feature[i],
      value: f.value[i],
      left: li,
      right: ri,
      depth: depth[i - base],
      isLeaf,
    });
  }
  return nodes;
}
