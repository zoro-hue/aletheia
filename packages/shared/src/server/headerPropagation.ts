import * as opentelemetry from "@opentelemetry/api";
import type { IncomingHttpHeaders } from "http";
import { env } from "../env";

export type AletheiaContextProps = {
  headers?: IncomingHttpHeaders;
  userId?: string;
  projectId?: string;
  apiKeyId?: string;
};

/**
 * Returns a new context containing baggage entries composed from
 * the supplied props (headers, userId, projectId). Existing baggage
 * entries are preserved.
 */
export const contextWithAletheiaProps = (
  props: AletheiaContextProps,
): opentelemetry.Context => {
  const ctx = opentelemetry.context.active();
  let baggage =
    opentelemetry.propagation.getBaggage(ctx) ??
    opentelemetry.propagation.createBaggage();

  if (props.headers) {
    (env.ALETHEIA_LOG_PROPAGATED_HEADERS as string[]).forEach((name) => {
      const value = props.headers![name];
      if (!value) return;
      const strValue = Array.isArray(value) ? JSON.stringify(value) : value;
      baggage = baggage.setEntry(`aletheia.header.${name}`, {
        value: strValue,
      });
    });

    // get x-aletheia-xxx headers and add them to the span
    Object.keys(props.headers).forEach((name) => {
      if (
        name.toLowerCase().startsWith("x-aletheia") ||
        name.toLowerCase().startsWith("x_aletheia")
      ) {
        const value = props.headers![name];
        if (!value) return;
        const strValue = Array.isArray(value) ? JSON.stringify(value) : value;
        baggage = baggage.setEntry(`aletheia.header.${name}`, {
          value: strValue,
        });
      }
    });
  }
  if (props.userId) {
    baggage = baggage.setEntry("aletheia.user.id", { value: props.userId });
  }
  if (props.projectId) {
    baggage = baggage.setEntry("aletheia.project.id", {
      value: props.projectId,
    });
  }
  if (props.apiKeyId) {
    baggage = baggage.setEntry("aletheia.api_key.id", {
      value: props.apiKeyId,
    });
  }

  return opentelemetry.propagation.setBaggage(ctx, baggage);
};
