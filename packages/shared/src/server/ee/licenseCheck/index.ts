import { env, type SharedEnv } from "../../../env";

/**
 * Check if enterprise EE license is available.
 * Returns true for:
 * - Aletheia Cloud (any region)
 * - Self-hosted with enterprise license key (starts with "aletheia_ee_")
 *
 * Note: Pro tier (aletheia_pro_*) does NOT count as enterprise.
 */
export function isEnterpriseLicenseAvailable(envOverride?: SharedEnv): boolean {
  const e = envOverride ?? env;

  // Aletheia Cloud always has enterprise features
  if (e.NEXT_PUBLIC_ALETHEIA_CLOUD_REGION !== undefined) {
    return true;
  }

  // Self-hosted: must have enterprise license key (not pro)
  const licenseKey = e.ALETHEIA_EE_LICENSE_KEY;
  if (licenseKey && licenseKey.startsWith("aletheia_ee_")) {
    return true;
  }

  return false;
}
