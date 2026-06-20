import { z } from "zod";

// ─── Detector Types ─────────────────────────────────────────────────────────

export const GuardrailDetectorType = z.enum([
  "PROMPT_INJECTION",
  "JAILBREAK",
  "PII_DETECTION",
  "SECRET_LEAKAGE",
  "TOOL_CALL_LOOP",
  "SCHEMA_VALIDATION",
  "TOPIC_RESTRICTION",
  "TOXICITY",
  "CUSTOM_REGEX",
]);
export type GuardrailDetectorType = z.infer<typeof GuardrailDetectorType>;

export const GuardrailAction = z.enum([
  "ALLOW",
  "BLOCK",
  "REDACT",
  "MODIFY",
  "LOG_ONLY",
]);
export type GuardrailAction = z.infer<typeof GuardrailAction>;

export const GuardrailPhase = z.enum(["PRE_REQUEST", "POST_RESPONSE"]);
export type GuardrailPhase = z.infer<typeof GuardrailPhase>;

// ─── Policy Rule Schema ─────────────────────────────────────────────────────

export const GuardrailPolicyRuleSchema = z.object({
  id: z.string(),
  detectorType: GuardrailDetectorType,
  phase: GuardrailPhase,
  action: GuardrailAction,
  enabled: z.boolean().default(true),
  config: z.record(z.string(), z.unknown()).optional(),
  threshold: z.number().min(0).max(1).optional(),
  customPattern: z.string().optional(), // For CUSTOM_REGEX
  blockedTopics: z.array(z.string()).optional(), // For TOPIC_RESTRICTION
});
export type GuardrailPolicyRule = z.infer<typeof GuardrailPolicyRuleSchema>;

// ─── Policy Schema ──────────────────────────────────────────────────────────

export const GuardrailPolicySchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  rules: z.array(GuardrailPolicyRuleSchema),
  budgetLimitUsd: z.number().positive().optional(),
  rateLimitRpm: z.number().int().positive().optional(),
  maxToolCallLoops: z.number().int().positive().default(10),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type GuardrailPolicy = z.infer<typeof GuardrailPolicySchema>;

// ─── Route Schema ───────────────────────────────────────────────────────────

export const GuardrailRouteSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  policyId: z.string(),
  name: z.string(),
  upstreamProvider: z.enum([
    "openai",
    "anthropic",
    "google",
    "azure",
    "bedrock",
    "custom",
  ]),
  upstreamBaseUrl: z.string().url(),
  upstreamApiKeyEncrypted: z.string(),
  upstreamModel: z.string().optional(),
  enabled: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type GuardrailRoute = z.infer<typeof GuardrailRouteSchema>;

// ─── Detector Result ────────────────────────────────────────────────────────

export const DetectorResultSchema = z.object({
  detectorType: GuardrailDetectorType,
  triggered: z.boolean(),
  confidence: z.number().min(0).max(1),
  action: GuardrailAction,
  details: z.string().optional(),
  findings: z
    .array(
      z.object({
        type: z.string(),
        value: z.string(),
        location: z.string().optional(),
        redactedValue: z.string().optional(),
      }),
    )
    .optional(),
  latencyMs: z.number(),
});
export type DetectorResult = z.infer<typeof DetectorResultSchema>;

// ─── Decision Schema ────────────────────────────────────────────────────────

export const GuardrailDecisionSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  traceId: z.string().optional(),
  requestId: z.string(),
  policyId: z.string(),
  routeId: z.string(),
  phase: GuardrailPhase,
  finalAction: GuardrailAction,
  detectorResults: z.array(DetectorResultSchema),
  upstreamModel: z.string().optional(),
  upstreamLatencyMs: z.number().optional(),
  totalLatencyMs: z.number(),
  inputTokens: z.number().optional(),
  outputTokens: z.number().optional(),
  estimatedCostUsd: z.number().optional(),
  blocked: z.boolean(),
  timestamp: z.date(),
});
export type GuardrailDecision = z.infer<typeof GuardrailDecisionSchema>;

// ─── Proxy Request / Response ───────────────────────────────────────────────

export const ProxyRequestSchema = z.object({
  model: z.string().optional(),
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant", "tool", "function"]),
      content: z.union([z.string(), z.array(z.unknown()), z.null()]),
      name: z.string().optional(),
      tool_calls: z.array(z.unknown()).optional(),
      tool_call_id: z.string().optional(),
    }),
  ),
  temperature: z.number().optional(),
  max_tokens: z.number().optional(),
  stream: z.boolean().optional(),
  tools: z.array(z.unknown()).optional(),
  tool_choice: z.unknown().optional(),
  response_format: z.unknown().optional(),
  // Pass-through for any provider-specific fields
}).passthrough();
export type ProxyRequest = z.infer<typeof ProxyRequestSchema>;

// ─── PII Patterns ───────────────────────────────────────────────────────────

export const PII_PATTERNS = {
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  PHONE: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g,
  SSN: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
  CREDIT_CARD:
    /\b(?:4\d{3}|5[1-5]\d{2}|6(?:011|5\d{2})|3[47]\d{2})[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{1,4}\b/g,
  IP_ADDRESS:
    /\b(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
  AWS_KEY: /(?:AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}/g,
  PRIVATE_KEY:
    /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA )?PRIVATE KEY-----/g,
  API_KEY:
    /\b(?:sk-[a-zA-Z0-9]{32,}|ghp_[a-zA-Z0-9]{36}|glpat-[a-zA-Z0-9\-_]{20,})\b/g,
} as const;

// ─── Prompt Injection Patterns ──────────────────────────────────────────────

export const INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?(?:previous|above|prior)\s+(?:instructions?|prompts?|commands?|context)/i,
  /disregard\s+(?:all\s+)?(?:previous|above|prior)\s+(?:instructions?|prompts?)/i,
  /forget\s+(?:all\s+)?(?:previous|above|prior|your)\s+(?:instructions?|prompts?|rules?)/i,
  /you\s+are\s+now\s+(?:a\s+)?(?:different|new)\s+(?:AI|assistant|model|chatbot)/i,
  /pretend\s+(?:you\s+are|to\s+be|you're)\s+(?:a\s+)?(?!.*(?:customer|user))/i,
  /act\s+as\s+(?:if\s+)?(?:you\s+(?:are|were|have)\s+)?(?:a\s+)?(?:different|new|unrestricted)/i,
  /\bDAN\b.*\bjailbreak\b/i,
  /bypass\s+(?:your\s+)?(?:safety|content|ethical)\s+(?:filters?|guidelines?|restrictions?)/i,
  /override\s+(?:your\s+)?(?:safety|content|system)\s+(?:prompt|instructions?|settings?)/i,
  /\bsystem\s*:\s*/i, // Attempting to inject system-level prompts
  /\[SYSTEM\]/i,
  /<<\s*SYS\s*>>/i,
] as const;

// ─── Secret Patterns ────────────────────────────────────────────────────────

export const SECRET_PATTERNS = {
  GENERIC_SECRET:
    /(?:secret|password|passwd|token|auth|api.?key|access.?key|private.?key|credential)[\s]*[=:]\s*['"]?[^\s'"]{8,}/gi,
  JWT: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  GITHUB_TOKEN: /ghp_[a-zA-Z0-9]{36}/g,
  SLACK_TOKEN: /xox[bpas]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,34}/g,
  STRIPE_KEY: /(?:sk|pk)_(?:test|live)_[a-zA-Z0-9]{24,99}/g,
  OPENAI_KEY: /sk-[a-zA-Z0-9]{32,}/g,
  ANTHROPIC_KEY: /sk-ant-[a-zA-Z0-9\-_]{32,}/g,
} as const;
