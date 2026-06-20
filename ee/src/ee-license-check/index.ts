import { env } from "../env";

export const isEeAvailable: boolean =
  env.NEXT_PUBLIC_ALETHEIA_CLOUD_REGION !== undefined ||
  env.ALETHEIA_EE_LICENSE_KEY !== undefined;
