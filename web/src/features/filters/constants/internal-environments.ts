import { AletheiaInternalTraceEnvironment } from "@aletheia/shared";

export const DEFAULT_SIDEBAR_HIDDEN_ENVIRONMENTS = [
  AletheiaInternalTraceEnvironment.PromptExperiments,
  AletheiaInternalTraceEnvironment.LLMJudge,
  AletheiaInternalTraceEnvironment.CodeEval,
  AletheiaInternalTraceEnvironment.NaturalLanguageFilter,
  "aletheia-evaluation",
  "sdk-experiment",
] as const;

export const DEFAULT_SIDEBAR_IMPLICIT_ENVIRONMENT_CONFIG = {
  hiddenEnvironments: DEFAULT_SIDEBAR_HIDDEN_ENVIRONMENTS,
} as const;
