import { describe, it, expect } from "vitest";
import {
  transformTraceForMixpanel,
  transformGenerationForMixpanel,
  transformScoreForMixpanel,
  transformEventForMixpanel,
} from "../features/mixpanel/transformers";
import type {
  AnalyticsTraceEvent,
  AnalyticsGenerationEvent,
  AnalyticsScoreEvent,
  AnalyticsObservationEvent,
} from "@aletheia/shared/src/server";

describe("Mixpanel transformers", () => {
  const projectId = "test-project-id";

  describe("transformEventForMixpanel", () => {
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
        aletheia_project_name: "Test Project",
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

      const result = transformEventForMixpanel(event, projectId);

      expect(result.event).toBe("[Aletheia] Observation");
      expect(result.properties.distinct_id).toBe("user-789");
      expect(result.properties.$user_id).toBe("user-789");
      expect(result.properties.time).toBe(
        new Date("2024-01-15T10:00:00Z").getTime(),
      );
      expect(result.properties.$insert_id).toBeDefined();
      expect(result.properties.session_id).toBe("mixpanel-session-456");
      expect(result.properties.aletheia_observation_name).toBe("test-event");
      expect(result.properties.aletheia_trace_name).toBe("test-trace");
      expect(result.properties.aletheia_model).toBe("gpt-4");
      expect(result.properties.aletheia_type).toBe("GENERATION");
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
        aletheia_project_name: "Test Project",
        aletheia_user_id: null,
        aletheia_event_version: "1.0.0",
        posthog_session_id: null,
        mixpanel_session_id: null,
      };

      const result = transformEventForMixpanel(event, projectId);

      expect(result.event).toBe("[Aletheia] Observation");
      // distinct_id should be empty string for non-user events (Mixpanel distributes across shards)
      expect(result.properties.distinct_id).toBe("");
      // Should not have $user_id for anonymous events
      expect(result.properties.$user_id).toBeUndefined();
      expect(result.properties.session_id).toBeUndefined();
    });

    it("should generate consistent insert IDs for the same event", () => {
      const event: AnalyticsObservationEvent = {
        aletheia_id: "event-consistent",
        timestamp: new Date("2024-01-15T10:00:00Z"),
        aletheia_observation_name: "consistent-event",
        aletheia_project_id: projectId,
        aletheia_project_name: "Test Project",
        aletheia_user_id: null,
        aletheia_event_version: "1.0.0",
        posthog_session_id: null,
        mixpanel_session_id: null,
      };

      const result1 = transformEventForMixpanel(event, projectId);
      const result2 = transformEventForMixpanel(event, projectId);

      expect(result1.properties.$insert_id).toBe(result2.properties.$insert_id);
    });

    it("should use aletheia_session_id when mixpanel_session_id is not available", () => {
      const event: AnalyticsObservationEvent = {
        aletheia_id: "event-with-aletheia-session",
        timestamp: new Date("2024-01-15T10:00:00Z"),
        aletheia_observation_name: "session-event",
        aletheia_session_id: "aletheia-session-123",
        aletheia_project_id: projectId,
        aletheia_project_name: "Test Project",
        aletheia_user_id: "user-456",
        aletheia_event_version: "1.0.0",
        posthog_session_id: null,
        mixpanel_session_id: null,
      };

      const result = transformEventForMixpanel(event, projectId);

      expect(result.properties.session_id).toBe("aletheia-session-123");
    });

    it("should prefer mixpanel_session_id over aletheia_session_id", () => {
      const event: AnalyticsObservationEvent = {
        aletheia_id: "event-with-both-sessions",
        timestamp: new Date("2024-01-15T10:00:00Z"),
        aletheia_observation_name: "session-event",
        aletheia_session_id: "aletheia-session-123",
        aletheia_project_id: projectId,
        aletheia_project_name: "Test Project",
        aletheia_user_id: "user-456",
        aletheia_event_version: "1.0.0",
        posthog_session_id: "posthog-session-789",
        mixpanel_session_id: "mixpanel-session-456",
      };

      const result = transformEventForMixpanel(event, projectId);

      expect(result.properties.session_id).toBe("mixpanel-session-456");
    });

    it("should include aletheia_project_name in properties", () => {
      const event: AnalyticsObservationEvent = {
        aletheia_id: "event-with-project-name",
        timestamp: new Date("2024-01-15T10:00:00Z"),
        aletheia_observation_name: "test-event",
        aletheia_project_id: projectId,
        aletheia_project_name: "My Custom Project Name",
        aletheia_user_id: "user-123",
        aletheia_event_version: "1.0.0",
        posthog_session_id: null,
        mixpanel_session_id: null,
      };

      const result = transformEventForMixpanel(event, projectId);

      expect(result.properties.aletheia_project_name).toBe(
        "My Custom Project Name",
      );
    });
  });

  describe("bad distinct_id handling", () => {
    const badIds = [
      "undefined",
      "null",
      "Null",
      "NULL",
      "0",
      "-1",
      "00000000-0000-0000-0000-000000000000",
      "unknown",
      "anonymous",
      " undefined ",
      "lmy47d",
    ];

    it.each(badIds)(
      "transformTraceForMixpanel falls back to empty string distinct_id when user_id is '%s'",
      (badId) => {
        const trace: AnalyticsTraceEvent = {
          aletheia_id: "trace-bad-id",
          timestamp: new Date("2024-01-15T10:00:00Z"),
          aletheia_trace_name: "test",
          aletheia_project_id: projectId,
          aletheia_project_name: "Test",
          aletheia_user_id: badId,
          aletheia_event_version: "1.0.0",
          posthog_session_id: null,
          mixpanel_session_id: null,
        };

        const result = transformTraceForMixpanel(trace, projectId);
        expect(result.properties.distinct_id).toBe("");
        expect(result.properties.$user_id).toBeUndefined();
      },
    );

    it.each(badIds)(
      "transformGenerationForMixpanel falls back to empty string distinct_id when user_id is '%s'",
      (badId) => {
        const generation: AnalyticsGenerationEvent = {
          aletheia_id: "gen-bad-id",
          timestamp: new Date("2024-01-15T10:00:00Z"),
          aletheia_generation_name: "test",
          aletheia_trace_name: "test",
          aletheia_trace_id: "trace-456",
          aletheia_project_id: projectId,
          aletheia_project_name: "Test",
          aletheia_user_id: badId,
          aletheia_event_version: "1.0.0",
          posthog_session_id: null,
          mixpanel_session_id: null,
        };

        const result = transformGenerationForMixpanel(generation, projectId);
        expect(result.properties.distinct_id).toBe("");
        expect(result.properties.$user_id).toBeUndefined();
      },
    );

    it.each(badIds)(
      "transformScoreForMixpanel falls back to empty string distinct_id when user_id is '%s'",
      (badId) => {
        const score: AnalyticsScoreEvent = {
          aletheia_id: "score-bad-id",
          timestamp: new Date("2024-01-15T10:00:00Z"),
          aletheia_score_name: "test",
          aletheia_score_value: 1,
          aletheia_score_data_type: "NUMERIC",
          aletheia_trace_name: "test",
          aletheia_trace_id: "trace-456",
          aletheia_project_id: projectId,
          aletheia_project_name: "Test",
          aletheia_user_id: badId,
          aletheia_event_version: "1.0.0",
          aletheia_score_entity_type: "trace",
          posthog_session_id: null,
          mixpanel_session_id: null,
        };

        const result = transformScoreForMixpanel(score, projectId);
        expect(result.properties.distinct_id).toBe("");
        expect(result.properties.$user_id).toBeUndefined();
      },
    );

    it.each(badIds)(
      "transformEventForMixpanel falls back to empty string distinct_id when user_id is '%s'",
      (badId) => {
        const event: AnalyticsObservationEvent = {
          aletheia_id: "event-bad-id",
          timestamp: new Date("2024-01-15T10:00:00Z"),
          aletheia_observation_name: "test",
          aletheia_project_id: projectId,
          aletheia_project_name: "Test",
          aletheia_user_id: badId,
          aletheia_event_version: "1.0.0",
          posthog_session_id: null,
          mixpanel_session_id: null,
        };

        const result = transformEventForMixpanel(event, projectId);
        expect(result.properties.distinct_id).toBe("");
        expect(result.properties.$user_id).toBeUndefined();
      },
    );

    it("should still use a valid user_id as distinct_id", () => {
      const event: AnalyticsObservationEvent = {
        aletheia_id: "event-valid",
        timestamp: new Date("2024-01-15T10:00:00Z"),
        aletheia_observation_name: "test",
        aletheia_project_id: projectId,
        aletheia_project_name: "Test",
        aletheia_user_id: "real-user-123",
        aletheia_event_version: "1.0.0",
        posthog_session_id: null,
        mixpanel_session_id: null,
      };

      const result = transformEventForMixpanel(event, projectId);
      expect(result.properties.distinct_id).toBe("real-user-123");
      expect(result.properties.$user_id).toBe("real-user-123");
    });
  });

  describe("transformTraceForMixpanel", () => {
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
        aletheia_project_name: "Test Project",
        aletheia_user_id: "user-789",
        aletheia_latency: 2.5,
        aletheia_release: "v1.0.0",
        aletheia_version: "1",
        aletheia_tags: ["tag1"],
        aletheia_environment: "production",
        aletheia_event_version: "1.0.0",
        posthog_session_id: null,
        mixpanel_session_id: "mixpanel-session-123",
      };

      const result = transformTraceForMixpanel(trace, projectId);

      expect(result.event).toBe("[Aletheia] Trace");
      expect(result.properties.distinct_id).toBe("user-789");
      expect(result.properties.$user_id).toBe("user-789");
      expect(result.properties.session_id).toBe("mixpanel-session-123");
    });
  });

  describe("transformGenerationForMixpanel", () => {
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
        aletheia_project_name: "Test Project",
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
        posthog_session_id: null,
        mixpanel_session_id: "mixpanel-session-456",
      };

      const result = transformGenerationForMixpanel(generation, projectId);

      expect(result.event).toBe("[Aletheia] Generation");
      expect(result.properties.distinct_id).toBe("user-789");
      expect(result.properties.$user_id).toBe("user-789");
      expect(result.properties.session_id).toBe("mixpanel-session-456");
      expect(result.properties.aletheia_model).toBe("gpt-4-turbo");
    });
  });

  describe("transformScoreForMixpanel", () => {
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
        aletheia_project_name: "Test Project",
        aletheia_user_id: "user-789",
        aletheia_release: "v1.0.0",
        aletheia_tags: ["human-eval"],
        aletheia_environment: "production",
        aletheia_event_version: "1.0.0",
        aletheia_score_entity_type: "trace",
        aletheia_dataset_run_id: null,
        posthog_session_id: null,
        mixpanel_session_id: "mixpanel-session-789",
      };

      const result = transformScoreForMixpanel(score, projectId);

      expect(result.event).toBe("[Aletheia] Score");
      expect(result.properties.distinct_id).toBe("user-789");
      expect(result.properties.$user_id).toBe("user-789");
      expect(result.properties.session_id).toBe("mixpanel-session-789");
      expect(result.properties.aletheia_score_name).toBe("quality");
      expect(result.properties.aletheia_score_value).toBe(0.95);
    });
  });
});
