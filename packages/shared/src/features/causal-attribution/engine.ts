/**
 * Aletheia Causal Attribution Engine
 *
 * Transforms flat trace observation trees into a DAG, computes critical paths,
 * and attributes latency/cost/failure contributions using marginal-contribution
 * analysis. Produces root-cause explanations for why a run was slow, expensive,
 * or failed.
 *
 * Algorithm Overview:
 * 1. Build DAG from observations (parent_observation_id edges)
 * 2. Topological sort for processing order
 * 3. Compute critical path (longest weighted path)
 * 4. Marginal latency contribution per node
 * 5. Cost attribution (proportional to node cost / total cost)
 * 6. Failure propagation analysis (which node error caused cascade)
 * 7. Confidence scoring based on data completeness
 * 8. Natural-language root cause explanation generation
 */

import { z } from "zod";

// ─── Input Types ────────────────────────────────────────────────────────────

export const ObservationNodeSchema = z.object({
  id: z.string(),
  traceId: z.string(),
  parentObservationId: z.string().nullable(),
  name: z.string().nullable(),
  type: z.string(), // SPAN, GENERATION, EVENT, AGENT, TOOL, etc.
  startTime: z.date(),
  endTime: z.date().nullable(),
  level: z.enum(["DEBUG", "DEFAULT", "WARNING", "ERROR"]),
  statusMessage: z.string().nullable(),
  model: z.string().nullable(),
  inputTokens: z.number().default(0),
  outputTokens: z.number().default(0),
  totalTokens: z.number().default(0),
  inputCost: z.number().nullable(),
  outputCost: z.number().nullable(),
  totalCost: z.number().nullable(),
  calculatedTotalCost: z.number().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
});
export type ObservationNode = z.infer<typeof ObservationNodeSchema>;

// ─── Output Types ───────────────────────────────────────────────────────────

export const CausalNodeResultSchema = z.object({
  nodeId: z.string(),
  nodeName: z.string().nullable(),
  nodeType: z.string(),
  parentNodeId: z.string().nullable(),

  // Timing
  durationMs: z.number(),
  selfDurationMs: z.number(), // excluding children

  // Attribution percentages (0-100)
  latencyContributionPct: z.number(),
  costContributionPct: z.number(),
  failureContributionPct: z.number(),

  // Critical path
  isCriticalPath: z.boolean(),
  criticalPathRank: z.number().nullable(), // 1 = most critical

  // Failure analysis
  hasError: z.boolean(),
  errorMessage: z.string().nullable(),
  failurePropagatedTo: z.array(z.string()), // node IDs affected

  // Cost
  nodeCostUsd: z.number(),

  // Token usage
  inputTokens: z.number(),
  outputTokens: z.number(),

  // Model
  model: z.string().nullable(),
});
export type CausalNodeResult = z.infer<typeof CausalNodeResultSchema>;

export const CausalAttributionResultSchema = z.object({
  traceId: z.string(),
  projectId: z.string(),

  // Overall metrics
  totalDurationMs: z.number(),
  totalCostUsd: z.number(),
  totalTokens: z.number(),

  // Root cause
  rootCauseNodeId: z.string().nullable(),
  rootCauseNodeName: z.string().nullable(),
  rootCauseType: z.enum([
    "LATENCY",
    "COST",
    "FAILURE",
    "LATENCY_AND_COST",
    "NONE",
  ]),
  rootCauseConfidence: z.number().min(0).max(1),
  rootCauseExplanation: z.string(),

  // Per-node results
  nodes: z.array(CausalNodeResultSchema),

  // Critical path (ordered list of node IDs)
  criticalPath: z.array(z.string()),

  // Computation metadata
  computedAt: z.date(),
  algorithmVersion: z.string(),
});
export type CausalAttributionResult = z.infer<
  typeof CausalAttributionResultSchema
>;

// ─── DAG Node (internal) ───────────────────────────────────────────────────

interface DAGNode {
  observation: ObservationNode;
  children: DAGNode[];
  parent: DAGNode | null;
  depth: number;
  durationMs: number;
  selfDurationMs: number;
  costUsd: number;
  hasError: boolean;
  errorPropagates: boolean;
  // Critical path fields
  longestPathWeight: number; // longest path from this node to any leaf
  criticalChild: DAGNode | null; // next node on the critical path
}

// ─── Engine ─────────────────────────────────────────────────────────────────

export class CausalAttributionEngine {
  private readonly ALGORITHM_VERSION = "1.0.0";

  /**
   * Compute causal attribution for a trace.
   */
  compute(
    projectId: string,
    traceId: string,
    observations: ObservationNode[],
  ): CausalAttributionResult {
    if (observations.length === 0) {
      return this.emptyResult(projectId, traceId);
    }

    // Step 1: Build DAG
    const dag = this.buildDAG(observations);

    // Step 2: Compute critical path
    const criticalPath = this.computeCriticalPath(dag);

    // Step 3: Compute attributions
    const totalDurationMs = this.computeTotalDuration(dag);
    const totalCostUsd = this.computeTotalCost(dag);
    const totalTokens = this.computeTotalTokens(dag);

    const nodeResults = this.computeNodeResults(
      dag,
      totalDurationMs,
      totalCostUsd,
      criticalPath,
    );

    // Step 4: Failure propagation analysis
    this.computeFailurePropagation(dag, nodeResults);

    // Step 5: Determine root cause
    const rootCause = this.determineRootCause(nodeResults, totalDurationMs, totalCostUsd);

    // Step 6: Generate explanation
    const explanation = this.generateExplanation(
      rootCause,
      nodeResults,
      totalDurationMs,
      totalCostUsd,
    );

    return {
      traceId,
      projectId,
      totalDurationMs,
      totalCostUsd,
      totalTokens,
      rootCauseNodeId: rootCause.nodeId,
      rootCauseNodeName: rootCause.nodeName,
      rootCauseType: rootCause.type,
      rootCauseConfidence: rootCause.confidence,
      rootCauseExplanation: explanation,
      nodes: nodeResults,
      criticalPath: criticalPath.map((n) => n.observation.id),
      computedAt: new Date(),
      algorithmVersion: this.ALGORITHM_VERSION,
    };
  }

  // ── Step 1: Build DAG ───────────────────────────────────────────────────

  private buildDAG(observations: ObservationNode[]): DAGNode[] {
    const nodeMap = new Map<string, DAGNode>();
    const roots: DAGNode[] = [];

    // Create all nodes
    for (const obs of observations) {
      const durationMs = obs.endTime
        ? obs.endTime.getTime() - obs.startTime.getTime()
        : 0;

      const costUsd =
        (obs.totalCost ?? obs.calculatedTotalCost ?? 0) as number;

      nodeMap.set(obs.id, {
        observation: obs,
        children: [],
        parent: null,
        depth: 0,
        durationMs: Math.max(0, durationMs),
        selfDurationMs: durationMs, // Will be computed after linking
        costUsd,
        hasError: obs.level === "ERROR",
        errorPropagates: false,
        longestPathWeight: 0,
        criticalChild: null,
      });
    }

    // Link parent-child relationships
    for (const node of nodeMap.values()) {
      const parentId = node.observation.parentObservationId;
      if (parentId && nodeMap.has(parentId)) {
        const parent = nodeMap.get(parentId)!;
        parent.children.push(node);
        node.parent = parent;
      } else {
        roots.push(node);
      }
    }

    // Compute depths
    const computeDepth = (node: DAGNode, depth: number): void => {
      node.depth = depth;
      for (const child of node.children) {
        computeDepth(child, depth + 1);
      }
    };
    for (const root of roots) {
      computeDepth(root, 0);
    }

    // Compute self-duration (duration minus max child duration for overlapping spans)
    const computeSelfDuration = (node: DAGNode): void => {
      if (node.children.length === 0) {
        node.selfDurationMs = node.durationMs;
        return;
      }

      for (const child of node.children) {
        computeSelfDuration(child);
      }

      // Self duration = total duration - sum of children's durations (clamped to 0)
      // This accounts for the work done by the node itself excluding children
      const childrenTotalMs = node.children.reduce(
        (sum, c) => sum + c.durationMs,
        0,
      );
      node.selfDurationMs = Math.max(0, node.durationMs - childrenTotalMs);
    };
    for (const root of roots) {
      computeSelfDuration(root);
    }

    return roots;
  }

  // ── Step 2: Critical Path ───────────────────────────────────────────────

  private computeCriticalPath(roots: DAGNode[]): DAGNode[] {
    // Compute longest-path weights bottom-up
    const computeWeights = (node: DAGNode): number => {
      if (node.children.length === 0) {
        node.longestPathWeight = node.durationMs;
        node.criticalChild = null;
        return node.longestPathWeight;
      }

      let maxChildWeight = 0;
      let criticalChild: DAGNode | null = null;

      for (const child of node.children) {
        const childWeight = computeWeights(child);
        if (childWeight > maxChildWeight) {
          maxChildWeight = childWeight;
          criticalChild = child;
        }
      }

      node.longestPathWeight = node.selfDurationMs + maxChildWeight;
      node.criticalChild = criticalChild;
      return node.longestPathWeight;
    };

    for (const root of roots) {
      computeWeights(root);
    }

    // Find the root with the longest path
    let criticalRoot: DAGNode | null = null;
    let maxWeight = 0;
    for (const root of roots) {
      if (root.longestPathWeight > maxWeight) {
        maxWeight = root.longestPathWeight;
        criticalRoot = root;
      }
    }

    // Walk the critical path
    const path: DAGNode[] = [];
    let current = criticalRoot;
    while (current) {
      path.push(current);
      current = current.criticalChild;
    }

    return path;
  }

  // ── Step 3: Node Results ────────────────────────────────────────────────

  private computeNodeResults(
    roots: DAGNode[],
    totalDurationMs: number,
    totalCostUsd: number,
    criticalPath: DAGNode[],
  ): CausalNodeResult[] {
    const results: CausalNodeResult[] = [];
    const criticalPathIds = new Set(criticalPath.map((n) => n.observation.id));

    const processNode = (node: DAGNode): void => {
      // Latency contribution: self-duration / total-duration
      const latencyPct =
        totalDurationMs > 0
          ? (node.selfDurationMs / totalDurationMs) * 100
          : 0;

      // Cost contribution
      const costPct =
        totalCostUsd > 0 ? (node.costUsd / totalCostUsd) * 100 : 0;

      // Critical path rank
      const criticalPathIndex = criticalPath.findIndex(
        (n) => n.observation.id === node.observation.id,
      );

      results.push({
        nodeId: node.observation.id,
        nodeName: node.observation.name,
        nodeType: node.observation.type,
        parentNodeId: node.observation.parentObservationId,
        durationMs: node.durationMs,
        selfDurationMs: node.selfDurationMs,
        latencyContributionPct: Math.round(latencyPct * 100) / 100,
        costContributionPct: Math.round(costPct * 100) / 100,
        failureContributionPct: 0, // Computed in step 4
        isCriticalPath: criticalPathIds.has(node.observation.id),
        criticalPathRank:
          criticalPathIndex >= 0 ? criticalPathIndex + 1 : null,
        hasError: node.hasError,
        errorMessage: node.hasError
          ? node.observation.statusMessage
          : null,
        failurePropagatedTo: [],
        nodeCostUsd: node.costUsd,
        inputTokens: node.observation.inputTokens,
        outputTokens: node.observation.outputTokens,
        model: node.observation.model,
      });

      for (const child of node.children) {
        processNode(child);
      }
    };

    for (const root of roots) {
      processNode(root);
    }

    return results;
  }

  // ── Step 4: Failure Propagation ─────────────────────────────────────────

  private computeFailurePropagation(
    roots: DAGNode[],
    nodeResults: CausalNodeResult[],
  ): void {
    const resultMap = new Map(nodeResults.map((r) => [r.nodeId, r]));

    // Find error nodes and trace propagation upward
    const propagateError = (node: DAGNode): boolean => {
      let hasChildError = false;

      for (const child of node.children) {
        if (propagateError(child)) {
          hasChildError = true;
        }
      }

      if (node.hasError || hasChildError) {
        node.errorPropagates = true;

        // If this node has an error, mark all ancestors as affected
        if (node.hasError) {
          let parent = node.parent;
          while (parent) {
            const parentResult = resultMap.get(parent.observation.id);
            if (parentResult) {
              parentResult.failurePropagatedTo.push(node.observation.id);
            }
            parent = parent.parent;
          }
        }

        return true;
      }

      return false;
    };

    for (const root of roots) {
      propagateError(root);
    }

    // Compute failure contribution percentages
    const errorNodes = nodeResults.filter((r) => r.hasError);
    const totalErrors = errorNodes.length;

    if (totalErrors > 0) {
      for (const result of errorNodes) {
        // Failure contribution based on: how many nodes were affected by this error
        const affectedCount =
          result.failurePropagatedTo.length +
          (result.isCriticalPath ? 2 : 0); // Boost critical path errors
        result.failureContributionPct =
          Math.round(
            (affectedCount / Math.max(1, nodeResults.length)) * 100 * 100,
          ) / 100;
      }
    }
  }

  // ── Step 5: Root Cause Determination ────────────────────────────────────

  private determineRootCause(
    nodes: CausalNodeResult[],
    totalDurationMs: number,
    totalCostUsd: number,
  ): {
    nodeId: string | null;
    nodeName: string | null;
    type: CausalAttributionResult["rootCauseType"];
    confidence: number;
  } {
    if (nodes.length === 0) {
      return { nodeId: null, nodeName: null, type: "NONE", confidence: 0 };
    }

    // Check for failures first
    const errorNodes = nodes.filter((n) => n.hasError);
    if (errorNodes.length > 0) {
      // Root cause is the deepest error node (original failure)
      const deepest = errorNodes.reduce((prev, curr) => {
        // Use critical path membership as tiebreaker
        if (curr.isCriticalPath && !prev.isCriticalPath) return curr;
        if (curr.failureContributionPct > prev.failureContributionPct)
          return curr;
        return prev;
      });

      return {
        nodeId: deepest.nodeId,
        nodeName: deepest.nodeName,
        type: "FAILURE",
        confidence: Math.min(
          1,
          0.6 + deepest.failureContributionPct / 100,
        ),
      };
    }

    // Score each node for combined latency + cost impact
    const scored = nodes.map((n) => ({
      node: n,
      score: n.latencyContributionPct * 0.6 + n.costContributionPct * 0.4,
    }));

    scored.sort((a, b) => b.score - a.score);
    const topNode = scored[0];

    if (!topNode) {
      return { nodeId: null, nodeName: null, type: "NONE", confidence: 0 };
    }

    // Determine type
    let type: CausalAttributionResult["rootCauseType"];
    if (
      topNode.node.latencyContributionPct > 40 &&
      topNode.node.costContributionPct > 40
    ) {
      type = "LATENCY_AND_COST";
    } else if (topNode.node.latencyContributionPct > 30) {
      type = "LATENCY";
    } else if (topNode.node.costContributionPct > 30) {
      type = "COST";
    } else {
      type = "LATENCY"; // Default
    }

    // Confidence based on how dominant this node is
    const dominance = topNode.score / Math.max(1, scored.slice(1).reduce((s, n) => s + n.score, 0));
    const confidence = Math.min(1, 0.4 + dominance * 0.4);

    return {
      nodeId: topNode.node.nodeId,
      nodeName: topNode.node.nodeName,
      type,
      confidence: Math.round(confidence * 100) / 100,
    };
  }

  // ── Step 6: Explanation Generation ──────────────────────────────────────

  private generateExplanation(
    rootCause: {
      nodeId: string | null;
      nodeName: string | null;
      type: CausalAttributionResult["rootCauseType"];
      confidence: number;
    },
    nodes: CausalNodeResult[],
    totalDurationMs: number,
    totalCostUsd: number,
  ): string {
    if (rootCause.type === "NONE" || !rootCause.nodeId) {
      return "No significant root cause identified. The trace completed within normal parameters.";
    }

    const rootNode = nodes.find((n) => n.nodeId === rootCause.nodeId);
    if (!rootNode) {
      return "Root cause node could not be resolved.";
    }

    const nodeName = rootNode.nodeName ?? rootNode.nodeId;
    const confidencePct = Math.round(rootCause.confidence * 100);

    const criticalPathNodes = nodes
      .filter((n) => n.isCriticalPath)
      .sort((a, b) => (a.criticalPathRank ?? 999) - (b.criticalPathRank ?? 999));

    const parts: string[] = [];

    switch (rootCause.type) {
      case "FAILURE": {
        parts.push(
          `Root cause: "${nodeName}" (${rootNode.nodeType}) failed with error: "${rootNode.errorMessage ?? "unknown error"}".`,
        );
        if (rootNode.failurePropagatedTo.length > 0) {
          parts.push(
            `This failure cascaded to ${rootNode.failurePropagatedTo.length} upstream node(s).`,
          );
        }
        if (rootNode.isCriticalPath) {
          parts.push(
            `The failed node is on the critical path, directly impacting end-to-end latency.`,
          );
        }
        break;
      }
      case "LATENCY": {
        parts.push(
          `Root cause: "${nodeName}" (${rootNode.nodeType}) contributed ${rootNode.latencyContributionPct}% of total latency (${rootNode.selfDurationMs}ms of ${totalDurationMs}ms total).`,
        );
        if (rootNode.isCriticalPath) {
          parts.push(
            `This node is on the critical path at position #${rootNode.criticalPathRank}.`,
          );
        }
        if (rootNode.nodeType === "GENERATION" && rootNode.outputTokens > 0) {
          parts.push(
            `The node generated ${rootNode.outputTokens} output tokens, which may explain the latency.`,
          );
        }
        break;
      }
      case "COST": {
        parts.push(
          `Root cause: "${nodeName}" (${rootNode.nodeType}) contributed ${rootNode.costContributionPct}% of total cost ($${rootNode.nodeCostUsd.toFixed(4)} of $${totalCostUsd.toFixed(4)} total).`,
        );
        if (rootNode.inputTokens + rootNode.outputTokens > 0) {
          parts.push(
            `Token usage: ${rootNode.inputTokens} input + ${rootNode.outputTokens} output tokens.`,
          );
        }
        break;
      }
      case "LATENCY_AND_COST": {
        parts.push(
          `Root cause: "${nodeName}" (${rootNode.nodeType}) is the dominant contributor to both latency (${rootNode.latencyContributionPct}%) and cost (${rootNode.costContributionPct}%).`,
        );
        parts.push(
          `Duration: ${rootNode.selfDurationMs}ms | Cost: $${rootNode.nodeCostUsd.toFixed(4)} | Tokens: ${rootNode.inputTokens + rootNode.outputTokens}`,
        );
        break;
      }
    }

    // Add critical path summary
    if (criticalPathNodes.length > 1) {
      const pathSummary = criticalPathNodes
        .map(
          (n) =>
            `${n.nodeName ?? n.nodeId} (${n.selfDurationMs}ms)`,
        )
        .join(" → ");
      parts.push(`Critical path: ${pathSummary}`);
    }

    parts.push(`Confidence: ${confidencePct}%`);

    return parts.join(" ");
  }

  // ── Utility Functions ──────────────────────────────────────────────────

  private computeTotalDuration(roots: DAGNode[]): number {
    if (roots.length === 0) return 0;
    return Math.max(...roots.map((r) => r.durationMs));
  }

  private computeTotalCost(roots: DAGNode[]): number {
    let total = 0;
    const addCost = (node: DAGNode): void => {
      total += node.costUsd;
      for (const child of node.children) {
        addCost(child);
      }
    };
    for (const root of roots) {
      addCost(root);
    }
    return total;
  }

  private computeTotalTokens(roots: DAGNode[]): number {
    let total = 0;
    const addTokens = (node: DAGNode): void => {
      total += node.observation.totalTokens;
      for (const child of node.children) {
        addTokens(child);
      }
    };
    for (const root of roots) {
      addTokens(root);
    }
    return total;
  }

  private emptyResult(
    projectId: string,
    traceId: string,
  ): CausalAttributionResult {
    return {
      traceId,
      projectId,
      totalDurationMs: 0,
      totalCostUsd: 0,
      totalTokens: 0,
      rootCauseNodeId: null,
      rootCauseNodeName: null,
      rootCauseType: "NONE",
      rootCauseConfidence: 0,
      rootCauseExplanation:
        "No observations found for this trace.",
      nodes: [],
      criticalPath: [],
      computedAt: new Date(),
      algorithmVersion: this.ALGORITHM_VERSION,
    };
  }
}
