import { HOVER_ENGINE_BROWSERLESS_RUNTIME } from "@/lib/interaction-engine/generated/hover-engine-browserless-runtime";

export function hoverEngineBrowserlessRuntime(): string {
  return HOVER_ENGINE_BROWSERLESS_RUNTIME.replace(/^\s*"use strict";\s*/, "");
}
