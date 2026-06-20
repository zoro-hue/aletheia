/**
 * Aletheia Guardrail Detectors
 *
 * Production-grade content analysis detectors that run synchronously
 * in the proxy request path. Each detector returns a DetectorResult
 * with confidence scores and actionable findings.
 */

import {
  type DetectorResult,
  type GuardrailPolicyRule,
  PII_PATTERNS,
  INJECTION_PATTERNS,
  SECRET_PATTERNS,
} from "./types";

// ─── Base Detector Interface ────────────────────────────────────────────────

export interface Detector {
  readonly type: string;
  analyze(content: string, rule: GuardrailPolicyRule): DetectorResult;
}

// ─── PII Detector ───────────────────────────────────────────────────────────

export class PiiDetector implements Detector {
  readonly type = "PII_DETECTION";

  analyze(content: string, rule: GuardrailPolicyRule): DetectorResult {
    const startTime = Date.now();
    const findings: DetectorResult["findings"] = [];

    for (const [piiType, pattern] of Object.entries(PII_PATTERNS)) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match: RegExpExecArray | null;
      while ((match = regex.exec(content)) !== null) {
        const value = match[0];
        findings.push({
          type: piiType,
          value: value.slice(0, 4) + "*".repeat(Math.max(0, value.length - 4)),
          location: `offset:${match.index}`,
          redactedValue: "[REDACTED_" + piiType + "]",
        });
      }
    }

    const triggered = findings.length > 0;
    const confidence = triggered ? Math.min(1, findings.length * 0.3 + 0.5) : 0;
    const threshold = rule.threshold ?? 0.5;

    return {
      detectorType: "PII_DETECTION",
      triggered: triggered && confidence >= threshold,
      confidence,
      action: triggered && confidence >= threshold ? rule.action : "ALLOW",
      details: triggered
        ? `Found ${findings.length} PII instance(s): ${[...new Set(findings.map((f) => f.type))].join(", ")}`
        : undefined,
      findings,
      latencyMs: Date.now() - startTime,
    };
  }
}

// ─── Prompt Injection Detector ──────────────────────────────────────────────

export class PromptInjectionDetector implements Detector {
  readonly type = "PROMPT_INJECTION";

  analyze(content: string, rule: GuardrailPolicyRule): DetectorResult {
    const startTime = Date.now();
    const findings: DetectorResult["findings"] = [];
    let maxConfidence = 0;

    for (const pattern of INJECTION_PATTERNS) {
      const match = content.match(pattern);
      if (match) {
        const confidence = this.scoreMatch(match[0], content);
        maxConfidence = Math.max(maxConfidence, confidence);
        findings.push({
          type: "INJECTION_PATTERN",
          value: match[0].slice(0, 100),
          location: `pattern:${pattern.source.slice(0, 50)}`,
        });
      }
    }

    // Check for delimiter-based injections
    const delimiterScore = this.checkDelimiters(content);
    maxConfidence = Math.max(maxConfidence, delimiterScore);

    const triggered = findings.length > 0 || delimiterScore > 0.5;
    const threshold = rule.threshold ?? 0.6;

    return {
      detectorType: "PROMPT_INJECTION",
      triggered: triggered && maxConfidence >= threshold,
      confidence: maxConfidence,
      action:
        triggered && maxConfidence >= threshold ? rule.action : "ALLOW",
      details: triggered
        ? `Detected ${findings.length} injection pattern(s) with confidence ${maxConfidence.toFixed(2)}`
        : undefined,
      findings,
      latencyMs: Date.now() - startTime,
    };
  }

  private scoreMatch(match: string, fullContent: string): number {
    // Longer matches relative to content are higher confidence
    const lengthRatio = match.length / fullContent.length;
    // Base confidence from pattern match
    let confidence = 0.6;
    // Boost if the match appears early (system prompt injection attempt)
    const position = fullContent.indexOf(match);
    if (position < fullContent.length * 0.2) {
      confidence += 0.15;
    }
    // Boost for longer, more deliberate injections
    if (lengthRatio > 0.1) {
      confidence += 0.1;
    }
    return Math.min(1, confidence);
  }

  private checkDelimiters(content: string): number {
    const delimiterPatterns = [
      /```\s*(?:system|prompt|instructions?)/i,
      /---\s*(?:SYSTEM|BEGIN|NEW)\s*---/i,
      /<\|(?:im_start|system|endoftext)\|>/i,
      /\[INST\]|\[\/INST\]/i,
    ];

    let score = 0;
    for (const pattern of delimiterPatterns) {
      if (pattern.test(content)) {
        score = Math.max(score, 0.75);
      }
    }
    return score;
  }
}

// ─── Jailbreak Detector ─────────────────────────────────────────────────────

export class JailbreakDetector implements Detector {
  readonly type = "JAILBREAK";

  private readonly jailbreakIndicators = [
    /\bDAN\b/i,
    /\bdo anything now\b/i,
    /\bjailbreak\b/i,
    /\bunfiltered\b.*\bmode\b/i,
    /\bdeveloper\s+mode\b/i,
    /\bgod\s+mode\b/i,
    /\bno\s+(?:ethical|moral|safety)\s+(?:guidelines?|restrictions?|constraints?)\b/i,
    /\banti-?ai\b/i,
    /\bremove\s+(?:all\s+)?(?:filters?|restrictions?|limitations?)\b/i,
    /\bact\s+(?:without|outside)\s+(?:any\s+)?(?:constraints?|limitations?|rules?)\b/i,
    /\brespond\s+without\s+(?:any\s+)?(?:censorship|filtering|limitations?)\b/i,
    /\bpretend\s+(?:there\s+are\s+)?no\s+rules?\b/i,
    /\bimagine\s+you\s+(?:have|had)\s+no\s+(?:restrictions?|limitations?|rules?)\b/i,
    /\brole\s*play\b.*\b(?:evil|villain|unrestricted|uncensored)\b/i,
  ];

  analyze(content: string, rule: GuardrailPolicyRule): DetectorResult {
    const startTime = Date.now();
    const findings: DetectorResult["findings"] = [];
    let maxConfidence = 0;

    for (const pattern of this.jailbreakIndicators) {
      const match = content.match(pattern);
      if (match) {
        const confidence = 0.7 + (findings.length * 0.08);
        maxConfidence = Math.max(maxConfidence, Math.min(1, confidence));
        findings.push({
          type: "JAILBREAK_PATTERN",
          value: match[0].slice(0, 100),
          location: `pattern:${pattern.source.slice(0, 50)}`,
        });
      }
    }

    // Multi-indicator boost
    if (findings.length >= 3) {
      maxConfidence = Math.min(1, maxConfidence + 0.15);
    }

    const threshold = rule.threshold ?? 0.65;
    const triggered = findings.length > 0 && maxConfidence >= threshold;

    return {
      detectorType: "JAILBREAK",
      triggered,
      confidence: maxConfidence,
      action: triggered ? rule.action : "ALLOW",
      details: triggered
        ? `Detected ${findings.length} jailbreak indicator(s) with confidence ${maxConfidence.toFixed(2)}`
        : undefined,
      findings,
      latencyMs: Date.now() - startTime,
    };
  }
}

// ─── Secret Leakage Detector ────────────────────────────────────────────────

export class SecretLeakageDetector implements Detector {
  readonly type = "SECRET_LEAKAGE";

  analyze(content: string, rule: GuardrailPolicyRule): DetectorResult {
    const startTime = Date.now();
    const findings: DetectorResult["findings"] = [];

    for (const [secretType, pattern] of Object.entries(SECRET_PATTERNS)) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match: RegExpExecArray | null;
      while ((match = regex.exec(content)) !== null) {
        findings.push({
          type: secretType,
          value: match[0].slice(0, 8) + "..." + match[0].slice(-4),
          location: `offset:${match.index}`,
          redactedValue: "[REDACTED_SECRET]",
        });
      }
    }

    const triggered = findings.length > 0;
    const confidence = triggered ? 0.95 : 0; // Secrets are high-confidence matches

    return {
      detectorType: "SECRET_LEAKAGE",
      triggered,
      confidence,
      action: triggered ? rule.action : "ALLOW",
      details: triggered
        ? `Found ${findings.length} potential secret(s): ${[...new Set(findings.map((f) => f.type))].join(", ")}`
        : undefined,
      findings,
      latencyMs: Date.now() - startTime,
    };
  }
}

// ─── Tool Call Loop Detector ────────────────────────────────────────────────

export class ToolCallLoopDetector implements Detector {
  readonly type = "TOOL_CALL_LOOP";

  // Tracks tool calls per request for loop detection
  private toolCallHistory: Map<string, { name: string; count: number }[]> =
    new Map();

  analyze(
    content: string,
    rule: GuardrailPolicyRule,
    requestId?: string,
    toolCalls?: Array<{ function?: { name: string } }>,
  ): DetectorResult {
    const startTime = Date.now();
    const maxLoops = (rule.config?.maxToolCallLoops as number) ?? 10;

    if (!requestId || !toolCalls || toolCalls.length === 0) {
      return {
        detectorType: "TOOL_CALL_LOOP",
        triggered: false,
        confidence: 0,
        action: "ALLOW",
        latencyMs: Date.now() - startTime,
      };
    }

    // Get or initialize history for this request
    let history = this.toolCallHistory.get(requestId) ?? [];

    for (const tc of toolCalls) {
      const name = tc.function?.name ?? "unknown";
      const existing = history.find((h) => h.name === name);
      if (existing) {
        existing.count++;
      } else {
        history.push({ name, count: 1 });
      }
    }

    this.toolCallHistory.set(requestId, history);

    // Check for loops
    const loopingTools = history.filter((h) => h.count > maxLoops);
    const triggered = loopingTools.length > 0;
    const maxCount = Math.max(0, ...history.map((h) => h.count));
    const confidence = triggered
      ? Math.min(1, 0.5 + (maxCount - maxLoops) * 0.1)
      : maxCount / maxLoops;

    // Cleanup old entries (simple TTL-based)
    if (this.toolCallHistory.size > 10000) {
      const keys = Array.from(this.toolCallHistory.keys());
      for (const key of keys.slice(0, 5000)) {
        this.toolCallHistory.delete(key);
      }
    }

    return {
      detectorType: "TOOL_CALL_LOOP",
      triggered,
      confidence,
      action: triggered ? rule.action : "ALLOW",
      details: triggered
        ? `Tool call loop detected: ${loopingTools.map((t) => `${t.name}(${t.count}x)`).join(", ")} exceeds limit of ${maxLoops}`
        : undefined,
      findings: loopingTools.map((t) => ({
        type: "TOOL_LOOP",
        value: `${t.name}: ${t.count} calls`,
      })),
      latencyMs: Date.now() - startTime,
    };
  }
}

// ─── Custom Regex Detector ──────────────────────────────────────────────────

export class CustomRegexDetector implements Detector {
  readonly type = "CUSTOM_REGEX";

  analyze(content: string, rule: GuardrailPolicyRule): DetectorResult {
    const startTime = Date.now();

    if (!rule.customPattern) {
      return {
        detectorType: "CUSTOM_REGEX",
        triggered: false,
        confidence: 0,
        action: "ALLOW",
        latencyMs: Date.now() - startTime,
      };
    }

    try {
      const regex = new RegExp(rule.customPattern, "gi");
      const matches: string[] = [];
      let match: RegExpExecArray | null;
      while ((match = regex.exec(content)) !== null) {
        matches.push(match[0]);
        if (matches.length >= 100) break; // Safety limit
      }

      const triggered = matches.length > 0;
      return {
        detectorType: "CUSTOM_REGEX",
        triggered,
        confidence: triggered ? 0.9 : 0,
        action: triggered ? rule.action : "ALLOW",
        details: triggered
          ? `Custom pattern matched ${matches.length} time(s)`
          : undefined,
        findings: matches.map((m) => ({
          type: "CUSTOM_MATCH",
          value: m.slice(0, 100),
        })),
        latencyMs: Date.now() - startTime,
      };
    } catch {
      return {
        detectorType: "CUSTOM_REGEX",
        triggered: false,
        confidence: 0,
        action: "ALLOW",
        details: "Invalid regex pattern",
        latencyMs: Date.now() - startTime,
      };
    }
  }
}

// ─── Detector Registry ──────────────────────────────────────────────────────

export class DetectorRegistry {
  private detectors: Map<string, Detector> = new Map();

  constructor() {
    this.register(new PiiDetector());
    this.register(new PromptInjectionDetector());
    this.register(new JailbreakDetector());
    this.register(new SecretLeakageDetector());
    this.register(new ToolCallLoopDetector());
    this.register(new CustomRegexDetector());
  }

  register(detector: Detector): void {
    this.detectors.set(detector.type, detector);
  }

  get(type: string): Detector | undefined {
    return this.detectors.get(type);
  }

  runAll(
    content: string,
    rules: GuardrailPolicyRule[],
  ): DetectorResult[] {
    const results: DetectorResult[] = [];

    for (const rule of rules) {
      if (!rule.enabled) continue;

      const detector = this.detectors.get(rule.detectorType);
      if (!detector) continue;

      const result = detector.analyze(content, rule);
      results.push(result);
    }

    return results;
  }

  /**
   * Determines the final action from multiple detector results.
   * Priority: BLOCK > REDACT > MODIFY > LOG_ONLY > ALLOW
   */
  static resolveFinalAction(
    results: DetectorResult[],
  ): DetectorResult["action"] {
    const priority = ["BLOCK", "REDACT", "MODIFY", "LOG_ONLY", "ALLOW"] as const;

    for (const action of priority) {
      if (results.some((r) => r.triggered && r.action === action)) {
        return action;
      }
    }

    return "ALLOW";
  }

  /**
   * Apply redactions to content based on detector findings
   */
  static applyRedactions(content: string, results: DetectorResult[]): string {
    let redactedContent = content;

    for (const result of results) {
      if (
        !result.triggered ||
        result.action !== "REDACT" ||
        !result.findings
      ) {
        continue;
      }

      for (const finding of result.findings) {
        if (finding.redactedValue && finding.value) {
          // Unescape the truncated value for matching
          const escapedValue = finding.value.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
          );
          // Try exact match first, then truncated
          redactedContent = redactedContent.replace(
            new RegExp(escapedValue, "g"),
            finding.redactedValue,
          );
        }
      }
    }

    return redactedContent;
  }
}
