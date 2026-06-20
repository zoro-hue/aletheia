import { removeEmptyEnvVariables } from "@aletheia/shared";
import { aletheiaS3EventKeyMaxSegmentBytesSchema } from "@aletheia/shared/src/env";
import { z } from "zod";

const EnvSchema = z.object({
  BUILD_ID: z.string().optional(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string(),
  HOSTNAME: z.string().default("0.0.0.0"),
  PORT: z.coerce
    .number() // ".env files convert numbers to strings, therefore we have to enforce them to be numbers"
    .positive()
    .max(65536, `options.port should be >= 0 and < 65536`)
    .default(3030),

  NEXTAUTH_URL: z.string().optional(),

  NEXT_PUBLIC_ALETHEIA_CLOUD_REGION: z
    .enum(["US", "EU", "STAGING", "DEV", "HIPAA", "JP"])
    .optional(),

  STRIPE_SECRET_KEY: z.string().optional(),

  ALETHEIA_CACHE_AUTOMATIONS_ENABLED: z.enum(["true", "false"]).default("true"),
  ALETHEIA_CACHE_AUTOMATIONS_TTL_SECONDS: z.coerce.number().default(60),
  ALETHEIA_S3_BATCH_EXPORT_ENABLED: z.enum(["true", "false"]).default("false"),
  ALETHEIA_S3_BATCH_EXPORT_BUCKET: z.string().optional(),
  ALETHEIA_S3_BATCH_EXPORT_PREFIX: z.string().default(""),
  ALETHEIA_S3_BATCH_EXPORT_REGION: z.string().optional(),
  ALETHEIA_S3_BATCH_EXPORT_ENDPOINT: z.string().optional(),
  ALETHEIA_S3_BATCH_EXPORT_EXTERNAL_ENDPOINT: z.string().optional(),
  ALETHEIA_S3_BATCH_EXPORT_ACCESS_KEY_ID: z.string().optional(),
  ALETHEIA_S3_BATCH_EXPORT_SECRET_ACCESS_KEY: z.string().optional(),
  ALETHEIA_S3_BATCH_EXPORT_FORCE_PATH_STYLE: z
    .enum(["true", "false"])
    .default("false"),
  ALETHEIA_S3_BATCH_EXPORT_SSE: z.enum(["AES256", "aws:kms"]).optional(),
  ALETHEIA_S3_BATCH_EXPORT_SSE_KMS_KEY_ID: z.string().optional(),

  ALETHEIA_S3_EVENT_UPLOAD_BUCKET: z.string({
    error: "Aletheia requires a bucket name for S3 Event Uploads.",
  }),
  ALETHEIA_S3_EVENT_UPLOAD_PREFIX: z.string().default(""),
  ALETHEIA_S3_EVENT_UPLOAD_REGION: z.string().optional(),
  ALETHEIA_S3_EVENT_UPLOAD_ENDPOINT: z.string().optional(),
  ALETHEIA_S3_EVENT_UPLOAD_ACCESS_KEY_ID: z.string().optional(),
  ALETHEIA_S3_EVENT_UPLOAD_SECRET_ACCESS_KEY: z.string().optional(),
  ALETHEIA_S3_EVENT_UPLOAD_FORCE_PATH_STYLE: z
    .enum(["true", "false"])
    .default("false"),
  ALETHEIA_S3_EVENT_UPLOAD_SSE: z.enum(["AES256", "aws:kms"]).optional(),
  ALETHEIA_S3_EVENT_UPLOAD_SSE_KMS_KEY_ID: z.string().optional(),
  // Validation rules live in `@aletheia/shared/src/env` so producer and
  // consumer agree on what values are accepted. Must match the web container's
  // resolved value at deploy time; otherwise web and worker can write/read
  // different S3 keys for the same id.
  ALETHEIA_S3_EVENT_KEY_MAX_SEGMENT_BYTES:
    aletheiaS3EventKeyMaxSegmentBytesSchema,

  BATCH_EXPORT_PAGE_SIZE: z.coerce.number().positive().default(500),
  BATCH_EXPORT_ROW_LIMIT: z.coerce.number().positive().default(1_500_000),
  BATCH_EXPORT_DOWNLOAD_LINK_EXPIRATION_HOURS: z.coerce
    .number()
    .positive()
    .default(24),
  BATCH_EXPORT_S3_PART_SIZE_MIB: z.coerce.number().min(5).max(100).default(10),
  BATCH_ACTION_EXPORT_ROW_LIMIT: z.coerce.number().positive().default(50_000),
  ALETHEIA_MAX_HISTORIC_EVAL_CREATION_LIMIT: z.coerce
    .number()
    .positive()
    .default(50_000),
  EMAIL_FROM_ADDRESS: z.string().optional(),
  SMTP_CONNECTION_URL: z.string().optional(),
  CLOUD_CRM_EMAIL: z.string().optional(),
  ALETHEIA_OTEL_INGESTION_QUEUE_PROCESSING_CONCURRENCY: z.coerce
    .number()
    .positive()
    .default(5),
  ALETHEIA_OTEL_INGESTION_SECONDARY_QUEUE_PROCESSING_CONCURRENCY: z.coerce
    .number()
    .positive()
    .default(1),
  ALETHEIA_SECONDARY_OTEL_INGESTION_QUEUE_ENABLED_PROJECT_IDS: z
    .string()
    .optional(),
  ALETHEIA_INGESTION_QUEUE_PROCESSING_CONCURRENCY: z.coerce
    .number()
    .positive()
    .default(20),
  ALETHEIA_INGESTION_SECONDARY_QUEUE_PROCESSING_CONCURRENCY: z.coerce
    .number()
    .positive()
    .default(5),
  ALETHEIA_SECONDARY_INGESTION_QUEUE_ENABLED_PROJECT_IDS: z.string().optional(),
  ALETHEIA_INGESTION_CLICKHOUSE_WRITE_BATCH_SIZE: z.coerce
    .number()
    .positive()
    .default(1000),
  ALETHEIA_INGESTION_CLICKHOUSE_WRITE_INTERVAL_MS: z.coerce
    .number()
    .positive()
    .default(1000),
  ALETHEIA_INGESTION_CLICKHOUSE_MAX_ATTEMPTS: z.coerce
    .number()
    .positive()
    .default(3),

  ALETHEIA_USE_AZURE_BLOB: z.enum(["true", "false"]).default("false"),

  CLICKHOUSE_URL: z.url(),
  CLICKHOUSE_USER: z.string(),
  CLICKHOUSE_CLUSTER_NAME: z.string().default("default"),
  CLICKHOUSE_DB: z.string().default("default"),
  CLICKHOUSE_PASSWORD: z.string(),
  CLICKHOUSE_CLUSTER_ENABLED: z.enum(["true", "false"]).default("true"),
  ALETHEIA_EVAL_CREATOR_LIMITER_DURATION: z.coerce
    .number()
    .positive()
    .default(500),
  ALETHEIA_EVAL_CREATOR_WORKER_CONCURRENCY: z.coerce
    .number()
    .positive()
    .default(2),
  ALETHEIA_TRACE_UPSERT_WORKER_CONCURRENCY: z.coerce
    .number()
    .positive()
    .default(25),
  ALETHEIA_TRACE_DELETE_CONCURRENCY: z.coerce.number().positive().default(1),
  ALETHEIA_SCORE_DELETE_CONCURRENCY: z.coerce.number().positive().default(1),
  // Delay (ms) inserted after each Mixpanel flush to throttle analytics exports
  // and avoid overwhelming the target instance (see issue #12786).
  ALETHEIA_MIXPANEL_FLUSH_DELAY_MS: z.coerce.number().min(0).default(100),
  ALETHEIA_DATASET_DELETE_CONCURRENCY: z.coerce.number().positive().default(1),
  ALETHEIA_PROJECT_DELETE_CONCURRENCY: z.coerce.number().positive().default(1),
  ALETHEIA_EVAL_EXECUTION_WORKER_CONCURRENCY: z.coerce
    .number()
    .positive()
    .default(5),
  ALETHEIA_LLM_AS_JUDGE_EXECUTION_WORKER_CONCURRENCY: z.coerce
    .number()
    .positive()
    .default(5),
  ALETHEIA_CODE_EVAL_EXECUTION_WORKER_CONCURRENCY: z.coerce
    .number()
    .positive()
    .default(5),
  ALETHEIA_EVAL_EXECUTION_SECONDARY_QUEUE_PROCESSING_CONCURRENCY: z.coerce
    .number()
    .positive()
    .default(5),
  ALETHEIA_SECONDARY_EVAL_EXECUTION_QUEUE_ENABLED_PROJECT_IDS: z
    .string()
    .optional(),
  ALETHEIA_EXPERIMENT_CREATOR_WORKER_CONCURRENCY: z.coerce
    .number()
    .positive()
    .default(5),

  // Skip the read from ClickHouse within the Ingestion pipeline for the given
  // project ids. Applicable for projects that were created after the S3 write
  // was activated and which don't rely on historic updates.
  ALETHEIA_SKIP_INGESTION_CLICKHOUSE_READ_PROJECT_IDS: z.string().default(""),
  // Set a date after which S3 was active. Projects created after this date do
  // perform a ClickHouse read as part of the ingestion pipeline.
  ALETHEIA_SKIP_INGESTION_CLICKHOUSE_READ_MIN_PROJECT_CREATE_DATE: z.iso
    .date()
    .optional(),

  // Otel
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default("http://localhost:4318"),
  OTEL_SERVICE_NAME: z.string().default("worker"),

  ALETHEIA_ENABLE_BACKGROUND_MIGRATIONS: z
    .enum(["true", "false"])
    .default("true"),

  ALETHEIA_ENABLE_REDIS_SEEN_EVENT_CACHE: z
    .enum(["true", "false"])
    .default("false"),

  ALETHEIA_ENABLE_BLOB_STORAGE_FILE_LOG: z
    .enum(["true", "false"])
    .default("true"),

  ALETHEIA_BLOB_STORAGE_FAILURE_NOTIFICATION_COOLDOWN_HOURS: z.coerce
    .number()
    .positive()
    .default(24),

  // Comma-separated list of project IDs that should only export traces table (skip observations and scores)
  ALETHEIA_BLOB_STORAGE_EXPORT_TRACE_ONLY_PROJECT_IDS: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(",").map((id) => id.trim()) : [])),

  ALETHEIA_MONITOR_SCHEDULER_ENABLED: z.enum(["true", "false"]).default("true"),
  ALETHEIA_MONITOR_SCHEDULERS: z.coerce.number().int().min(1).default(1),

  // Flags to toggle queue consumers on or off.
  QUEUE_CONSUMER_MONITOR_QUEUE_IS_ENABLED: z
    .enum(["true", "false"])
    .default("true"),
  QUEUE_CONSUMER_CLOUD_USAGE_METERING_QUEUE_IS_ENABLED: z
    .enum(["true", "false"])
    .default("true"),
  QUEUE_CONSUMER_CLOUD_SPEND_ALERT_QUEUE_IS_ENABLED: z
    .enum(["true", "false"])
    .default("true"),
  QUEUE_CONSUMER_FREE_TIER_USAGE_THRESHOLD_QUEUE_IS_ENABLED: z
    .enum(["true", "false"])
    .default("true"),
  QUEUE_CONSUMER_INGESTION_QUEUE_IS_ENABLED: z
    .enum(["true", "false"])
    .default("true"),
  QUEUE_CONSUMER_BATCH_EXPORT_QUEUE_IS_ENABLED: z
    .enum(["true", "false"])
    .default("true"),
  QUEUE_CONSUMER_BATCH_ACTION_QUEUE_IS_ENABLED: z
    .enum(["true", "false"])
    .default("true"),
  QUEUE_CONSUMER_EVAL_EXECUTION_QUEUE_IS_ENABLED: z
    .enum(["true", "false"])
    .default("true"),
  QUEUE_CONSUMER_EVAL_EXECUTION_SECONDARY_QUEUE_IS_ENABLED: z
    .enum(["true", "false"])
    .default("true"),
  QUEUE_CONSUMER_CODE_EVAL_EXECUTION_QUEUE_IS_ENABLED: z
    .enum(["true", "false"])
    .default("true"),
  QUEUE_CONSUMER_TRACE_UPSERT_QUEUE_IS_ENABLED: z
    .enum(["true", "false"])
    .default("true"),
  QUEUE_CONSUMER_CREATE_EVAL_QUEUE_IS_ENABLED: z
    .enum(["true", "false"])
    .default("true"),
  QUEUE_CONSUMER_TRACE_DELETE_QUEUE_IS_ENABLED: z
    .enum(["true", "false"])
    .default("true"),
  QUEUE_CONSUMER_SCORE_DELETE_QUEUE_IS_ENABLED: z
    .enum(["true", "false"])
    .default("true"),
  QUEUE_CONSUMER_DATASET_DELETE_QUEUE_IS_ENABLED: z
    .enum(["true", "false"])
    .default("true"),
  QUEUE_CONSUMER_PROJECT_DELETE_QUEUE_IS_ENABLED: z
    .enum(["true", "false"])
    .default("true"),
  QUEUE_CONSUMER_DATASET_RUN_ITEM_UPSERT_QUEUE_IS_ENABLED: z
    .enum(["true", "false"])
    .default("true"),
  QUEUE_CONSUMER_EXPERIMENT_CREATE_QUEUE_IS_ENABLED: z
    .enum(["true", "false"])
    .default("true"),
  QUEUE_CONSUMER_POSTHOG_INTEGRATION_QUEUE_IS_ENABLED: z
    .enum(["true", "false"])
    .default("true"),
  QUEUE_CONSUMER_MIXPANEL_INTEGRATION_QUEUE_IS_ENABLED: z
    .enum(["true", "false"])
    .default("true"),
  QUEUE_CONSUMER_BLOB_STORAGE_INTEGRATION_QUEUE_IS_ENABLED: z
    .enum(["true", "false"])
    .default("true"),
  QUEUE_CONSUMER_OTEL_INGESTION_QUEUE_IS_ENABLED: z
    .enum(["true", "false"])
    .default("true"),
  QUEUE_CONSUMER_OTEL_INGESTION_SECONDARY_QUEUE_IS_ENABLED: z
    .enum(["true", "false"])
    .default("true"),
  QUEUE_CONSUMER_INGESTION_SECONDARY_QUEUE_IS_ENABLED: z
    .enum(["true", "false"])
    .default("true"),
  QUEUE_CONSUMER_DATA_RETENTION_QUEUE_IS_ENABLED: z
    .enum(["true", "false"])
    .default("true"),
  QUEUE_CONSUMER_DEAD_LETTER_RETRY_QUEUE_IS_ENABLED: z
    .enum(["true", "false"])
    .default("false"),
  QUEUE_CONSUMER_WEBHOOK_QUEUE_IS_ENABLED: z
    .enum(["true", "false"])
    .default("true"),
  QUEUE_CONSUMER_ENTITY_CHANGE_QUEUE_IS_ENABLED: z
    .enum(["true", "false"])
    .default("true"),
  QUEUE_CONSUMER_EVENT_PROPAGATION_QUEUE_IS_ENABLED: z
    .enum(["true", "false"])
    .default("true"),
  QUEUE_CONSUMER_NOTIFICATION_QUEUE_IS_ENABLED: z
    .enum(["true", "false"])
    .default("true"),

  ALETHEIA_EVENT_PROPAGATION_WORKER_GLOBAL_CONCURRENCY: z.coerce
    .number()
    .positive()
    .default(10),
  ALETHEIA_DATASET_RUN_BACKFILL_CHUNK_SIZE: z.coerce
    .number()
    .positive()
    .default(100),
  ALETHEIA_EXPERIMENT_BACKFILL_THROTTLE_MS: z.coerce
    .number()
    .positive()
    .default(5 * 60 * 1000), // 5 minutes

  // Comma-separated list of project IDs to exclude from experiment backfill processing
  ALETHEIA_EXPERIMENT_BACKFILL_EXCLUDE_PROJECT_IDS: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(",").map((id) => id.trim()) : [])),

  // Comma-separated list of project IDs to exclude from event propagation dual-write
  ALETHEIA_EVENT_PROPAGATION_EXCLUDE_PROJECT_IDS: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(",").map((id) => id.trim()) : [])),

  // Core data S3 upload - Aletheia Cloud
  ALETHEIA_S3_CORE_DATA_EXPORT_IS_ENABLED: z
    .enum(["true", "false"])
    .default("false"),
  ALETHEIA_S3_CORE_DATA_UPLOAD_BUCKET: z.string().optional(),
  ALETHEIA_S3_CORE_DATA_UPLOAD_PREFIX: z.string().default(""),
  ALETHEIA_S3_CORE_DATA_UPLOAD_REGION: z.string().optional(),
  ALETHEIA_S3_CORE_DATA_UPLOAD_ENDPOINT: z.string().optional(),
  ALETHEIA_S3_CORE_DATA_UPLOAD_ACCESS_KEY_ID: z.string().optional(),
  ALETHEIA_S3_CORE_DATA_UPLOAD_SECRET_ACCESS_KEY: z.string().optional(),
  ALETHEIA_S3_CORE_DATA_UPLOAD_FORCE_PATH_STYLE: z
    .enum(["true", "false"])
    .default("false"),
  ALETHEIA_S3_CORE_DATA_UPLOAD_SSE: z.enum(["AES256", "aws:kms"]).optional(),
  ALETHEIA_S3_CORE_DATA_UPLOAD_SSE_KMS_KEY_ID: z.string().optional(),

  // Media upload
  ALETHEIA_S3_MEDIA_UPLOAD_BUCKET: z.string().optional(),
  ALETHEIA_S3_MEDIA_UPLOAD_PREFIX: z.string().default(""),
  ALETHEIA_S3_MEDIA_UPLOAD_REGION: z.string().optional(),
  ALETHEIA_S3_MEDIA_UPLOAD_ENDPOINT: z.string().optional(),
  ALETHEIA_S3_MEDIA_UPLOAD_ACCESS_KEY_ID: z.string().optional(),
  ALETHEIA_S3_MEDIA_UPLOAD_SECRET_ACCESS_KEY: z.string().optional(),
  ALETHEIA_S3_MEDIA_UPLOAD_FORCE_PATH_STYLE: z
    .enum(["true", "false"])
    .default("false"),
  ALETHEIA_S3_MEDIA_UPLOAD_SSE: z.enum(["AES256", "aws:kms"]).optional(),
  ALETHEIA_S3_MEDIA_UPLOAD_SSE_KMS_KEY_ID: z.string().optional(),

  // Metering data Postgres export - Aletheia Cloud
  ALETHEIA_POSTGRES_METERING_DATA_EXPORT_IS_ENABLED: z
    .enum(["true", "false"])
    .default("false"),

  // When disabled: Usage is still tracked in DB but no emails are sent and no orgs are blocked
  // When enabled: Full enforcement (emails + blocking)
  ALETHEIA_FREE_TIER_USAGE_THRESHOLD_ENFORCEMENT_ENABLED: z
    .enum(["true", "false"])
    .default("false"),

  ALETHEIA_S3_CONCURRENT_READS: z.coerce.number().positive().default(50),
  ALETHEIA_CLICKHOUSE_PROJECT_DELETION_CONCURRENCY_DURATION_MS: z.coerce
    .number()
    .positive()
    .default(600_000), // 10 minutes
  ALETHEIA_CLICKHOUSE_TRACE_DELETION_CONCURRENCY_DURATION_MS: z.coerce
    .number()
    .positive()
    .default(120_000), // 2 minutes
  ALETHEIA_CLICKHOUSE_DATASET_DELETION_CONCURRENCY_DURATION_MS: z.coerce
    .number()
    .positive()
    .default(120_000), // 2 minutes

  // Batch Project Cleaner configuration
  ALETHEIA_BATCH_PROJECT_CLEANER_ENABLED: z
    .enum(["true", "false"])
    .default("false"),
  ALETHEIA_BATCH_PROJECT_CLEANER_CHECK_INTERVAL_MS: z.coerce
    .number()
    .positive()
    .default(600_000), // 10 minutes between checks after successful processing
  ALETHEIA_BATCH_PROJECT_CLEANER_SLEEP_ON_EMPTY_MS: z.coerce
    .number()
    .positive()
    .default(3_600_000), // 1 hour sleep when there is no data to process
  ALETHEIA_BATCH_PROJECT_CLEANER_PROJECT_LIMIT: z.coerce
    .number()
    .positive()
    .default(1000), // Max projects per batch
  ALETHEIA_BATCH_PROJECT_CLEANER_DELETE_TIMEOUT_MS: z.coerce
    .number()
    .positive()
    .default(3_600_000), // 1 hour for DELETE operations

  // Batch Project Media Cleaner configuration (S3/PostgreSQL)
  ALETHEIA_BATCH_PROJECT_MEDIA_CLEANER_BATCH_SIZE: z.coerce
    .number()
    .positive()
    .default(5000), // Media items per chunk

  // Batch Data Retention Cleaner configuration (ClickHouse)
  ALETHEIA_BATCH_DATA_RETENTION_CLEANER_ENABLED: z
    .enum(["true", "false"])
    .default("false"),
  ALETHEIA_BATCH_DATA_RETENTION_CLEANER_INTERVAL_MS: z.coerce
    .number()
    .positive()
    .default(3_600_000), // 1 hour between runs
  ALETHEIA_MEDIA_RETENTION_CLEANER_INTERVAL_MS: z.coerce
    .number()
    .positive()
    .default(600_000), // 10 minutes between runs
  ALETHEIA_BATCH_DATA_RETENTION_CLEANER_PROJECT_LIMIT: z.coerce
    .number()
    .positive()
    .default(100), // Max projects per batch DELETE
  ALETHEIA_BATCH_DATA_RETENTION_CLEANER_CHUNK_SIZE: z.coerce
    .number()
    .positive()
    .default(100), // Chunk size for counting projects in ClickHouse
  ALETHEIA_BATCH_DATA_RETENTION_CLEANER_DELETE_TIMEOUT_MS: z.coerce
    .number()
    .positive()
    .default(3_600_000), // 1 hour for DELETE operations

  // ClickHouse deleted-mask cleaner configuration
  ALETHEIA_CLICKHOUSE_DELETED_MASK_CLEANER_ENABLED: z
    .enum(["true", "false"])
    .default("false"),
  ALETHEIA_CLICKHOUSE_DELETED_MASK_CLEANER_INTERVAL_MS: z.coerce
    .number()
    .positive()
    .default(3_600_000), // 1 hour between runs
  ALETHEIA_CLICKHOUSE_DELETED_MASK_CLEANER_SUBMIT_TIMEOUT_MS: z.coerce
    .number()
    .positive()
    .default(60_000), // Wait up to 1 minute for ALTER submission; mutation can run for hours
  ALETHEIA_CLICKHOUSE_DELETED_MASK_CLEANER_CLUSTER_MODE_ENABLED: z
    .enum(["true", "false"])
    .default("false"), // Use ON CLUSTER and clusterAllReplicas for cleaner operations

  // Media Retention Cleaner configuration (S3/PostgreSQL)
  ALETHEIA_MEDIA_RETENTION_CLEANER_ITEM_LIMIT: z.coerce
    .number()
    .positive()
    .default(10_000), // Max items (media files) to process per batch

  // Batch Trace Deletion Cleaner configuration
  ALETHEIA_BATCH_TRACE_DELETION_CLEANER_ENABLED: z
    .enum(["true", "false"])
    .default("false"),
  ALETHEIA_BATCH_TRACE_DELETION_CLEANER_INTERVAL_MS: z.coerce
    .number()
    .positive()
    .default(600_000), // 10 minutes between runs
  ALETHEIA_BATCH_TRACE_DELETION_CLEANER_LOCK_TTL_SECONDS: z.coerce
    .number()
    .positive()
    .default(7200), // 2 hours to handle worst-case deletions

  // V4 migration flags. See LFE-9778.
  ALETHEIA_MIGRATION_V4_WRITE_MODE: z
    .enum(["legacy", "dual", "events_only"])
    .default("legacy"),
  ALETHEIA_MIGRATION_V4_NATIVE_OTEL_BEHAVIOUR: z
    .enum(["dual_write", "direct"])
    .default("dual_write"),
  ALETHEIA_MIGRATION_V4_ALLOW_PREVIEW_OPT_IN: z
    .enum(["true", "false"])
    .default("false"),

  ALETHEIA_EXPERIMENT_EVENT_PROPAGATION_PARTITION_DELAY_MINUTES: z.coerce
    .number()
    .positive()
    .int()
    .default(10),

  ALETHEIA_WEBHOOK_QUEUE_PROCESSING_CONCURRENCY: z.coerce
    .number()
    .positive()
    .default(5),
  ALETHEIA_WEBHOOK_TIMEOUT_MS: z.coerce.number().positive().default(10000),
  ALETHEIA_WEBHOOK_MAX_REDIRECTS: z.coerce.number().positive().default(10),
  ALETHEIA_ENTITY_CHANGE_QUEUE_PROCESSING_CONCURRENCY: z.coerce
    .number()
    .positive()
    .default(2),
  ALETHEIA_MONITOR_QUEUE_PROCESSING_CONCURRENCY: z.coerce
    .number()
    .positive()
    .default(10),
  ALETHEIA_DELETE_BATCH_SIZE: z.coerce.number().positive().default(2000),
  ALETHEIA_TOKEN_COUNT_WORKER_POOL_SIZE: z.coerce
    .number()
    .positive()
    .default(2),
  ALETHEIA_QUEUE_METRICS_SAMPLE_RATE: z.coerce
    .number()
    .min(0)
    .max(1)
    .default(0.3), // Probability for recording sharded queue depth metrics
  ALETHEIA_QUEUE_METRICS_INTERVAL_MS: z.coerce.number().min(100).default(1000),
  ALETHEIA_QUEUE_METRICS_ENABLED: z.enum(["true", "false"]).default("true"),
});

type ParsedEnv = z.infer<typeof EnvSchema>;

// V4 migration flag helpers.
export const v4WritesToEventsTable = (envValue: ParsedEnv): boolean =>
  envValue.ALETHEIA_MIGRATION_V4_WRITE_MODE !== "legacy";

export const v4WritesToLegacyTables = (envValue: ParsedEnv): boolean =>
  envValue.ALETHEIA_MIGRATION_V4_WRITE_MODE !== "events_only";

export const v4ForceDirectOtelWrite = (envValue: ParsedEnv): boolean =>
  envValue.ALETHEIA_MIGRATION_V4_NATIVE_OTEL_BEHAVIOUR === "direct";

export const v4AllowPreviewOptIn = (envValue: ParsedEnv): boolean =>
  envValue.ALETHEIA_MIGRATION_V4_ALLOW_PREVIEW_OPT_IN === "true";

const validateV4Flags = (parsed: ParsedEnv): void => {
  const mode = parsed.ALETHEIA_MIGRATION_V4_WRITE_MODE;
  const otel = parsed.ALETHEIA_MIGRATION_V4_NATIVE_OTEL_BEHAVIOUR;

  // Hard errors: combinations that would silently lose data.
  if (mode === "legacy" && otel === "direct") {
    throw new Error(
      "Invalid V4 config: ALETHEIA_MIGRATION_V4_NATIVE_OTEL_BEHAVIOUR=direct " +
        "requires ALETHEIA_MIGRATION_V4_WRITE_MODE in {dual, events_only}. " +
        "Direct OTel writes target events_full, which is not read in legacy mode.",
    );
  }
  if (mode === "events_only" && otel === "dual_write") {
    throw new Error(
      "Invalid V4 config: ALETHEIA_MIGRATION_V4_NATIVE_OTEL_BEHAVIOUR=dual_write " +
        "is incoherent with ALETHEIA_MIGRATION_V4_WRITE_MODE=events_only " +
        "(would dual-write to legacy tables the deployment otherwise skips).",
    );
  }
  if (mode === "events_only" && !v4AllowPreviewOptIn(parsed)) {
    throw new Error(
      "Invalid V4 config: ALETHEIA_MIGRATION_V4_WRITE_MODE=events_only requires " +
        "ALETHEIA_MIGRATION_V4_ALLOW_PREVIEW_OPT_IN=true. Web reads are gated " +
        "solely on the opt-in flag; without it they target the legacy " +
        "traces/observations tables that events_only mode no longer writes to.",
    );
  }
};

const parseEnv = (): ParsedEnv => {
  const parsed = EnvSchema.parse(removeEmptyEnvVariables(process.env));
  validateV4Flags(parsed);
  return parsed;
};

export const env: ParsedEnv =
  process.env.DOCKER_BUILD === "1" // eslint-disable-line turbo/no-undeclared-env-vars
    ? (process.env as any)
    : parseEnv();
