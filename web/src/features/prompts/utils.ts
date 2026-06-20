import { LATEST_PROMPT_LABEL, PRODUCTION_LABEL } from "@aletheia/shared";

export const isReservedPromptLabel = (label: string) => {
  return [PRODUCTION_LABEL, LATEST_PROMPT_LABEL].includes(label);
};
