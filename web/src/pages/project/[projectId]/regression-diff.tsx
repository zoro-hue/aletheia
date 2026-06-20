import React, { useState } from "react";
import { useRouter } from "next/router";
import Page from "@/src/components/layouts/page";
import { api } from "@/src/utils/api";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/src/components/ui/alert";
import { GitCompare, ArrowRight, Activity, Clock, DollarSign, Plus, Minus, Edit, AlertCircle, Sparkles, HelpCircle } from "lucide-react";

export default function RegressionDiffPage() {
  const router = useRouter();
  const projectId = router.query.projectId as string;

  // Form states
  const [sourceTraceId, setSourceTraceId] = useState("");
  const [targetTraceId, setTargetTraceId] = useState("");
  const [runDiff, setRunDiff] = useState(false);

  // Queries
  const { data: diffResult, isLoading, error } = api.aletheia.computeRegressionDiff.useQuery(
    {
      projectId,
      runATraceId: sourceTraceId,
      runBTraceId: targetTraceId,
    },
    {
      enabled: runDiff && !!sourceTraceId && !!targetTraceId,
      retry: false,
    }
  );

  const handleComputeDiff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceTraceId || !targetTraceId) return;
    setRunDiff(true);
  };

  return (
    <Page
      withPadding
      scrollable
      headerProps={{
        title: "Agent Regression Diffing",
        breadcrumb: [{ name: "Regression Diffing" }],
      }}
    >
      <div className="space-y-6">
        {/* Banner */}
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between p-6 bg-gradient-to-r from-violet-500/10 to-primary/10 rounded-2xl border border-violet-500/20">
          <div className="space-y-2">
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <GitCompare className="h-6 w-6 text-violet-500" /> Compare Agent Execution Trees
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Track divergence and structural regression between agent execution traces. Compare step order, tool calls, costs, and latencies using our tree-edit-distance alignment.
            </p>
          </div>
        </div>

        {/* Inputs */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Select Execution Traces</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleComputeDiff} className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 space-y-1.5 w-full">
                <label className="text-xs font-bold text-muted-foreground uppercase">Baseline Trace ID (e.g. Reference/v1)</label>
                <Input
                  required
                  placeholder="Enter source trace UUID..."
                  value={sourceTraceId}
                  onChange={(e) => {
                    setSourceTraceId(e.target.value);
                    setRunDiff(false);
                  }}
                />
              </div>

              <div className="flex items-center justify-center p-2 text-muted-foreground shrink-0 hidden md:block">
                <ArrowRight className="h-5 w-5" />
              </div>

              <div className="flex-1 space-y-1.5 w-full">
                <label className="text-xs font-bold text-muted-foreground uppercase">Target Trace ID (e.g. Regressed/v2)</label>
                <Input
                  required
                  placeholder="Enter target trace UUID..."
                  value={targetTraceId}
                  onChange={(e) => {
                    setTargetTraceId(e.target.value);
                    setRunDiff(false);
                  }}
                />
              </div>

              <Button type="submit" className="w-full md:w-auto px-6 bg-violet-600 hover:bg-violet-700 text-white font-semibold">
                Compare Traces
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Loading / Error States */}
        {isLoading && (
          <div className="flex h-64 w-full flex-col items-center justify-center gap-4">
            <Activity className="h-8 w-8 animate-spin text-violet-500" />
            <span className="text-sm text-muted-foreground font-semibold">Calculating tree similarity alignment & edit distance...</span>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Divergence Computation Failed</AlertTitle>
            <AlertDescription>
              {error.message || "Failed to locate traces or compute alignment. Ensure trace IDs are correct and belong to this project."}
            </AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {runDiff && !isLoading && !error && diffResult && (
          <div className="space-y-6">
            {/* Alignment Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-background to-violet-500/10 border border-violet-500/20 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tree Alignment Score</CardTitle>
                  <Sparkles className="h-4 w-4 text-violet-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">{(diffResult.similarityScore * 100).toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground mt-1">Overall tree similarity metric</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-background to-accent/20 border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tree Edit Distance</CardTitle>
                  <GitCompare className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">{diffResult.editDistance}</div>
                  <p className="text-xs text-muted-foreground mt-1">Total tree edit operations</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-background to-accent/20 border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Latency Delta</CardTitle>
                  <Clock className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold font-mono ${diffResult.latencyDelta > 0 ? "text-red-500" : "text-emerald-500"}`}>
                    {diffResult.latencyDelta > 0 ? "+" : ""}{(diffResult.latencyDelta / 1000).toFixed(3)}s
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Target vs baseline duration</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-background to-accent/20 border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cost Delta</CardTitle>
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold font-mono ${diffResult.costDelta > 0 ? "text-red-500" : "text-emerald-500"}`}>
                    {diffResult.costDelta > 0 ? "+" : ""}${diffResult.costDelta.toFixed(5)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Target vs baseline USD cost</p>
                </CardContent>
              </Card>
            </div>

            {/* Structured Alignment Diff */}
            <Card className="border">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-bold">Execution Steps Alignment</CardTitle>
                <CardDescription>Aligned execution nodes comparing baseline (left) to target (right).</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-3">
                  {diffResult.nodeChanges.map((op, idx) => {
                    const isInsert = op.changeType === "ADDED";
                    const isDelete = op.changeType === "REMOVED";
                    const isUpdate = op.changeType === "MODIFIED";
                    const isMatch = op.changeType === "UNCHANGED";

                    let bgClass = "bg-accent/10 border-border";
                    let icon = <HelpCircle className="h-4 w-4 text-muted-foreground" />;
                    let badgeText = "Match";
                    let badgeVariant: "secondary" | "default" | "destructive" | "outline" = "outline";

                    if (isInsert) {
                      bgClass = "bg-emerald-50/50 dark:bg-emerald-950/15 border-emerald-200/50 dark:border-emerald-900/30";
                      icon = <Plus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
                      badgeText = "Added";
                      badgeVariant = "default";
                    } else if (isDelete) {
                      bgClass = "bg-red-50/50 dark:bg-red-950/15 border-red-200/50 dark:border-red-900/30";
                      icon = <Minus className="h-4 w-4 text-red-600 dark:text-red-400" />;
                      badgeText = "Removed";
                      badgeVariant = "destructive";
                    } else if (isUpdate) {
                      bgClass = "bg-amber-50/50 dark:bg-amber-950/15 border-amber-200/50 dark:border-amber-900/30";
                      icon = <Edit className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
                      badgeText = "Modified";
                      badgeVariant = "secondary";
                    }

                    const costDetail = op.details.find((d) => d.field === "cost");
                    const costDeltaUsd = costDetail ? ((costDetail.valueB as number) - (costDetail.valueA as number)) : 0;

                    return (
                      <div key={idx} className={`flex items-center gap-4 p-4 rounded-xl border ${bgClass} transition-colors shadow-sm`}>
                        <div className="p-2 rounded-lg bg-background border shrink-0">
                          {icon}
                        </div>

                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Baseline side */}
                          <div className={isInsert ? "opacity-30" : ""}>
                            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Baseline Step</div>
                            {op.nodeA ? (
                              <div className="mt-1">
                                <span className="font-bold text-sm text-foreground">{op.nodeA.name || "Unnamed Step"}</span>
                                <div className="flex gap-2 items-center mt-1">
                                  <Badge variant="outline" className="text-[10px] py-0">{op.nodeA.type}</Badge>
                                  {op.nodeA.model && <Badge variant="secondary" className="text-[10px] py-0">{op.nodeA.model}</Badge>}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic mt-1 block">(None)</span>
                            )}
                          </div>

                          {/* Target side */}
                          <div className={isDelete ? "opacity-30" : ""}>
                            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Target Step</div>
                            {op.nodeB ? (
                              <div className="mt-1">
                                <span className="font-bold text-sm text-foreground">{op.nodeB.name || "Unnamed Step"}</span>
                                <div className="flex gap-2 items-center mt-1">
                                  <Badge variant="outline" className="text-[10px] py-0">{op.nodeB.type}</Badge>
                                  {op.nodeB.model && <Badge variant="secondary" className="text-[10px] py-0">{op.nodeB.model}</Badge>}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic mt-1 block">(None)</span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <Badge variant={badgeVariant} className="font-bold">
                            {badgeText}
                          </Badge>
                          {costDeltaUsd !== 0 && (
                            <div className={`text-xs font-mono font-semibold mt-1.5 ${costDeltaUsd > 0 ? "text-red-500" : "text-emerald-500"}`}>
                              {costDeltaUsd > 0 ? "+" : ""}${costDeltaUsd.toFixed(5)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Page>
  );
}
