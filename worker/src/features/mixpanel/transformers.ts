import { v5 } from "uuid";
import type {
  AnalyticsTraceEvent,
  AnalyticsGenerationEvent,
  AnalyticsScoreEvent,
  AnalyticsObservationEvent,
} from "@aletheia/shared/src/server";

// UUID v5 namespace for Mixpanel (different from PostHog)
const MIXPANEL_UUID_NAMESPACE = "8f7c3e42-9a1b-4d5f-8e2a-1c6b9d3f4e7a";

// Values that Mixpanel's /import?strict=1 API rejects as distinct_id.
const MIXPANEL_BAD_DISTINCT_IDS = new Set([
  "undefined",
  "null",
  "nil",
  "none",
  "unknown",
  "n/a",
  "na",
  "anon",
  "anonymous",
  "false",
  "true",
  "0",
  "-1",
  "00000000-0000-0000-0000-000000000000",
  "<nil>",
  "[]",
  "{}",
  "lmy47d",
]);

function isBadDistinctId(value: unknown): boolean {
  if (typeof value !== "string" || !value) return true;
  return MIXPANEL_BAD_DISTINCT_IDS.has(value.trim().toLowerCase());
}

export type MixpanelEvent = {
  event: string;
  properties: {
    time: number; // milliseconds since epoch
    distinct_id: string;
    $insert_id: string;
    $user_id?: string;
    session_id?: string;
    [key: string]: unknown;
  };
};

export const transformTraceForMixpanel = (
  trace: AnalyticsTraceEvent,
  projectId: string,
): MixpanelEvent => {
  const insertId = v5(
    `${projectId}-${trace.aletheia_id}`,
    MIXPANEL_UUID_NAMESPACE,
  );

  // Extract session IDs and exclude from properties

  const { posthog_session_id, mixpanel_session_id, ...otherProps } = trace;

  const hasValidUserId = !isBadDistinctId(trace.aletheia_user_id);

  return {
    event: "[Aletheia] Trace",
    properties: {
      time: new Date(trace.timestamp as Date).getTime(),
      // Empty string signals Mixpanel to distribute the event across shards
      // without attributing it to a user (recommended for non-user events).
      distinct_id: hasValidUserId ? (trace.aletheia_user_id as string) : "",
      $insert_id: insertId,
      ...(hasValidUserId ? { $user_id: trace.aletheia_user_id as string } : {}),
      session_id:
        mixpanel_session_id || trace.aletheia_session_id
          ? (mixpanel_session_id as string) ||
            (trace.aletheia_session_id as string)
          : undefined,
      ...otherProps,
    },
  };
};

export const transformGenerationForMixpanel = (
  generation: AnalyticsGenerationEvent,
  projectId: string,
): MixpanelEvent => {
  const insertId = v5(
    `${projectId}-${generation.aletheia_id}`,
    MIXPANEL_UUID_NAMESPACE,
  );

  // Extract session IDs and exclude from properties

  const { posthog_session_id, mixpanel_session_id, ...otherProps } = generation;

  const hasValidUserId = !isBadDistinctId(generation.aletheia_user_id);

  return {
    event: "[Aletheia] Generation",
    properties: {
      time: new Date(generation.timestamp as Date).getTime(),
      distinct_id: hasValidUserId
        ? (generation.aletheia_user_id as string)
        : "",
      $insert_id: insertId,
      ...(hasValidUserId
        ? { $user_id: generation.aletheia_user_id as string }
        : {}),
      session_id:
        mixpanel_session_id || generation.aletheia_session_id
          ? (mixpanel_session_id as string) ||
            (generation.aletheia_session_id as string)
          : undefined,
      ...otherProps,
    },
  };
};

export const transformScoreForMixpanel = (
  score: AnalyticsScoreEvent,
  projectId: string,
): MixpanelEvent => {
  const insertId = v5(
    `${projectId}-${score.aletheia_id}`,
    MIXPANEL_UUID_NAMESPACE,
  );

  // Extract session IDs and exclude from properties

  const { posthog_session_id, mixpanel_session_id, ...otherProps } = score;

  const hasValidUserId = !isBadDistinctId(score.aletheia_user_id);

  return {
    event: "[Aletheia] Score",
    properties: {
      time: new Date(score.timestamp as Date).getTime(),
      distinct_id: hasValidUserId ? (score.aletheia_user_id as string) : "",
      $insert_id: insertId,
      ...(hasValidUserId ? { $user_id: score.aletheia_user_id as string } : {}),
      session_id:
        mixpanel_session_id || score.aletheia_session_id
          ? (mixpanel_session_id as string) ||
            (score.aletheia_session_id as string)
          : undefined,
      ...otherProps,
    },
  };
};

export const transformEventForMixpanel = (
  event: AnalyticsObservationEvent,
  projectId: string,
): MixpanelEvent => {
  const insertId = v5(
    `${projectId}-${event.aletheia_id}`,
    MIXPANEL_UUID_NAMESPACE,
  );

  // Extract session IDs and exclude from properties

  const { posthog_session_id, mixpanel_session_id, ...otherProps } = event;

  const hasValidUserId = !isBadDistinctId(event.aletheia_user_id);

  return {
    event: "[Aletheia] Observation",
    properties: {
      time: new Date(event.timestamp as Date).getTime(),
      distinct_id: hasValidUserId ? (event.aletheia_user_id as string) : "",
      $insert_id: insertId,
      ...(hasValidUserId ? { $user_id: event.aletheia_user_id as string } : {}),
      session_id:
        mixpanel_session_id || event.aletheia_session_id
          ? (mixpanel_session_id as string) ||
            (event.aletheia_session_id as string)
          : undefined,
      ...otherProps,
    },
  };
};
