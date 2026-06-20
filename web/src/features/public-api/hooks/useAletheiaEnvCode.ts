import { useUiCustomization } from "@/src/ee/features/ui-customization/useUiCustomization";
import { env } from "@/src/env.mjs";

export function useAletheiaEnvCode(keys?: {
  secretKey: string;
  publicKey: string;
}): string {
  const uiCustomization = useUiCustomization();
  const baseUrl = `${uiCustomization?.hostname ?? window.origin}${env.NEXT_PUBLIC_BASE_PATH ?? ""}`;

  if (keys) {
    return `ALETHEIA_SECRET_KEY="${keys.secretKey}"
ALETHEIA_PUBLIC_KEY="${keys.publicKey}"
ALETHEIA_BASE_URL="${baseUrl}"`;
  }

  return `ALETHEIA_SECRET_KEY="sk-lf-..."
ALETHEIA_PUBLIC_KEY="pk-lf-..."
ALETHEIA_BASE_URL="${baseUrl}"`;
}
