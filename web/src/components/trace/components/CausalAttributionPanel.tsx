import React from "react";
import { api } from "@/src/utils/api";
import { Alert, AlertDescription, AlertTitle } from "@/src/components/ui/alert";
import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { ShieldAlert, Activity, DollarSign, Clock, CheckCircle2, ChevronRight, AlertCircle, HelpCircle } from "lucide-react";

export function CausalAttributionPanel({
  projectId,
  traceId,
}: {
  projectId: string;
  traceId: string;
}) {
  const { data, isLoading, error } = api.aletheia.computeCausalAttribution.useQuery({
    projectId,
    traceId,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center gap-4">
        <Activity className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground font-medium">Running causal attribution graph analysis...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Analysis Failed</AlertTitle>
          <AlertDescription>
            {error?.message || "An unexpected error occurred while computing root cause analysis."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const criticalPathNodes = data.nodes.filter(n => n.isCriticalPath);
  const totalLatencyMs = data.totalDurationMs;
  const criticalPathLatencyMs = criticalPathNodes.reduce((sum, node) => sum + node.selfDurationMs, 0);

  return (
    <div className="flex h-full w-full flex-col gap-6 overflow-y-auto p-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-background to-accent/20 border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Trace Latency</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{(totalLatencyMs / 1000).toFixed(3)}s</div>
            <p className="text-xs text-muted-foreground mt-1">Sum of all execution paths</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-background to-destructive/10 border border-destructive/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Critical Path Duration</CardTitle>
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{(criticalPathLatencyMs / 1000).toFixed(3)}s</div>
            <span className="text-xs font-semibold text-destructive mt-1 inline-flex items-center gap-1">
              {((criticalPathLatencyMs / totalLatencyMs) * 100).toFixed(1)}% of total
            </span>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-background to-accent/20 border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Incurred Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">${data.totalCostUsd.toFixed(5)}</div>
            <p className="text-xs text-muted-foreground mt-1">Based on token pricing</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-background to-accent/20 border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Execution Steps</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{data.nodes.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Total nodes analyzed</p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Path Timeline Visualization */}
      <Card className="border">
        <CardHeader className="pb-3 border-b">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-bold">Critical Path / Root Cause Timeline</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Sequential bottlenecks contributing directly to total latency.</p>
            </div>
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 font-semibold px-2.5 py-1">
              Critical Path
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="relative border-l border-border pl-6 ml-3 space-y-8">
            {criticalPathNodes.map((node, idx) => {
              const latencyContribution = node.latencyContributionPct;
              const costContribution = node.costContributionPct;
              const hasFailure = node.hasError;

              return (
                <div key={node.nodeId} className="relative group">
                  {/* Timeline dot */}
                  <span className={`absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-background ${hasFailure ? "border-destructive animate-pulse" : "border-amber-500"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${hasFailure ? "bg-destructive" : "bg-amber-500"}`} />
                  </span>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border p-4 rounded-xl bg-card hover:bg-accent/10 transition-colors shadow-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">{node.nodeName || "Unnamed Step"}</span>
                        <Badge variant="secondary" className="text-[10px] font-semibold py-0">{node.nodeType}</Badge>
                        {node.model && <Badge variant="outline" className="text-[10px] py-0">{node.model}</Badge>}
                        {hasFailure && (
                          <Badge variant="destructive" className="text-[10px] py-0 font-bold animate-pulse">
                            Failure
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">ID: {node.nodeId}</p>
                      {node.errorMessage && (
                        <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded p-2 mt-1.5 font-mono">
                          {node.errorMessage}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-6 text-right shrink-0">
                      <div>
                        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Latency Contribution</div>
                        <div className="text-sm font-bold font-mono text-foreground">
                          {(node.selfDurationMs / 1000).toFixed(3)}s
                        </div>
                        <div className="text-xs font-semibold text-amber-500">
                          {latencyContribution.toFixed(1)}% path
                        </div>
                      </div>

                      {node.nodeCostUsd ? (
                        <div>
                          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Cost Contribution</div>
                          <div className="text-sm font-bold font-mono text-foreground">
                            ${node.nodeCostUsd.toFixed(5)}
                          </div>
                          <div className="text-xs font-semibold text-emerald-500">
                            {costContribution.toFixed(1)}% total
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recommended Actions */}
      <Card className="border">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            AI Root Cause Recommendations
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Automated suggestions based on critical path analysis and model latency bottlenecks.</p>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {criticalPathNodes.some((n) => n.nodeType === "GENERATION" && n.selfDurationMs > 1000) ? (
            <div className="flex gap-4 p-4 rounded-xl border bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/50">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 h-fit">
                <Clock className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-foreground">Optimize Model Latency Bottlenecks</h4>
                <p className="text-xs text-muted-foreground">
                  One or more LLM generations on the critical path are taking over 1.0s. Consider enabling streaming, reducing max tokens, or switching to a faster model (e.g. gpt-4o-mini or claude-3-5-haiku) to optimize response times.
                </p>
              </div>
            </div>
          ) : null}

          {criticalPathNodes.some((n) => n.hasError) ? (
            <div className="flex gap-4 p-4 rounded-xl border bg-destructive/5 border-destructive/20">
              <div className="p-2 rounded-lg bg-destructive/10 text-destructive h-fit">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-foreground">Resolve Critical Path Failures</h4>
                <p className="text-xs text-muted-foreground">
                  A failure occurred in a critical path step, blocking downstream tasks and causing trace level failure propagation. Implement fallback routes or retry mechanisms specifically for this bottleneck.
                </p>
              </div>
            </div>
          ) : null}

          <div className="flex gap-4 p-4 rounded-xl border bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200/50">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 h-fit">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-foreground">System Clean Execution Check</h4>
              <p className="text-xs text-muted-foreground">
                Ensure upstream and downstream tool call loops are limited. Rate limit checks can be enforced at the Guardrail Proxy to prevent loop amplification on critical paths.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
