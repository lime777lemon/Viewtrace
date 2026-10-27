import { isBrowserlessConfigured } from "@/lib/browserless-screenshot";
import type { SyntheticProviderName } from "@/lib/synthetic/browser-provider";

function readProviderEnv(): string {
  return (
    process.env.VIEWTRACE_SYNTHETIC_BROWSER_PROVIDER?.trim().toLowerCase() ||
    process.env.SYNTHETIC_BROWSER_PROVIDER?.trim().toLowerCase() ||
    "browserless"
  );
}

export function resolveSyntheticProviderName(): SyntheticProviderName {
  const raw = readProviderEnv();
  if (raw === "self_hosted" || raw === "self-hosted" || raw === "playwright") {
    return "self_hosted";
  }
  return "browserless";
}

export function resolveSyntheticFallbackProviderName(): SyntheticProviderName | null {
  const raw =
    process.env.VIEWTRACE_SYNTHETIC_BROWSER_FALLBACK?.trim().toLowerCase() ||
    process.env.SYNTHETIC_BROWSER_FALLBACK?.trim().toLowerCase() ||
    "";
  if (raw === "browserless") return "browserless";
  if (raw === "self_hosted" || raw === "self-hosted") return "self_hosted";
  return null;
}

/** Shared interaction engine on worker — not wired yet (capture worker only has /capture). */
export function isSelfHostedSyntheticReady(): boolean {
  return Boolean(
    process.env.VIEWTRACE_SYNTHETIC_WORKER_URL?.trim() &&
      process.env.VIEWTRACE_SYNTHETIC_WORKER_SECRET?.trim(),
  );
}

/** UI / actions: at least one provider can run a regional check. */
export function isSyntheticInteractionConfigured(): boolean {
  const primary = resolveSyntheticProviderName();
  if (primary === "browserless" && isBrowserlessConfigured()) return true;
  if (primary === "self_hosted" && isSelfHostedSyntheticReady()) return true;
  const fallback = resolveSyntheticFallbackProviderName();
  if (fallback === "browserless" && isBrowserlessConfigured()) return true;
  if (fallback === "self_hosted" && isSelfHostedSyntheticReady()) return true;
  return false;
}
