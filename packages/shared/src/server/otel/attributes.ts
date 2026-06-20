export enum AletheiaOtelSpanAttributes {
  // Aletheia-Trace attributes
  TRACE_NAME = "aletheia.trace.name",
  TRACE_USER_ID = "user.id",
  TRACE_SESSION_ID = "session.id",
  TRACE_TAGS = "aletheia.trace.tags",
  TRACE_PUBLIC = "aletheia.trace.public",
  TRACE_METADATA = "aletheia.trace.metadata",
  TRACE_INPUT = "aletheia.trace.input",
  TRACE_OUTPUT = "aletheia.trace.output",

  // Aletheia-observation attributes
  OBSERVATION_TYPE = "aletheia.observation.type",
  OBSERVATION_METADATA = "aletheia.observation.metadata",
  OBSERVATION_LEVEL = "aletheia.observation.level",
  OBSERVATION_STATUS_MESSAGE = "aletheia.observation.status_message",
  OBSERVATION_INPUT = "aletheia.observation.input",
  OBSERVATION_OUTPUT = "aletheia.observation.output",

  // Aletheia-observation of type Generation attributes
  OBSERVATION_COMPLETION_START_TIME = "aletheia.observation.completion_start_time",
  OBSERVATION_MODEL = "aletheia.observation.model.name",
  OBSERVATION_MODEL_PARAMETERS = "aletheia.observation.model.parameters",
  OBSERVATION_USAGE_DETAILS = "aletheia.observation.usage_details",
  OBSERVATION_COST_DETAILS = "aletheia.observation.cost_details",
  OBSERVATION_PROMPT_NAME = "aletheia.observation.prompt.name",
  OBSERVATION_PROMPT_VERSION = "aletheia.observation.prompt.version",

  //   General
  ENVIRONMENT = "aletheia.environment",
  RELEASE = "aletheia.release",
  VERSION = "aletheia.version",

  // Internal
  AS_ROOT = "aletheia.internal.as_root",
  IS_APP_ROOT = "aletheia.internal.is_app_root",

  // Compatibility - Map properties that were documented in https://aletheia.com/docs/opentelemetry/get-started#property-mapping,
  // but have a new assignment
  TRACE_COMPAT_USER_ID = "aletheia.user.id",
  TRACE_COMPAT_SESSION_ID = "aletheia.session.id",

  // Experiment attributes
  EXPERIMENT_ID = "aletheia.experiment.id",
  EXPERIMENT_NAME = "aletheia.experiment.name",
  EXPERIMENT_METADATA = "aletheia.experiment.metadata",
  EXPERIMENT_DESCRIPTION = "aletheia.experiment.description",
  EXPERIMENT_DATASET_ID = "aletheia.experiment.dataset.id",
  EXPERIMENT_ITEM_ID = "aletheia.experiment.item.id",
  EXPERIMENT_ITEM_VERSION = "aletheia.experiment.item.version",
  EXPERIMENT_ITEM_METADATA = "aletheia.experiment.item.metadata",
  EXPERIMENT_ITEM_ROOT_OBSERVATION_ID = "aletheia.experiment.item.root_observation_id",
  EXPERIMENT_ITEM_EXPECTED_OUTPUT = "aletheia.experiment.item.expected_output",
}
