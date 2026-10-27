import { withSpan, ATTR, urlHostAttr, requestedStateAttr, setSpanAttrs } from "@/lib/otel/trace";
import type {
  RegionalBrowserSessionParams,
  RegionalInteractionExecutionV1,
  RegionalSyntheticCheckResult,
} from "@/lib/synthetic/browser-provider";
import {
  getSyntheticBrowserProvider,
  getSyntheticFallbackProvider,
} from "@/lib/synthetic/get-synthetic-browser-provider";
import { resolveRegionRoute } from "@/lib/synthetic/region-route";

export type RegionalSyntheticCheckParams = RegionalBrowserSessionParams;

function executionMeta(
  provider: RegionalInteractionExecutionV1["provider"],
  fallbackUsed: boolean,
  routeRegion: string,
): RegionalInteractionExecutionV1 {
  return {
    provider,
    browser: "chromium",
    fallback_used: fallbackUsed,
    worker_region: routeRegion || null,
  };
}

function providerToExecutionProvider(
  name: "browserless" | "self_hosted",
): RegionalInteractionExecutionV1["provider"] {
  return name === "self_hosted" ? "self_hosted_playwright" : "browserless";
}

/**
 * Watch / Monitoring / 手動 Check の共通入口。
 * Browserless を直接呼ばず SyntheticBrowserProvider 経由。
 */
export async function runRegionalSyntheticCheck(
  params: RegionalSyntheticCheckParams,
): Promise<RegionalSyntheticCheckResult> {
  const route = params.route ?? resolveRegionRoute(params.region);
  const sessionParams: RegionalBrowserSessionParams = {
    ...params,
    region: params.region ?? route.region,
    route,
  };

  return withSpan(
    "synthetic.regional_interaction_check",
    {
      [ATTR.operation]: "interaction_check",
      [ATTR.urlHost]: urlHostAttr(params.url),
      [ATTR.regionRequested]: sessionParams.region ?? null,
      [ATTR.stateRequested]: requestedStateAttr(sessionParams.region),
      "viewtrace.synthetic.scan": params.scan ?? "full",
      "viewtrace.synthetic.prior_count": params.prior?.length ?? 0,
    },
    async (span) => {
      const primary = getSyntheticBrowserProvider();
      let fallbackUsed = false;
      let result = await primary.runRegionalInteractionCheck(sessionParams);

      const fallback = getSyntheticFallbackProvider();
      if (!result.ok && fallback) {
        const retry = await fallback.runRegionalInteractionCheck(sessionParams);
        if (retry.ok) {
          result = retry;
          fallbackUsed = true;
          setSpanAttrs(span, {
            "viewtrace.synthetic.fallback_provider": fallback.name,
          });
        }
      }

      setSpanAttrs(span, {
        "viewtrace.synthetic.primary_provider": primary.name,
        "viewtrace.synthetic.fallback_used": fallbackUsed,
        "viewtrace.synthetic.ok": result.ok,
      });

      if (result.ok) {
        const execProvider = fallbackUsed
          ? providerToExecutionProvider(fallback!.name)
          : providerToExecutionProvider(primary.name);
        result = {
          ...result,
          check: {
            ...result.check,
            execution: executionMeta(execProvider, fallbackUsed, route.region),
          },
        };
      }

      return result;
    },
  );
}
