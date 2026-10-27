import type { RegionalInteractionExecutionV1 } from "@/lib/synthetic/browser-provider";

export function parseRegionalInteractionExecution(
  raw: unknown,
): RegionalInteractionExecutionV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const provider = o.provider;
  if (provider !== "browserless" && provider !== "self_hosted_playwright") return null;
  return {
    provider,
    browser: "chromium",
    fallback_used: o.fallback_used === true,
    worker_region:
      typeof o.worker_region === "string" && o.worker_region.trim()
        ? o.worker_region.trim()
        : null,
  };
}
