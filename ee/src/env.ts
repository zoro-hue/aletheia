import { z } from "zod";
import { removeEmptyEnvVariables } from "@aletheia/shared";

const EnvSchema = z.object({
  NEXT_PUBLIC_ALETHEIA_CLOUD_REGION: z.string().optional(),
  ALETHEIA_EE_LICENSE_KEY: z.string().optional(),
});

export const env = EnvSchema.parse(removeEmptyEnvVariables(process.env));
