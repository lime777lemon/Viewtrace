import { SCROLL_ENGINE_BROWSERLESS_RUNTIME } from "@/lib/interaction-engine/generated/scroll-engine-browserless-runtime";

/** JavaScript prepended to Browserless /function for shared scroll engine. */
export function scrollEngineBrowserlessRuntime(): string {
  return SCROLL_ENGINE_BROWSERLESS_RUNTIME.replace(/^\s*"use strict";\s*/, "");
}
