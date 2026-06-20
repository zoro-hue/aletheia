CREATE TABLE IF NOT EXISTS guardrail_decisions (
    id UUID,
    project_id String,
    policy_id String,
    rule_id String,
    trace_id String,
    observation_id Nullable(String),
    detector_type String,
    action String,
    decision String,
    input_text Nullable(String),
    output_text Nullable(String),
    timestamp DateTime64(3, 'UTC')
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (project_id, timestamp, policy_id, id);
