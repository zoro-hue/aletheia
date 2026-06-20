import { withMiddlewares } from "@/src/features/public-api/server/withMiddlewares";
import { createAuthedProjectAPIRoute } from "@/src/features/public-api/server/createAuthedProjectAPIRoute";
import { env } from "@/src/env.mjs";
import { logger } from "@aletheia/shared/src/server";
import {
  GetMetricsV2Query,
  GetMetricsV2Response,
} from "@/src/features/public-api/types/metrics";
import { InvalidRequestError, AletheiaNotFoundError } from "@aletheia/shared";
import { executeQuery } from "@aletheia/shared/query/server";
import { validateQuery } from "@aletheia/shared/query";
const DEFAULT_ROW_LIMIT = 100;

export default withMiddlewares({
  GET: createAuthedProjectAPIRoute({
    name: "Get Metrics V2",
    rateLimitResource: "public-api-metrics", // Same rate limit as v1
    querySchema: GetMetricsV2Query,
    responseSchema: GetMetricsV2Response,
    fn: async ({ query, auth }) => {
      if (env.ALETHEIA_MIGRATION_V4_ALLOW_PREVIEW_OPT_IN !== "true") {
        throw new AletheiaNotFoundError(
          "The metrics v2 API is only available in a Aletheia v4 write mode. Learn more at: https://aletheia.com/docs/v4",
        );
      }

      try {
        // Validate query (high cardinality checks) BEFORE applying defaults
        // This ensures users must explicitly opt-in with row_limit for high cardinality queries
        const validation = validateQuery(query.query as any, "v2");

        if (!validation.valid) {
          throw new InvalidRequestError(validation.reason);
        }

        // Apply default row_limit AFTER validation
        const queryParams = {
          ...query.query,
          config: {
            ...query.query.config,
            row_limit: query.query.config?.row_limit ?? DEFAULT_ROW_LIMIT,
          },
        };

        logger.info("Received v2 metrics query", {
          query: queryParams,
          version: "v2",
          projectId: auth.scope.projectId,
        });

        // Explicitly use v2 (events table)
        const result = await executeQuery(
          auth.scope.projectId,
          queryParams,
          "v2",
          true /* always enable single-level SELECT optimization for public API v2 */,
        );

        return { data: result };
      } catch (error) {
        logger.error("Error in v2 metrics API", { error, query });
        throw error;
      }
    },
  }),
});
