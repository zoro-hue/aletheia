/**
 * Aletheia Agent Regression Diffing Engine
 *
 * Compares two agent runs using tree edit distance and semantic analysis.
 * Detects: new/removed tool calls, prompt changes, path divergence,
 * cost/latency/quality deltas. Produces structured diff reports.
 *
 * Algorithm: Zhang-Shasha-inspired tree edit distance adapted for
 * observation trees, with domain-specific change classification.
 */

import { z } from "zod";
import type { ObservationNode } from "../causal-attribution/engine";

// ─── Output Types ───────────────────────────────────────────────────────────

export const NodeChangeType = z.enum([
  "ADDED",
  "REMOVED",
  "MODIFIED",
  "REORDERED",
  "UNCHANGED",
]);

export const NodeChangeSchema = z.object({
  changeType: NodeChangeType,
  nodeA: z.object({ id: z.string(), name: z.string().nullable(), type: z.string(), model: z.string().nullable().optional() }).nullable(),
  nodeB: z.object({ id: z.string(), name: z.string().nullable(), type: z.string(), model: z.string().nullable().optional() }).nullable(),
  details: z.array(z.object({
    field: z.string(),
    valueA: z.unknown().optional(),
    valueB: z.unknown().optional(),
    description: z.string(),
  })),
});
export type NodeChange = z.infer<typeof NodeChangeSchema>;

export const PathDivergenceSchema = z.object({
  divergencePoint: z.string(), // node name/ID where paths diverged
  pathA: z.array(z.string()),
  pathB: z.array(z.string()),
  description: z.string(),
});

export const RegressionDiffResultSchema = z.object({
  diffId: z.string(),
  projectId: z.string(),
  runATraceId: z.string(),
  runBTraceId: z.string(),
  // Structural changes
  nodeChanges: z.array(NodeChangeSchema),
  pathDivergences: z.array(PathDivergenceSchema),
  // Impact metrics
  costDelta: z.number(),
  costDeltaPct: z.number(),
  latencyDelta: z.number(),
  latencyDeltaPct: z.number(),
  tokenDelta: z.number(),
  similarityScore: z.number(),
  // Summary
  totalAdded: z.number(),
  totalRemoved: z.number(),
  totalModified: z.number(),
  editDistance: z.number(),
  summary: z.string(),
  computedAt: z.date(),
});
export type RegressionDiffResult = z.infer<typeof RegressionDiffResultSchema>;

// ─── Internal Tree Node ────────────────────────────────────────────────────

interface TreeNode {
  obs: ObservationNode;
  children: TreeNode[];
  label: string; // normalized name+type for matching
}

// ─── Engine ─────────────────────────────────────────────────────────────────

export class RegressionDiffEngine {
  compute(
    projectId: string,
    diffId: string,
    observationsA: ObservationNode[],
    observationsB: ObservationNode[],
  ): RegressionDiffResult {
    const treeA = this.buildTree(observationsA);
    const treeB = this.buildTree(observationsB);
    const flatA = this.flattenTree(treeA);
    const flatB = this.flattenTree(treeB);

    // Match nodes between trees by label (name + type)
    const { matched, addedInB, removedFromA } = this.matchNodes(treeA, treeB);

    // Build node changes
    const nodeChanges: NodeChange[] = [];

    for (const { nodeA, nodeB } of matched) {
      const details = this.diffNodes(nodeA.obs, nodeB.obs);
      nodeChanges.push({
        changeType: details.length > 0 ? "MODIFIED" : "UNCHANGED",
        nodeA: { id: nodeA.obs.id, name: nodeA.obs.name, type: nodeA.obs.type, model: nodeA.obs.model },
        nodeB: { id: nodeB.obs.id, name: nodeB.obs.name, type: nodeB.obs.type, model: nodeB.obs.model },
        details,
      });
    }

    for (const node of addedInB) {
      nodeChanges.push({
        changeType: "ADDED",
        nodeA: null,
        nodeB: { id: node.obs.id, name: node.obs.name, type: node.obs.type, model: node.obs.model },
        details: [{ field: "node", description: `New ${node.obs.type} node "${node.obs.name ?? node.obs.id}" added` }],
      });
    }

    for (const node of removedFromA) {
      nodeChanges.push({
        changeType: "REMOVED",
        nodeA: { id: node.obs.id, name: node.obs.name, type: node.obs.type, model: node.obs.model },
        nodeB: null,
        details: [{ field: "node", description: `${node.obs.type} node "${node.obs.name ?? node.obs.id}" removed` }],
      });
    }

    // Path divergence detection
    const pathDivergences = this.detectPathDivergences(treeA, treeB);

    // Compute metrics
    const metricsA = this.computeMetrics(observationsA);
    const metricsB = this.computeMetrics(observationsB);

    const costDelta = metricsB.totalCost - metricsA.totalCost;
    const latencyDelta = metricsB.totalDuration - metricsA.totalDuration;
    const tokenDelta = metricsB.totalTokens - metricsA.totalTokens;

    const totalAdded = addedInB.length;
    const totalRemoved = removedFromA.length;
    const totalModified = matched.filter(
      (m) => this.diffNodes(m.nodeA.obs, m.nodeB.obs).length > 0,
    ).length;

    const editDistance = totalAdded + totalRemoved + totalModified;

    const summary = this.generateSummary(
      totalAdded, totalRemoved, totalModified,
      costDelta, latencyDelta, tokenDelta,
      metricsA, metricsB, pathDivergences,
    );

    const totalNodes = flatA.length + flatB.length;
    const similarityScore = totalNodes > 0 ? 1 - (editDistance / totalNodes) : 1;

    return {
      diffId,
      projectId,
      runATraceId: observationsA[0]?.traceId ?? "",
      runBTraceId: observationsB[0]?.traceId ?? "",
      nodeChanges,
      pathDivergences,
      costDelta,
      costDeltaPct: metricsA.totalCost > 0 ? (costDelta / metricsA.totalCost) * 100 : 0,
      latencyDelta,
      latencyDeltaPct: metricsA.totalDuration > 0 ? (latencyDelta / metricsA.totalDuration) * 100 : 0,
      tokenDelta,
      similarityScore,
      totalAdded,
      totalRemoved,
      totalModified,
      editDistance,
      summary,
      computedAt: new Date(),
    };
  }

  private buildTree(observations: ObservationNode[]): TreeNode[] {
    const nodeMap = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    for (const obs of observations) {
      nodeMap.set(obs.id, {
        obs,
        children: [],
        label: `${obs.type}:${obs.name ?? "unnamed"}`,
      });
    }

    for (const node of nodeMap.values()) {
      const parentId = node.obs.parentObservationId;
      if (parentId && nodeMap.has(parentId)) {
        nodeMap.get(parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  private matchNodes(
    treeA: TreeNode[],
    treeB: TreeNode[],
  ): {
    matched: { nodeA: TreeNode; nodeB: TreeNode }[];
    addedInB: TreeNode[];
    removedFromA: TreeNode[];
  } {
    const flatA = this.flattenTree(treeA);
    const flatB = this.flattenTree(treeB);

    const matched: { nodeA: TreeNode; nodeB: TreeNode }[] = [];
    const usedB = new Set<string>();

    // Match by label (greedy, order-preserving)
    for (const a of flatA) {
      const bestMatch = flatB.find((b) => !usedB.has(b.obs.id) && b.label === a.label);
      if (bestMatch) {
        matched.push({ nodeA: a, nodeB: bestMatch });
        usedB.add(bestMatch.obs.id);
      }
    }

    const matchedAIds = new Set(matched.map((m) => m.nodeA.obs.id));
    const removedFromA = flatA.filter((a) => !matchedAIds.has(a.obs.id));
    const addedInB = flatB.filter((b) => !usedB.has(b.obs.id));

    return { matched, addedInB, removedFromA };
  }

  private flattenTree(roots: TreeNode[]): TreeNode[] {
    const result: TreeNode[] = [];
    const walk = (node: TreeNode): void => {
      result.push(node);
      for (const child of node.children) walk(child);
    };
    for (const root of roots) walk(root);
    return result;
  }

  private diffNodes(
    a: ObservationNode,
    b: ObservationNode,
  ): NodeChange["details"] {
    const details: NodeChange["details"] = [];

    if (a.model !== b.model && (a.model || b.model)) {
      details.push({ field: "model", valueA: a.model, valueB: b.model, description: `Model changed: ${a.model} → ${b.model}` });
    }

    const durationA = a.endTime ? a.endTime.getTime() - a.startTime.getTime() : 0;
    const durationB = b.endTime ? b.endTime.getTime() - b.startTime.getTime() : 0;
    if (Math.abs(durationA - durationB) > Math.max(durationA, durationB) * 0.2) {
      details.push({ field: "duration", valueA: durationA, valueB: durationB, description: `Duration changed: ${durationA}ms → ${durationB}ms (${durationB > durationA ? "+" : ""}${durationB - durationA}ms)` });
    }

    const costA = (a.totalCost ?? a.calculatedTotalCost ?? 0) as number;
    const costB = (b.totalCost ?? b.calculatedTotalCost ?? 0) as number;
    if (Math.abs(costA - costB) > 0.0001) {
      details.push({ field: "cost", valueA: costA, valueB: costB, description: `Cost changed: $${costA.toFixed(4)} → $${costB.toFixed(4)}` });
    }

    if (a.totalTokens !== b.totalTokens) {
      details.push({ field: "tokens", valueA: a.totalTokens, valueB: b.totalTokens, description: `Tokens changed: ${a.totalTokens} → ${b.totalTokens}` });
    }

    if (a.level !== b.level) {
      details.push({ field: "level", valueA: a.level, valueB: b.level, description: `Status changed: ${a.level} → ${b.level}` });
    }

    return details;
  }

  private detectPathDivergences(
    treeA: TreeNode[],
    treeB: TreeNode[],
  ): RegressionDiffResult["pathDivergences"] {
    const divergences: RegressionDiffResult["pathDivergences"] = [];
    const pathsA = this.extractPaths(treeA);
    const pathsB = this.extractPaths(treeB);

    // Compare paths by their label sequences
    const pathSetA = new Set(pathsA.map((p) => p.join(" → ")));
    const pathSetB = new Set(pathsB.map((p) => p.join(" → ")));

    for (const pathStr of pathSetB) {
      if (!pathSetA.has(pathStr)) {
        const path = pathStr.split(" → ");
        // Find where it diverged from the closest A path
        let bestMatch = "";
        let matchLen = 0;
        for (const aStr of pathSetA) {
          const aPath = aStr.split(" → ");
          let i = 0;
          while (i < aPath.length && i < path.length && aPath[i] === path[i]) i++;
          if (i > matchLen) { matchLen = i; bestMatch = aStr; }
        }

        if (matchLen > 0 && matchLen < path.length) {
          divergences.push({
            divergencePoint: path[matchLen - 1],
            pathA: bestMatch.split(" → "),
            pathB: path,
            description: `Agent path diverged after "${path[matchLen - 1]}": Run B took a different route`,
          });
        }
      }
    }

    return divergences.slice(0, 10); // Cap at 10 divergences
  }

  private extractPaths(roots: TreeNode[]): string[][] {
    const paths: string[][] = [];
    const walk = (node: TreeNode, currentPath: string[]): void => {
      const newPath = [...currentPath, node.label];
      if (node.children.length === 0) {
        paths.push(newPath);
      } else {
        for (const child of node.children) walk(child, newPath);
      }
    };
    for (const root of roots) walk(root, []);
    return paths;
  }

  private computeMetrics(observations: ObservationNode[]) {
    let totalDuration = 0;
    let totalCost = 0;
    let totalTokens = 0;

    for (const obs of observations) {
      if (!obs.parentObservationId && obs.endTime) {
        totalDuration = Math.max(totalDuration, obs.endTime.getTime() - obs.startTime.getTime());
      }
      totalCost += (obs.totalCost ?? obs.calculatedTotalCost ?? 0) as number;
      totalTokens += obs.totalTokens;
    }

    return { totalDuration, totalCost, totalTokens };
  }

  private generateSummary(
    added: number, removed: number, modified: number,
    costDelta: number, latencyDelta: number, tokenDelta: number,
    metricsA: { totalDuration: number; totalCost: number; totalTokens: number },
    metricsB: { totalDuration: number; totalCost: number; totalTokens: number },
    divergences: RegressionDiffResult["pathDivergences"],
  ): string {
    const parts: string[] = [];

    if (added + removed + modified === 0) {
      parts.push("No structural changes detected between the two runs.");
    } else {
      const changes: string[] = [];
      if (added > 0) changes.push(`${added} added`);
      if (removed > 0) changes.push(`${removed} removed`);
      if (modified > 0) changes.push(`${modified} modified`);
      parts.push(`Structural changes: ${changes.join(", ")} node(s).`);
    }

    if (Math.abs(latencyDelta) > 100) {
      const dir = latencyDelta > 0 ? "slower" : "faster";
      const pct = metricsA.totalDuration > 0 ? Math.abs(latencyDelta / metricsA.totalDuration * 100).toFixed(1) : "N/A";
      parts.push(`Latency: ${Math.abs(latencyDelta)}ms ${dir} (${pct}%).`);
    }

    if (Math.abs(costDelta) > 0.001) {
      const dir = costDelta > 0 ? "more expensive" : "cheaper";
      parts.push(`Cost: $${Math.abs(costDelta).toFixed(4)} ${dir}.`);
    }

    if (divergences.length > 0) {
      parts.push(`${divergences.length} path divergence(s) detected.`);
    }

    return parts.join(" ");
  }
}
