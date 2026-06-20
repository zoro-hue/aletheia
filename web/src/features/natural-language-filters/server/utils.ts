import { LLMAdapter } from "@aletheia/shared/src/server";
import { Aletheia } from "aletheia";
import { env } from "@/src/env.mjs";
import { type FilterCondition, singleFilter } from "@aletheia/shared";
import { z } from "zod";

let aletheiaClient: Aletheia | null = null;

export function getDefaultModelParams() {
  return {
    provider: "bedrock",
    adapter: LLMAdapter.Bedrock,
    model: env.ALETHEIA_AWS_BEDROCK_MODEL ?? "",
    temperature: 0.1,
    maxTokens: 1000,
    topP: 0.9,
  };
}

const FilterArraySchema = z.array(singleFilter);

export function parseFiltersFromCompletion(
  completion: string,
): FilterCondition[] {
  const arrayMatch = completion.match(/\[[\s\S]*?\]/)?.[0];
  const objectMatch = completion.match(/\{[\s\S]*?\}/)?.[0];

  const candidates = [
    completion, // full response
    arrayMatch, // extract JSON array
    objectMatch ? `[${objectMatch}]` : undefined, // wrap single object in array
  ].filter((c): c is string => Boolean(c));

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);

      // sometimes, ai returns {filters: [...]}, extract the filters array
      const filtersArray = parsed.filters || parsed;
      const validated = FilterArraySchema.parse(filtersArray);
      return validated;
    } catch {
      // try next candidate
    }
  }
  return [];
}

export function getAletheiaClient(
  publicKey: string,
  secretKey: string,
  baseUrl?: string,
  enabled?: boolean,
): Aletheia {
  if (!aletheiaClient) {
    aletheiaClient = new Aletheia({
      publicKey,
      secretKey,
      baseUrl,
      enabled: enabled ?? true,
    });
  }
  return aletheiaClient;
}
