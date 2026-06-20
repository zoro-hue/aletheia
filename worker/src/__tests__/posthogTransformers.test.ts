import { describe, it, expect } from "vitest";
import {
  transformTraceForPostHog,
  transformGenerationForPostHog,
  transformScoreForPostHog,
  transformEventForPostHog,
} from "../features/posthog/transformers";
import type {
  AnalyticsTraceEvent,
  AnalyticsGenerationEvent,
  AnalyticsScoreEvent,
  AnalyticsObservationEvent,
} from "@aletheia/shared/src/server";

describe("PostHog transformers", () => {
  const projectId = "test-project-id";

  describe("transformEventForPostHog", () => {
    it("should transform an event with user_id", () => {
      const event: AnalyticsObservationEvent = {
        aletheia_id: "event-123",
        timestamp: new Date("2024-01-15T10:00:00Z"),
        aletheia_observation_name: "test-event",
        aletheia_trace_name: "test-trace",
        aletheia_trace_id: "trace-456",
        aletheia_url:
          "https://aletheia.com/project/test/traces/trace-456?observation=event-123",
        aletheia_user_url: "https://aletheia.com/project/test/users/user-789",
        aletheia_cost_usd: 0.001,
        aletheia_input_units: 100,
        aletheia_output_units: 50,
        aletheia_total_units: 150,
        aletheia_session_id: "session-abc",
        aletheia_project_id: projectId,
        aletheia_user_id: "user-789",
        aletheia_latency: 1.5,
        aletheia_time_to_first_token: 0.3,
        aletheia_release: "v1.0.0",
        aletheia_version: "1",
        aletheia_model: "gpt-4",
        aletheia_level: "DEFAULT",
        aletheia_type: "GENERATION",
        aletheia_tags: ["tag1", "tag2"],
        aletheia_environment: "production",
        aletheia_event_version: "1.0.0",
        posthog_session_id: "posthog-session-123",
        mixpanel_session_id: "mixpanel-session-456",
      };

      const result = transformEventForPostHog(event, projectId);

      expect(result.event).toBe("aletheia observation");
      expect(result.distinctId).toBe("user-789");
      expect(result.timestamp).toEqual(new Date("2024-01-15T10:00:00Z"));
      expect(result.uuid).toBeDefined();
      expect(result.properties.$session_id).toBe("posthog-session-123");
      expect(result.properties.aletheia_observation_name).toBe("test-event");
      expect(result.properties.aletheia_trace_name).toBe("test-trace");
      expect(result.properties.aletheia_model).toBe("gpt-4");
      expect(result.properties.aletheia_type).toBe("GENERATION");
      expect(result.properties.$set).toEqual({
        aletheia_user_url: "https://aletheia.com/project/test/users/user-789",
      });
      // Should not include posthog_session_id or mixpanel_session_id in properties
      expect(result.properties.posthog_session_id).toBeUndefined();
      expect(result.properties.mixpanel_session_id).toBeUndefined();
    });

    it("should transform an anonymous event without user_id", () => {
      const event: AnalyticsObservationEvent = {
        aletheia_id: "event-anonymous",
        timestamp: new Date("2024-01-15T10:00:00Z"),
        aletheia_observation_name: "anonymous-event",
        aletheia_project_id: projectId,
        aletheia_user_id: null,
        aletheia_event_version: "1.0.0",
        posthog_session_id: null,
        mixpanel_session_id: null,
      };

      const result = transformEventForPostHog(event, projectId);

      expect(result.event).toBe("aletheia observation");
      // distinctId should be the generated UUID when no user_id
      expect(result.distinctId).toBe(result.uuid);
      expect(result.properties.$session_id).toBeNull();
      // Should have $process_person_profile: false for anonymous events
      expect(result.properties.$process_person_profile).toBe(false);
      expect(result.properties.$set).toBeUndefined();
    });

    it("should generate consistent UUIDs for the same event", () => {
      const event: AnalyticsObservationEvent = {
        aletheia_id: "event-consistent",
        timestamp: new Date("2024-01-15T10:00:00Z"),
        aletheia_observation_name: "consistent-event",
        aletheia_project_id: projectId,
        aletheia_user_id: null,
        aletheia_event_version: "1.0.0",
        posthog_session_id: null,
        mixpanel_session_id: null,
      };

      const result1 = transformEventForPostHog(event, projectId);
      const result2 = transformEventForPostHog(event, projectId);

      expect(result1.uuid).toBe(result2.uuid);
    });

    it("should handle event with session_id but no user_id", () => {
      const event: AnalyticsObservationEvent = {
        aletheia_id: "event-with-session",
        timestamp: new Date("2024-01-15T10:00:00Z"),
        aletheia_observation_name: "session-event",
        aletheia_session_id: "session-123",
        aletheia_project_id: projectId,
        aletheia_user_id: null,
        aletheia_event_version: "1.0.0",
        posthog_session_id: "posthog-session-abc",
        mixpanel_session_id: null,
      };

      const result = transformEventForPostHog(event, projectId);

      expect(result.properties.$session_id).toBe("posthog-session-abc");
      expect(result.properties.aletheia_session_id).toBe("session-123");
      expect(result.properties.$process_person_profile).toBe(false);
    });
  });

  describe("transformTraceForPostHog", () => {
    it("should transform a trace with user_id", () => {
      const trace: AnalyticsTraceEvent = {
        aletheia_id: "trace-123",
        timestamp: new Date("2024-01-15T10:00:00Z"),
        aletheia_trace_name: "test-trace",
        aletheia_url: "https://aletheia.com/project/test/traces/trace-123",
        aletheia_user_url: "https://aletheia.com/project/test/users/user-789",
        aletheia_cost_usd: 0.01,
        aletheia_count_observations: 5,
        aletheia_session_id: "session-abc",
        aletheia_project_id: projectId,
        aletheia_user_id: "user-789",
        aletheia_latency: 2.5,
        aletheia_release: "v1.0.0",
        aletheia_version: "1",
        aletheia_tags: ["tag1"],
        aletheia_environment: "production",
        aletheia_event_version: "1.0.0",
        posthog_session_id: "posthog-session-123",
        mixpanel_session_id: null,
      };

      const result = transformTraceForPostHog(trace, projectId);

      expect(result.event).toBe("aletheia trace");
      expect(result.distinctId).toBe("user-789");
      expect(result.properties.$session_id).toBe("posthog-session-123");
    });
  });

  describe("transformGenerationForPostHog", () => {
    it("should transform a generation with user_id", () => {
      const generation: AnalyticsGenerationEvent = {
        aletheia_id: "gen-123",
        timestamp: new Date("2024-01-15T10:00:00Z"),
        aletheia_generation_name: "test-generation",
        aletheia_trace_name: "test-trace",
        aletheia_trace_id: "trace-456",
        aletheia_url:
          "https://aletheia.com/project/test/traces/trace-456?observation=gen-123",
        aletheia_user_url: "https://aletheia.com/project/test/users/user-789",
        aletheia_cost_usd: 0.005,
        aletheia_input_units: 200,
        aletheia_output_units: 100,
        aletheia_total_units: 300,
        aletheia_session_id: "session-abc",
        aletheia_project_id: projectId,
        aletheia_user_id: "user-789",
        aletheia_latency: 1.2,
        aletheia_time_to_first_token: 0.2,
        aletheia_release: "v1.0.0",
        aletheia_version: "1",
        aletheia_model: "gpt-4-turbo",
        aletheia_level: "DEFAULT",
        aletheia_tags: ["api"],
        aletheia_environment: "staging",
        aletheia_event_version: "1.0.0",
        posthog_session_id: "posthog-session-456",
        mixpanel_session_id: null,
      };

      const result = transformGenerationForPostHog(generation, projectId);

      expect(result.event).toBe("aletheia generation");
      expect(result.distinctId).toBe("user-789");
      expect(result.properties.$session_id).toBe("posthog-session-456");
      expect(result.properties.aletheia_model).toBe("gpt-4-turbo");
    });
  });

  describe("transformScoreForPostHog", () => {
    it("should transform a score with user_id", () => {
      const score: AnalyticsScoreEvent = {
        aletheia_id: "score-123",
        timestamp: new Date("2024-01-15T10:00:00Z"),
        aletheia_score_name: "quality",
        aletheia_score_value: 0.95,
        aletheia_score_comment: "Good response",
        aletheia_score_metadata: { source: "human" },
        aletheia_score_string_value: null,
        aletheia_score_data_type: "NUMERIC",
        aletheia_trace_name: "test-trace",
        aletheia_trace_id: "trace-456",
        aletheia_user_url: "https://aletheia.com/project/test/users/user-789",
        aletheia_session_id: "session-abc",
        aletheia_project_id: projectId,
        aletheia_user_id: "user-789",
        aletheia_release: "v1.0.0",
        aletheia_tags: ["human-eval"],
        aletheia_environment: "production",
        aletheia_event_version: "1.0.0",
        aletheia_score_entity_type: "trace",
        aletheia_dataset_run_id: null,
        posthog_session_id: "posthog-session-789",
        mixpanel_session_id: null,
      };

      const result = transformScoreForPostHog(score, projectId);

      expect(result.event).toBe("aletheia score");
      expect(result.distinctId).toBe("user-789");
      expect(result.properties.$session_id).toBe("posthog-session-789");
      expect(result.properties.aletheia_score_name).toBe("quality");
      expect(result.properties.aletheia_score_value).toBe(0.95);
    });
  });
});
