import type { InteractionPriorRow } from "@/lib/observation-interaction-plan";
import type { RegionalInteractionCheckV1 } from "@/lib/observation-regional-interaction";
import type { BrowserlessScrollResult } from "@/lib/browserless-scroll-interaction";

export type SyntheticProviderName = "browserless" | "self_hosted";

export type RegionalProxyConfig = {
  server: string;
  username?: string;
  password?: string;
};

export type RegionRoute = {
  region: string;
  proxy: RegionalProxyConfig | null;
};

/** 1 Region × 1 Check session の入力。Geo/proxy は RegionRoute でも渡せる。 */
export type RegionalBrowserSessionParams = {
  url: string;
  region?: string;
  route?: RegionRoute | null;
  fixtureHtml?: string;
  prior?: InteractionPriorRow[];
  scan?: "full" | "light";
  environment?: { device_class?: "desktop" | "mobile" };
  timeoutMs?: number;
};

export type RegionalSyntheticCheckResult = BrowserlessScrollResult;

export interface SyntheticBrowserProvider {
  readonly name: SyntheticProviderName;

  runRegionalInteractionCheck(
    params: RegionalBrowserSessionParams,
  ): Promise<RegionalSyntheticCheckResult>;
}

export type RegionalInteractionExecutionV1 = {
  provider: "browserless" | "self_hosted_playwright";
  browser: "chromium";
  fallback_used: boolean;
  worker_region?: string | null;
};
