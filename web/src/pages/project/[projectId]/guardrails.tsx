import React, { useState } from "react";
import { useRouter } from "next/router";
import Page from "@/src/components/layouts/page";
import { api } from "@/src/utils/api";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Switch } from "@/src/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/src/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { ShieldCheck, Plus, Trash2, Edit2, Play, AlertTriangle, AlertCircle, RefreshCw, Settings } from "lucide-react";
import { showErrorToast } from "@/src/features/notifications/showErrorToast";

export default function GuardrailsPage() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const utils = api.useUtils();

  // Queries
  const { data: policies, isLoading: isLoadingPolicies } = api.aletheia.getPolicies.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  // Mutations
  const createPolicyMutation = api.aletheia.createPolicy.useMutation({
    onSuccess: () => {
      utils.aletheia.getPolicies.invalidate({ projectId });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (err) => {
      showErrorToast("Failed to create policy", err.message);
    },
  });

  const togglePolicyMutation = api.aletheia.updatePolicy.useMutation({
    onSuccess: () => {
      utils.aletheia.getPolicies.invalidate({ projectId });
    },
    onError: (err) => {
      showErrorToast("Failed to update policy", err.message);
    },
  });

  const deletePolicyMutation = api.aletheia.deletePolicy.useMutation({
    onSuccess: () => {
      utils.aletheia.getPolicies.invalidate({ projectId });
    },
    onError: (err) => {
      showErrorToast("Failed to delete policy", err.message);
    },
  });

  // Modal / Form States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPolicyName, setNewPolicyName] = useState("");
  const [newPolicyDesc, setNewPolicyDesc] = useState("");
  const [newPolicyBudget, setNewPolicyBudget] = useState("");
  const [newPolicyRateLimit, setNewPolicyRateLimit] = useState("");
  const [detectorType, setDetectorType] = useState("PII_DETECTION");
  const [detectorPhase, setDetectorPhase] = useState("PRE_REQUEST");
  const [detectorAction, setDetectorAction] = useState("BLOCK");
  const [customPattern, setCustomPattern] = useState("");

  const resetForm = () => {
    setNewPolicyName("");
    setNewPolicyDesc("");
    setNewPolicyBudget("");
    setNewPolicyRateLimit("");
    setDetectorType("PII_DETECTION");
    setDetectorPhase("PRE_REQUEST");
    setDetectorAction("BLOCK");
    setCustomPattern("");
  };

  const handleCreatePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPolicyName) return;

    createPolicyMutation.mutate({
      projectId,
      name: newPolicyName,
      description: newPolicyDesc || undefined,
      budgetLimitUsd: newPolicyBudget ? parseFloat(newPolicyBudget) : null,
      rateLimitRpm: newPolicyRateLimit ? parseInt(newPolicyRateLimit, 10) : null,
      maxToolCallLoops: 10,
      rules: [
        {
          detectorType,
          phase: detectorPhase as "PRE_REQUEST" | "POST_RESPONSE",
          action: detectorAction as "ALLOW" | "BLOCK" | "REDACT" | "MODIFY" | "LOG_ONLY",
          enabled: true,
          customPattern: detectorType === "CUSTOM_REGEX" ? customPattern : undefined,
        },
      ],
    });
  };

  const handleTogglePolicy = (policyId: string, currentEnabled: boolean) => {
    togglePolicyMutation.mutate({
      projectId,
      policyId,
      enabled: !currentEnabled,
    });
  };

  const handleDeletePolicy = (policyId: string) => {
    if (confirm("Are you sure you want to delete this policy?")) {
      deletePolicyMutation.mutate({
        projectId,
        policyId,
      });
    }
  };

  return (
    <Page
      withPadding
      scrollable
      headerProps={{
        title: "Aletheia Guardrails",
        breadcrumb: [{ name: "Guardrail Policies" }],
        actionButtonsRight: (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Create Policy
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Guardrail Policy</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreatePolicy} className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Policy Name</label>
                  <Input
                    required
                    placeholder="e.g. Production Safeguards"
                    value={newPolicyName}
                    onChange={(e) => setNewPolicyName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Description</label>
                  <Input
                    placeholder="Describe what rules are enforced..."
                    value={newPolicyDesc}
                    onChange={(e) => setNewPolicyDesc(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Budget Limit (USD/month)</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Optional"
                      value={newPolicyBudget}
                      onChange={(e) => setNewPolicyBudget(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Rate Limit (RPM)</label>
                    <Input
                      type="number"
                      placeholder="Optional"
                      value={newPolicyRateLimit}
                      onChange={(e) => setNewPolicyRateLimit(e.target.value)}
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-bold mb-3">Add Initial Rule</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Detector Type</label>
                      <Select value={detectorType} onValueChange={setDetectorType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PII_DETECTION">PII Masking</SelectItem>
                          <SelectItem value="PROMPT_INJECTION">Prompt Injection</SelectItem>
                          <SelectItem value="JAILBREAK">Jailbreak Detection</SelectItem>
                          <SelectItem value="SECRET_LEAKAGE">Secret Leakage</SelectItem>
                          <SelectItem value="TOOL_CALL_LOOP">Tool Call Loop Enforcement</SelectItem>
                          <SelectItem value="CUSTOM_REGEX">Custom Regex Pattern</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Action</label>
                      <Select value={detectorAction} onValueChange={setDetectorAction}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BLOCK">Block Request</SelectItem>
                          <SelectItem value="REDACT">Redact Content</SelectItem>
                          <SelectItem value="LOG_ONLY">Log / Flag only</SelectItem>
                          <SelectItem value="ALLOW">Allow through</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {detectorType === "CUSTOM_REGEX" && (
                    <div className="space-y-1.5 mt-3">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Custom Regex Pattern</label>
                      <Input
                        required
                        placeholder="e.g. (API_KEY|SECRET_[A-Z0-9]+)"
                        value={customPattern}
                        onChange={(e) => setCustomPattern(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="space-y-1.5 mt-3">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Enforcement Phase</label>
                    <Select value={detectorPhase} onValueChange={setDetectorPhase}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PRE_REQUEST">Pre-Request (Input Guard)</SelectItem>
                        <SelectItem value="POST_RESPONSE">Post-Response (Output Guard)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter className="pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createPolicyMutation.isPending}>
                    {createPolicyMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        ),
      }}
    >
      <div className="space-y-6">
        {/* Info card banner */}
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between p-6 bg-gradient-to-r from-primary/10 to-indigo-500/10 rounded-2xl border border-primary/20">
          <div className="space-y-2">
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <ShieldCheck className="h-6 w-6 text-primary" /> Active Guardrail Protection
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Configure policies to actively intercept LLM inputs and outputs, detect prompt injections, PII leakage, and tool calling loops synchronously before upstream delivery.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => utils.aletheia.getPolicies.invalidate({ projectId })}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh Status
            </Button>
          </div>
        </div>

        {/* Policies List */}
        {isLoadingPolicies ? (
          <div className="flex justify-center items-center h-48">
            <ActivityIcon className="animate-spin h-8 w-8 text-primary" />
          </div>
        ) : !policies || policies.length === 0 ? (
          <div className="text-center py-16 border rounded-2xl bg-card/50">
            <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-bold text-lg text-foreground">No Policies Created</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Protect your LLM apps by adding your first Guardrail Policy. Define regexes, injection blocklists, or budget boundaries.
            </p>
            <Button className="mt-6" onClick={() => setIsCreateOpen(true)}>
              Get Started
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {policies.map((policy) => (
              <Card key={policy.id} className="relative overflow-hidden border hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-start justify-between pb-3 border-b">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-bold">{policy.name}</CardTitle>
                      <Badge variant={policy.enabled ? "default" : "secondary"}>
                        {policy.enabled ? "Enforcing" : "Disabled"}
                      </Badge>
                    </div>
                    {policy.description && <CardDescription>{policy.description}</CardDescription>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={policy.enabled}
                      onCheckedChange={() => handleTogglePolicy(policy.id, policy.enabled)}
                    />
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeletePolicy(policy.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {/* Stats / Limits */}
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-accent/10 p-3 rounded-lg">
                    <div>
                      <span className="text-muted-foreground uppercase block font-semibold">Budget Limit</span>
                      <span className="text-sm font-bold text-foreground">
                        {policy.budgetLimitUsd ? `$${policy.budgetLimitUsd}/mo` : "Unlimited"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground uppercase block font-semibold">Rate Limit</span>
                      <span className="text-sm font-bold text-foreground">
                        {policy.rateLimitRpm ? `${policy.rateLimitRpm} RPM` : "Unlimited"}
                      </span>
                    </div>
                  </div>

                  {/* Rules list */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Rules</h4>
                    {policy.rules.map((rule) => (
                      <div key={rule.id} className="flex justify-between items-center text-sm border p-3 rounded-xl bg-card shadow-sm">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{rule.detectorType.replace("_", " ")}</span>
                            <Badge variant="outline" className="text-[10px] py-0">{rule.phase}</Badge>
                          </div>
                          {rule.customPattern && (
                            <code className="text-xs text-muted-foreground block bg-accent/20 px-1 py-0.5 rounded font-mono mt-1">
                              Pattern: {rule.customPattern}
                            </code>
                          )}
                        </div>
                        <Badge variant={rule.action === "BLOCK" ? "destructive" : "secondary"}>
                          {rule.action}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}

function ActivityIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
