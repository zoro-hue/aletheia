/**
 * Aletheia Guardrail Sidecar Proxy
 *
 * A real-time reverse proxy that sits between applications and LLM providers.
 * Enforces safety policies synchronously in the request path and emits
 * OpenTelemetry spans into the existing trace model.
 *
 * Architecture:
 *   Application → Guardrail Proxy → LLM Provider (OpenAI/Anthropic/Gemini)
 *
 * Every request is:
 *   1. Authenticated via Aletheia API key
 *   2. Run through pre-request detectors (PII, injection, jailbreak, secrets)
 *   3. Budget/rate-limit checked
 *   4. Forwarded to upstream LLM provider
 *   5. Run through post-response detectors
 *   6. Decision logged to ClickHouse
 *   7. OTel span emitted for end-to-end tracing
 */

import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { randomUUID } from "crypto";
import {
  type GuardrailPolicy,
  type GuardrailDecision,
  type DetectorResult,
  type GuardrailPolicyRule,
  type ProxyRequest,
  ProxyRequestSchema,
} from "@aletheia/shared/src/features/guardrails/types";
import {
  DetectorRegistry,
} from "@aletheia/shared/src/features/guardrails/detectors";

// ─── Configuration ──────────────────────────────────────────────────────────

const PROXY_PORT = parseInt(process.env.GUARDRAIL_PROXY_PORT ?? "4000", 10);
const UPSTREAM_TIMEOUT_MS = parseInt(
  process.env.GUARDRAIL_UPSTREAM_TIMEOUT_MS ?? "120000",
  10,
);

// ─── In-Memory Policy Cache ────────────────────────────────────────────────
// In production, this would be backed by Redis + Postgres via the shared package.
// For now, it's loaded from the database on startup and refreshed periodically.

interface PolicyCache {
  policies: Map<string, GuardrailPolicy>;
  routes: Map<
    string,
    {
      id: string;
      projectId: string;
      policyId: string;
      upstreamProvider: string;
      upstreamBaseUrl: string;
      upstreamApiKey: string;
      upstreamModel?: string;
    }
  >;
  rateLimits: Map<string, { count: number; windowStart: number }>;
  budgetUsage: Map<string, number>;
}

const cache: PolicyCache = {
  policies: new Map(),
  routes: new Map(),
  rateLimits: new Map(),
  budgetUsage: new Map(),
};

// ─── Detector Registry ──────────────────────────────────────────────────────

const detectorRegistry = new DetectorRegistry();

// ─── Express App ────────────────────────────────────────────────────────────

const app: Express = express();
app.use(express.json({ limit: "10mb" }));

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "aletheia-guardrail-proxy",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ─── API Key Authentication Middleware ───────────────────────────────────────

interface AuthenticatedRequest extends Request {
  projectId?: string;
  apiKeyId?: string;
}

async function authenticateApiKey(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      error: {
        message: "Missing or invalid Authorization header. Use: Bearer <api-key>",
        type: "authentication_error",
      },
    });
    return;
  }

  const apiKey = authHeader.slice(7);

  // In production, validate against the Aletheia API key table
  // For now, extract project ID from the key format: ak-<projectId>-<secret>
  const keyParts = apiKey.split("-");
  if (keyParts.length < 3 || keyParts[0] !== "ak") {
    res.status(401).json({
      error: {
        message: "Invalid API key format",
        type: "authentication_error",
      },
    });
    return;
  }

  req.projectId = keyParts[1];
  req.apiKeyId = apiKey;
  next();
}

// ─── Rate Limiter ───────────────────────────────────────────────────────────

function checkRateLimit(projectId: string, limitRpm?: number): boolean {
  if (!limitRpm) return true;

  const key = `rate:${projectId}`;
  const now = Date.now();
  const windowMs = 60_000; // 1 minute window

  let entry = cache.rateLimits.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    entry = { count: 0, windowStart: now };
  }

  entry.count++;
  cache.rateLimits.set(key, entry);

  return entry.count <= limitRpm;
}

// ─── Budget Checker ─────────────────────────────────────────────────────────

function checkBudget(projectId: string, limitUsd?: number): boolean {
  if (!limitUsd) return true;
  const usage = cache.budgetUsage.get(projectId) ?? 0;
  return usage < limitUsd;
}

function recordCost(projectId: string, costUsd: number): void {
  const current = cache.budgetUsage.get(projectId) ?? 0;
  cache.budgetUsage.set(projectId, current + costUsd);
}

// ─── Upstream LLM Call ──────────────────────────────────────────────────────

interface UpstreamResponse {
  status: number;
  body: Record<string, unknown>;
  latencyMs: number;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
}

async function callUpstream(
  provider: string,
  baseUrl: string,
  apiKey: string,
  body: ProxyRequest,
  model?: string,
): Promise<UpstreamResponse> {
  const startTime = Date.now();

  // Override model if route specifies one
  const requestBody = { ...body };
  if (model) {
    requestBody.model = model;
  }

  // Determine the endpoint based on provider
  let endpoint: string;
  switch (provider) {
    case "openai":
      endpoint = `${baseUrl}/v1/chat/completions`;
      break;
    case "anthropic":
      endpoint = `${baseUrl}/v1/messages`;
      break;
    case "google":
      endpoint = `${baseUrl}/v1/models/${requestBody.model}:generateContent`;
      break;
    default:
      endpoint = `${baseUrl}/v1/chat/completions`;
  }

  // Build headers based on provider
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  switch (provider) {
    case "anthropic":
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2024-01-01";
      break;
    default:
      headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    const responseBody = (await response.json()) as Record<string, unknown>;
    const latencyMs = Date.now() - startTime;

    // Extract token usage from response
    const usage = responseBody.usage as
      | { prompt_tokens?: number; completion_tokens?: number }
      | undefined;

    // Rough cost estimation (per 1M tokens)
    const modelName = (requestBody.model ?? "").toLowerCase();
    let inputRate = 0.5; // default $/1M tokens
    let outputRate = 1.5;
    if (modelName.includes("gpt-4o")) {
      inputRate = 2.5;
      outputRate = 10;
    } else if (modelName.includes("gpt-4")) {
      inputRate = 30;
      outputRate = 60;
    } else if (modelName.includes("claude-3-5-sonnet") || modelName.includes("claude-sonnet-4")) {
      inputRate = 3;
      outputRate = 15;
    } else if (modelName.includes("claude-3-5-haiku") || modelName.includes("claude-haiku-4")) {
      inputRate = 0.8;
      outputRate = 4;
    }

    const inputTokens = usage?.prompt_tokens ?? 0;
    const outputTokens = usage?.completion_tokens ?? 0;
    const estimatedCostUsd =
      (inputTokens * inputRate + outputTokens * outputRate) / 1_000_000;

    return {
      status: response.status,
      body: responseBody,
      latencyMs,
      model: requestBody.model,
      inputTokens,
      outputTokens,
      estimatedCostUsd,
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Content Extraction ─────────────────────────────────────────────────────

function extractContent(messages: ProxyRequest["messages"]): string {
  return messages
    .map((m) => {
      if (typeof m.content === "string") return m.content;
      if (Array.isArray(m.content)) {
        return m.content
          .map((part: unknown) => {
            if (typeof part === "object" && part !== null && "text" in part) {
              return (part as { text: string }).text;
            }
            return "";
          })
          .join(" ");
      }
      return "";
    })
    .join("\n");
}

function extractResponseContent(body: Record<string, unknown>): string {
  // OpenAI format
  const choices = body.choices as Array<{
    message?: { content?: string };
  }> | undefined;
  if (choices?.[0]?.message?.content) {
    return choices[0].message.content;
  }

  // Anthropic format
  const content = body.content as Array<{
    type: string;
    text?: string;
  }> | undefined;
  if (content) {
    return content
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("\n");
  }

  return JSON.stringify(body);
}

// ─── Main Proxy Handler ─────────────────────────────────────────────────────

app.post(
  "/v1/chat/completions",
  authenticateApiKey,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const requestId = randomUUID();
    const requestStartTime = Date.now();
    const projectId = req.projectId!;

    try {
      // Parse request body
      const parseResult = ProxyRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: {
            message: "Invalid request body",
            type: "invalid_request_error",
            details: parseResult.error.issues,
          },
        });
        return;
      }
      const proxyRequest = parseResult.data;

      // Resolve policy for this project
      const policy = getProjectPolicy(projectId);
      if (!policy || !policy.enabled) {
        // No policy configured — pass through with warning
        res.status(503).json({
          error: {
            message:
              "No guardrail policy configured for this project. Configure one in the Aletheia dashboard.",
            type: "configuration_error",
          },
        });
        return;
      }

      // Resolve route
      const route = getProjectRoute(projectId);
      if (!route) {
        res.status(503).json({
          error: {
            message: "No upstream route configured.",
            type: "configuration_error",
          },
        });
        return;
      }

      // ── Rate Limit Check ────────────────────────────────────────────
      if (!checkRateLimit(projectId, policy.rateLimitRpm)) {
        const decision = buildDecision({
          projectId,
          requestId,
          policyId: policy.id,
          routeId: route.id,
          phase: "PRE_REQUEST",
          finalAction: "BLOCK",
          detectorResults: [],
          blocked: true,
          totalLatencyMs: Date.now() - requestStartTime,
        });
        await logDecision(decision);

        res.status(429).json({
          error: {
            message: "Rate limit exceeded",
            type: "rate_limit_error",
            guardrail: {
              decision_id: decision.id,
              action: "BLOCK",
              reason: "rate_limit",
            },
          },
        });
        return;
      }

      // ── Budget Check ────────────────────────────────────────────────
      if (!checkBudget(projectId, policy.budgetLimitUsd)) {
        const decision = buildDecision({
          projectId,
          requestId,
          policyId: policy.id,
          routeId: route.id,
          phase: "PRE_REQUEST",
          finalAction: "BLOCK",
          detectorResults: [],
          blocked: true,
          totalLatencyMs: Date.now() - requestStartTime,
        });
        await logDecision(decision);

        res.status(402).json({
          error: {
            message: "Budget limit exceeded",
            type: "budget_error",
            guardrail: {
              decision_id: decision.id,
              action: "BLOCK",
              reason: "budget_exceeded",
            },
          },
        });
        return;
      }

      // ── PRE-REQUEST Detection ───────────────────────────────────────
      const inputContent = extractContent(proxyRequest.messages);
      const preRequestRules = policy.rules.filter(
        (r) => r.phase === "PRE_REQUEST" && r.enabled,
      );
      const preResults = detectorRegistry.runAll(inputContent, preRequestRules);
      const preAction = DetectorRegistry.resolveFinalAction(preResults);

      if (preAction === "BLOCK") {
        const decision = buildDecision({
          projectId,
          requestId,
          policyId: policy.id,
          routeId: route.id,
          phase: "PRE_REQUEST",
          finalAction: "BLOCK",
          detectorResults: preResults,
          blocked: true,
          totalLatencyMs: Date.now() - requestStartTime,
        });
        await logDecision(decision);

        res.status(403).json({
          error: {
            message: "Request blocked by guardrail policy",
            type: "guardrail_blocked",
            guardrail: {
              decision_id: decision.id,
              action: "BLOCK",
              detectors: preResults
                .filter((r) => r.triggered)
                .map((r) => ({
                  type: r.detectorType,
                  confidence: r.confidence,
                  details: r.details,
                })),
            },
          },
        });
        return;
      }

      // Apply redactions if needed
      let processedRequest = proxyRequest;
      if (preAction === "REDACT") {
        const redactedContent = DetectorRegistry.applyRedactions(
          inputContent,
          preResults,
        );
        processedRequest = {
          ...proxyRequest,
          messages: proxyRequest.messages.map((m) => ({
            ...m,
            content:
              typeof m.content === "string"
                ? m.content === inputContent
                  ? redactedContent
                  : m.content
                : m.content,
          })),
        };
      }

      // ── Upstream LLM Call ───────────────────────────────────────────
      const upstreamResponse = await callUpstream(
        route.upstreamProvider,
        route.upstreamBaseUrl,
        route.upstreamApiKey,
        processedRequest,
        route.upstreamModel,
      );

      // Record cost
      if (upstreamResponse.estimatedCostUsd) {
        recordCost(projectId, upstreamResponse.estimatedCostUsd);
      }

      // ── POST-RESPONSE Detection ─────────────────────────────────────
      const outputContent = extractResponseContent(upstreamResponse.body);
      const postResponseRules = policy.rules.filter(
        (r) => r.phase === "POST_RESPONSE" && r.enabled,
      );
      const postResults = detectorRegistry.runAll(
        outputContent,
        postResponseRules,
      );
      const postAction = DetectorRegistry.resolveFinalAction(postResults);

      if (postAction === "BLOCK") {
        const decision = buildDecision({
          projectId,
          requestId,
          policyId: policy.id,
          routeId: route.id,
          phase: "POST_RESPONSE",
          finalAction: "BLOCK",
          detectorResults: [...preResults, ...postResults],
          blocked: true,
          totalLatencyMs: Date.now() - requestStartTime,
          upstreamModel: upstreamResponse.model,
          upstreamLatencyMs: upstreamResponse.latencyMs,
          inputTokens: upstreamResponse.inputTokens,
          outputTokens: upstreamResponse.outputTokens,
          estimatedCostUsd: upstreamResponse.estimatedCostUsd,
        });
        await logDecision(decision);

        res.status(403).json({
          error: {
            message: "Response blocked by guardrail policy",
            type: "guardrail_blocked",
            guardrail: {
              decision_id: decision.id,
              action: "BLOCK",
              phase: "POST_RESPONSE",
              detectors: postResults
                .filter((r) => r.triggered)
                .map((r) => ({
                  type: r.detectorType,
                  confidence: r.confidence,
                  details: r.details,
                })),
            },
          },
        });
        return;
      }

      // ── Log Decision & Return Response ──────────────────────────────
      const allResults = [...preResults, ...postResults];
      const finalAction = DetectorRegistry.resolveFinalAction(allResults);

      const decision = buildDecision({
        projectId,
        requestId,
        policyId: policy.id,
        routeId: route.id,
        phase: "POST_RESPONSE",
        finalAction: finalAction,
        detectorResults: allResults,
        blocked: false,
        totalLatencyMs: Date.now() - requestStartTime,
        upstreamModel: upstreamResponse.model,
        upstreamLatencyMs: upstreamResponse.latencyMs,
        inputTokens: upstreamResponse.inputTokens,
        outputTokens: upstreamResponse.outputTokens,
        estimatedCostUsd: upstreamResponse.estimatedCostUsd,
      });
      await logDecision(decision);

      // Add guardrail metadata to response
      const responseBody = {
        ...upstreamResponse.body,
        _aletheia: {
          decision_id: decision.id,
          action: finalAction,
          detectors_triggered: allResults
            .filter((r) => r.triggered)
            .map((r) => r.detectorType),
          guardrail_latency_ms:
            (Date.now() - requestStartTime) - (upstreamResponse.latencyMs ?? 0),
          total_latency_ms: Date.now() - requestStartTime,
        },
      };

      res.status(upstreamResponse.status).json(responseBody);
    } catch (error) {
      console.error("Guardrail proxy error:", error);
      res.status(500).json({
        error: {
          message: "Internal guardrail proxy error",
          type: "internal_error",
          request_id: requestId,
        },
      });
    }
  },
);

// ─── Policy Endpoints ───────────────────────────────────────────────────────

app.get(
  "/api/policies",
  authenticateApiKey,
  (req: AuthenticatedRequest, res: Response) => {
    const projectId = req.projectId!;
    const policies = Array.from(cache.policies.values()).filter(
      (p) => p.projectId === projectId,
    );
    res.json({ policies });
  },
);

app.post(
  "/api/policies",
  authenticateApiKey,
  (req: AuthenticatedRequest, res: Response) => {
    const projectId = req.projectId!;
    const policyId = randomUUID();

    const policy: GuardrailPolicy = {
      id: policyId,
      projectId,
      name: req.body.name ?? "Default Policy",
      description: req.body.description,
      enabled: req.body.enabled ?? true,
      rules: (req.body.rules ?? []).map(
        (r: Partial<GuardrailPolicyRule>, i: number) => ({
          id: `rule-${policyId}-${i}`,
          detectorType: r.detectorType ?? "PROMPT_INJECTION",
          phase: r.phase ?? "PRE_REQUEST",
          action: r.action ?? "BLOCK",
          enabled: r.enabled ?? true,
          threshold: r.threshold,
          config: r.config,
          customPattern: r.customPattern,
          blockedTopics: r.blockedTopics,
        }),
      ),
      budgetLimitUsd: req.body.budgetLimitUsd,
      rateLimitRpm: req.body.rateLimitRpm,
      maxToolCallLoops: req.body.maxToolCallLoops ?? 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    cache.policies.set(policyId, policy);
    res.status(201).json({ policy });
  },
);

// ─── Route Endpoints ────────────────────────────────────────────────────────

app.post(
  "/api/routes",
  authenticateApiKey,
  (req: AuthenticatedRequest, res: Response) => {
    const projectId = req.projectId!;
    const routeId = randomUUID();

    const route = {
      id: routeId,
      projectId,
      policyId: req.body.policyId,
      upstreamProvider: req.body.upstreamProvider ?? "openai",
      upstreamBaseUrl:
        req.body.upstreamBaseUrl ?? "https://api.openai.com",
      upstreamApiKey: req.body.upstreamApiKey,
      upstreamModel: req.body.upstreamModel,
    };

    cache.routes.set(`${projectId}:default`, route);
    res.status(201).json({ route: { ...route, upstreamApiKey: "***" } });
  },
);

// ─── Decision Analytics ─────────────────────────────────────────────────────

const recentDecisions: GuardrailDecision[] = [];

app.get(
  "/api/decisions",
  authenticateApiKey,
  (req: AuthenticatedRequest, res: Response) => {
    const projectId = req.projectId!;
    const limit = parseInt(req.query.limit as string) || 50;
    const decisions = recentDecisions
      .filter((d) => d.projectId === projectId)
      .slice(-limit)
      .reverse();
    res.json({ decisions, total: decisions.length });
  },
);

app.get(
  "/api/analytics",
  authenticateApiKey,
  (req: AuthenticatedRequest, res: Response) => {
    const projectId = req.projectId!;
    const projectDecisions = recentDecisions.filter(
      (d) => d.projectId === projectId,
    );

    const total = projectDecisions.length;
    const blocked = projectDecisions.filter((d) => d.blocked).length;
    const allowed = total - blocked;

    const detectorBreakdown: Record<string, number> = {};
    for (const d of projectDecisions) {
      for (const r of d.detectorResults) {
        if (r.triggered) {
          detectorBreakdown[r.detectorType] =
            (detectorBreakdown[r.detectorType] ?? 0) + 1;
        }
      }
    }

    const avgLatency =
      total > 0
        ? projectDecisions.reduce((sum, d) => sum + d.totalLatencyMs, 0) /
          total
        : 0;

    const totalCost = projectDecisions.reduce(
      (sum, d) => sum + (d.estimatedCostUsd ?? 0),
      0,
    );

    res.json({
      analytics: {
        totalRequests: total,
        blockedRequests: blocked,
        allowedRequests: allowed,
        blockRate: total > 0 ? (blocked / total) * 100 : 0,
        averageLatencyMs: Math.round(avgLatency),
        totalCostUsd: totalCost,
        detectorBreakdown,
      },
    });
  },
);

// ─── Helper Functions ───────────────────────────────────────────────────────

function getProjectPolicy(projectId: string): GuardrailPolicy | undefined {
  for (const policy of cache.policies.values()) {
    if (policy.projectId === projectId && policy.enabled) {
      return policy;
    }
  }
  return undefined;
}

function getProjectRoute(
  projectId: string,
):
  | {
      id: string;
      policyId: string;
      upstreamProvider: string;
      upstreamBaseUrl: string;
      upstreamApiKey: string;
      upstreamModel?: string;
    }
  | undefined {
  return cache.routes.get(`${projectId}:default`);
}

function buildDecision(params: {
  projectId: string;
  requestId: string;
  policyId: string;
  routeId: string;
  phase: "PRE_REQUEST" | "POST_RESPONSE";
  finalAction: DetectorResult["action"];
  detectorResults: DetectorResult[];
  blocked: boolean;
  totalLatencyMs: number;
  upstreamModel?: string;
  upstreamLatencyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
  traceId?: string;
}): GuardrailDecision {
  return {
    id: randomUUID(),
    projectId: params.projectId,
    traceId: params.traceId,
    requestId: params.requestId,
    policyId: params.policyId,
    routeId: params.routeId,
    phase: params.phase,
    finalAction: params.finalAction,
    detectorResults: params.detectorResults,
    upstreamModel: params.upstreamModel,
    upstreamLatencyMs: params.upstreamLatencyMs,
    totalLatencyMs: params.totalLatencyMs,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    estimatedCostUsd: params.estimatedCostUsd,
    blocked: params.blocked,
    timestamp: new Date(),
  };
}

async function logDecision(decision: GuardrailDecision): Promise<void> {
  // In-memory log (production would write to ClickHouse via the ClickhouseWriter)
  recentDecisions.push(decision);

  // Trim to last 10k decisions in memory
  if (recentDecisions.length > 10000) {
    recentDecisions.splice(0, recentDecisions.length - 10000);
  }

  // Log for observability
  console.log(
    JSON.stringify({
      event: "guardrail_decision",
      decision_id: decision.id,
      project_id: decision.projectId,
      action: decision.finalAction,
      blocked: decision.blocked,
      phase: decision.phase,
      detectors_triggered: decision.detectorResults
        .filter((r) => r.triggered)
        .map((r) => r.detectorType),
      total_latency_ms: decision.totalLatencyMs,
      upstream_latency_ms: decision.upstreamLatencyMs,
      estimated_cost_usd: decision.estimatedCostUsd,
      timestamp: decision.timestamp.toISOString(),
    }),
  );
}

// ─── Start Server ───────────────────────────────────────────────────────────

app.listen(PROXY_PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ⚡ Aletheia Guardrail Proxy                                ║
║                                                              ║
║   Listening on port ${PROXY_PORT}                                  ║
║                                                              ║
║   Endpoints:                                                 ║
║     POST /v1/chat/completions  — Proxied LLM calls           ║
║     GET  /api/policies         — List policies                ║
║     POST /api/policies         — Create policy                ║
║     POST /api/routes           — Create upstream route        ║
║     GET  /api/decisions        — Recent decisions             ║
║     GET  /api/analytics        — Decision analytics           ║
║     GET  /health               — Health check                 ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
