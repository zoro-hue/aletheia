import { MULTI_WINDOW_CONFIG } from "../types";

export const WINDOW_IDS_KEY = "playgroundWindowIds";
export const STREAMING_PREF_KEY = "aletheia-playground-streaming";

const getPrefixedKey = (prefix: string, windowId: string) => {
  const effectiveWindowId = windowId || MULTI_WINDOW_CONFIG.DEFAULT_WINDOW_ID;
  if (effectiveWindowId === MULTI_WINDOW_CONFIG.DEFAULT_WINDOW_ID) {
    return prefix.endsWith("_") ? prefix.slice(0, -1) : prefix;
  }
  return `${prefix}${effectiveWindowId}`;
};

export const getCacheKey = (windowId: string) =>
  getPrefixedKey("aletheia-playgroundCache_", windowId);

export const getModelNameKey = (windowId: string) =>
  getPrefixedKey("aletheia-llmModelName_", windowId);

export const getModelProviderKey = (windowId: string) =>
  getPrefixedKey("aletheia-llmModelProvider_", windowId);
