import { env } from "@/src/env.mjs";
import { hasEntitlementBasedOnPlan } from "@/src/features/entitlements/server/hasEntitlement";
import {
  createTRPCRouter,
  authenticatedProcedure,
} from "@/src/server/api/trpc";
import { getVisibleProductModules } from "@/src/ee/features/ui-customization/productModuleSchema";

export const uiCustomizationRouter = createTRPCRouter({
  get: authenticatedProcedure.query(({ ctx }) => {
    const hasEntitlement = hasEntitlementBasedOnPlan({
      plan: ctx.session.environment.selfHostedInstancePlan,
      entitlement: "self-host-ui-customization",
    });
    if (!hasEntitlement) return null;

    return {
      hostname: env.ALETHEIA_UI_API_HOST,
      documentationHref: env.ALETHEIA_UI_DOCUMENTATION_HREF,
      supportHref: env.ALETHEIA_UI_SUPPORT_HREF,
      feedbackHref: env.ALETHEIA_UI_FEEDBACK_HREF,
      logoLightModeHref: env.ALETHEIA_UI_LOGO_LIGHT_MODE_HREF,
      logoDarkModeHref: env.ALETHEIA_UI_LOGO_DARK_MODE_HREF,
      defaultModelAdapter: env.ALETHEIA_UI_DEFAULT_MODEL_ADAPTER,
      defaultBaseUrlOpenAI: env.ALETHEIA_UI_DEFAULT_BASE_URL_OPENAI,
      defaultBaseUrlAnthropic: env.ALETHEIA_UI_DEFAULT_BASE_URL_ANTHROPIC,
      defaultBaseUrlAzure: env.ALETHEIA_UI_DEFAULT_BASE_URL_AZURE,
      visibleModules: getVisibleProductModules(
        env.ALETHEIA_UI_VISIBLE_PRODUCT_MODULES,
        env.ALETHEIA_UI_HIDDEN_PRODUCT_MODULES,
      ),
    };
  }),
});
