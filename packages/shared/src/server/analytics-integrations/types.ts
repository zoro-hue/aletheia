// Standard analytics event types for analytics integrations (PostHog, Mixpanel, etc.)
// These represent the raw data structure from ClickHouse queries

export type AnalyticsTraceEvent = {
  aletheia_id: unknown;
  timestamp: unknown;
  aletheia_trace_name?: unknown;
  aletheia_url?: unknown;
  aletheia_user_url?: unknown;
  aletheia_cost_usd?: unknown;
  aletheia_count_observations?: unknown;
  aletheia_session_id?: unknown;
  aletheia_project_id?: unknown;
  aletheia_project_name?: unknown;
  aletheia_user_id?: unknown;
  aletheia_latency?: unknown;
  aletheia_release?: unknown;
  aletheia_version?: unknown;
  aletheia_tags?: unknown;
  aletheia_environment?: unknown;
  aletheia_event_version?: unknown;
  posthog_session_id?: unknown;
  mixpanel_session_id?: unknown;
};

export type AnalyticsGenerationEvent = {
  aletheia_id: unknown;
  timestamp: unknown;
  aletheia_generation_name?: unknown;
  aletheia_trace_name?: unknown;
  aletheia_trace_id?: unknown;
  aletheia_url?: unknown;
  aletheia_user_url?: unknown;
  aletheia_cost_usd?: unknown;
  aletheia_input_units?: unknown;
  aletheia_output_units?: unknown;
  aletheia_total_units?: unknown;
  aletheia_session_id?: unknown;
  aletheia_project_id?: unknown;
  aletheia_project_name?: unknown;
  aletheia_user_id?: unknown;
  aletheia_latency?: unknown;
  aletheia_time_to_first_token?: unknown;
  aletheia_release?: unknown;
  aletheia_version?: unknown;
  aletheia_model?: unknown;
  aletheia_level?: unknown;
  aletheia_tags?: unknown;
  aletheia_environment?: unknown;
  aletheia_event_version?: unknown;
  posthog_session_id?: unknown;
  mixpanel_session_id?: unknown;
};

export type AnalyticsScoreEvent = {
  aletheia_id: unknown;
  timestamp: unknown;
  aletheia_score_name?: unknown;
  aletheia_score_value?: unknown;
  aletheia_score_comment?: unknown;
  aletheia_score_metadata?: unknown;
  aletheia_score_string_value?: unknown;
  aletheia_score_data_type?: unknown;
  aletheia_trace_name?: unknown;
  aletheia_trace_id?: unknown;
  aletheia_user_url?: unknown;
  aletheia_session_id?: unknown;
  aletheia_project_id?: unknown;
  aletheia_project_name?: unknown;
  aletheia_user_id?: unknown;
  aletheia_release?: unknown;
  aletheia_tags?: unknown;
  aletheia_environment?: unknown;
  aletheia_event_version?: unknown;
  aletheia_score_entity_type?: unknown;
  aletheia_dataset_run_id?: unknown;
  posthog_session_id?: unknown;
  mixpanel_session_id?: unknown;
};

export type AnalyticsObservationEvent = {
  aletheia_id: unknown;
  timestamp: unknown;
  aletheia_observation_name?: unknown;
  aletheia_trace_name?: unknown;
  aletheia_trace_id?: unknown;
  aletheia_url?: unknown;
  aletheia_user_url?: unknown;
  aletheia_cost_usd?: unknown;
  aletheia_input_units?: unknown;
  aletheia_output_units?: unknown;
  aletheia_total_units?: unknown;
  aletheia_session_id?: unknown;
  aletheia_project_id?: unknown;
  aletheia_project_name?: unknown;
  aletheia_user_id?: unknown;
  aletheia_latency?: unknown;
  aletheia_time_to_first_token?: unknown;
  aletheia_release?: unknown;
  aletheia_version?: unknown;
  aletheia_model?: unknown;
  aletheia_level?: unknown;
  aletheia_type?: unknown;
  aletheia_tags?: unknown;
  aletheia_environment?: unknown;
  aletheia_event_version?: unknown;
  posthog_session_id?: unknown;
  mixpanel_session_id?: unknown;
};
