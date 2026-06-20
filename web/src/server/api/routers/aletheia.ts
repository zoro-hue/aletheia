import { z } from "zod";
import {
  createTRPCRouter,
  protectedProjectProcedure,
} from "@/src/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { getObservationsForTrace } from "@aletheia/shared/src/server";
import { CausalAttributionEngine, type ObservationNode } from "@aletheia/shared/src/features/causal-attribution";
import { RegressionDiffEngine } from "@aletheia/shared/src/features/regression-diff";
import { encrypt } from "@aletheia/shared/encryption";

// Simple mapping helper for observations to the Causal Attribution Engine input nodes
const mapObservationsToNodes = (observations: any[]): ObservationNode[] => {
  return observations.map((obs) => ({
    id: obs.id,
    traceId: obs.traceId ?? "",
    parentObservationId: obs.parentObservationId,
    name: obs.name,
    type: obs.type,
    startTime: obs.startTime,
    endTime: obs.endTime,
    level: (obs.level === "ERROR" || obs.level === "WARNING" || obs.level === "DEBUG" || obs.level === "DEFAULT") ? obs.level : "DEFAULT",
    statusMessage: obs.statusMessage,
    model: obs.model,
    inputTokens: obs.inputUsage ?? 0,
    outputTokens: obs.outputUsage ?? 0,
    totalTokens: obs.totalUsage ?? 0,
    inputCost: obs.inputCost ? Number(obs.inputCost) : null,
    outputCost: obs.outputCost ? Number(obs.outputCost) : null,
    totalCost: obs.totalCost ? Number(obs.totalCost) : null,
    calculatedTotalCost: null,
    metadata: obs.metadata && typeof obs.metadata === "object" ? (obs.metadata as Record<string, unknown>) : null,
  }));
};

export const aletheiaRouter = createTRPCRouter({
  // ─── Guardrail Policy Management ───────────────────────────────────────────

  getPolicies: protectedProjectProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      return ctx.prisma.guardrailPolicy.findMany({
        where: { projectId: input.projectId },
        include: { rules: true },
        orderBy: { createdAt: "desc" },
      });
    }),

  getPolicy: protectedProjectProcedure
    .input(z.object({ projectId: z.string(), policyId: z.string() }))
    .query(async ({ input, ctx }) => {
      const policy = await ctx.prisma.guardrailPolicy.findFirst({
        where: { id: input.policyId, projectId: input.projectId },
        include: { rules: true, routes: true },
      });
      if (!policy) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Guardrail policy not found",
        });
      }
      return policy;
    }),

  createPolicy: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        enabled: z.boolean().default(true),
        budgetLimitUsd: z.number().nullable().optional(),
        rateLimitRpm: z.number().nullable().optional(),
        maxToolCallLoops: z.number().default(10),
        rules: z.array(
          z.object({
            detectorType: z.string(),
            phase: z.enum(["PRE_REQUEST", "POST_RESPONSE"]),
            action: z.enum(["ALLOW", "BLOCK", "REDACT", "MODIFY", "LOG_ONLY"]),
            enabled: z.boolean().default(true),
            threshold: z.number().optional(),
            customPattern: z.string().optional(),
            blockedTopics: z.array(z.string()).optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { projectId, name, description, enabled, budgetLimitUsd, rateLimitRpm, maxToolCallLoops, rules } = input;

      return ctx.prisma.guardrailPolicy.create({
        data: {
          projectId,
          name,
          description,
          enabled,
          budgetLimitUsd,
          rateLimitRpm,
          maxToolCallLoops,
          rules: {
            create: rules.map((r) => ({
              detectorType: r.detectorType,
              phase: r.phase,
              action: r.action,
              enabled: r.enabled,
              threshold: r.threshold,
              customPattern: r.customPattern,
              blockedTopics: r.blockedTopics,
            })),
          },
        },
        include: { rules: true },
      });
    }),

  updatePolicy: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        policyId: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        enabled: z.boolean().optional(),
        budgetLimitUsd: z.number().nullable().optional(),
        rateLimitRpm: z.number().nullable().optional(),
        maxToolCallLoops: z.number().optional(),
        rules: z.array(
          z.object({
            id: z.string().optional(),
            detectorType: z.string(),
            phase: z.enum(["PRE_REQUEST", "POST_RESPONSE"]),
            action: z.enum(["ALLOW", "BLOCK", "REDACT", "MODIFY", "LOG_ONLY"]),
            enabled: z.boolean().default(true),
            threshold: z.number().optional(),
            customPattern: z.string().optional(),
            blockedTopics: z.array(z.string()).optional(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { projectId, policyId, name, description, enabled, budgetLimitUsd, rateLimitRpm, maxToolCallLoops, rules } = input;

      // Update basic fields
      await ctx.prisma.guardrailPolicy.update({
        where: { id: policyId, projectId },
        data: {
          name,
          description,
          enabled,
          budgetLimitUsd,
          rateLimitRpm,
          maxToolCallLoops,
        },
      });

      if (rules) {
        // Simple rules replacement: delete existing and create new
        await ctx.prisma.guardrailPolicyRule.deleteMany({
          where: { policyId },
        });

        await ctx.prisma.guardrailPolicyRule.createMany({
          data: rules.map((r) => ({
            policyId,
            detectorType: r.detectorType,
            phase: r.phase,
            action: r.action,
            enabled: r.enabled,
            threshold: r.threshold,
            customPattern: r.customPattern,
            blockedTopics: r.blockedTopics,
          })),
        });
      }

      return ctx.prisma.guardrailPolicy.findUnique({
        where: { id: policyId },
        include: { rules: true },
      });
    }),

  deletePolicy: protectedProjectProcedure
    .input(z.object({ projectId: z.string(), policyId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.guardrailPolicy.delete({
        where: { id: input.policyId, projectId: input.projectId },
      });
    }),

  // ─── Upstream Routes ───────────────────────────────────────────────────────

  getRoutes: protectedProjectProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      return ctx.prisma.guardrailRoute.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "desc" },
      });
    }),

  createRoute: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        policyId: z.string(),
        name: z.string(),
        upstreamProvider: z.string(),
        upstreamBaseUrl: z.string().url(),
        upstreamApiKey: z.string(),
        upstreamModel: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.guardrailRoute.create({
        data: {
          projectId: input.projectId,
          policyId: input.policyId,
          name: input.name,
          upstreamProvider: input.upstreamProvider,
          upstreamBaseUrl: input.upstreamBaseUrl,
          upstreamApiKeyEncrypted: encrypt(input.upstreamApiKey),
          upstreamModel: input.upstreamModel,
        },
      });
    }),

  deleteRoute: protectedProjectProcedure
    .input(z.object({ projectId: z.string(), routeId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.guardrailRoute.delete({
        where: { id: input.routeId, projectId: input.projectId },
      });
    }),

  // ─── Causal Attribution (Root Cause Analysis) ──────────────────────────────

  computeCausalAttribution: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        traceId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const observations = await getObservationsForTrace({
        traceId: input.traceId,
        projectId: input.projectId,
        includeIO: false,
      });

      if (!observations || observations.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No observations found for this trace",
        });
      }

      const nodes = mapObservationsToNodes(observations);
      const engine = new CausalAttributionEngine();
      return engine.compute(input.projectId, input.traceId, nodes);
    }),

  // ─── Agent Regression Diffing ──────────────────────────────────────────────

  computeRegressionDiff: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        runATraceId: z.string(),
        runBTraceId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const [obsA, obsB] = await Promise.all([
        getObservationsForTrace({
          traceId: input.runATraceId,
          projectId: input.projectId,
          includeIO: false,
        }),
        getObservationsForTrace({
          traceId: input.runBTraceId,
          projectId: input.projectId,
          includeIO: false,
        }),
      ]);

      if (!obsA || obsA.length === 0 || !obsB || obsB.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Could not find observations for one or both traces",
        });
      }

      const nodesA = mapObservationsToNodes(obsA);
      const nodesB = mapObservationsToNodes(obsB);

      const engine = new RegressionDiffEngine();
      const diffId = `diff-${input.runATraceId.slice(0, 8)}-${input.runBTraceId.slice(0, 8)}`;

      return engine.compute(input.projectId, diffId, nodesA, nodesB);
    }),
});
