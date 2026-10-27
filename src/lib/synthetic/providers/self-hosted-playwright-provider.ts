import type {
  RegionalBrowserSessionParams,
  RegionalSyntheticCheckResult,
  SyntheticBrowserProvider,
} from "@/lib/synthetic/browser-provider";
import { isSelfHostedSyntheticReady } from "@/lib/synthetic/synthetic-config";

/**
 * 将来: shared Interaction Engine + Playwright page adapter。
 * Worker は Vercel 外（`workers/`）。現時点は worker URL 未設定時に明示エラー。
 */
export class SelfHostedPlaywrightProvider implements SyntheticBrowserProvider {
  readonly name = "self_hosted" as const;

  async runRegionalInteractionCheck(
    _params: RegionalBrowserSessionParams,
  ): Promise<RegionalSyntheticCheckResult> {
    if (!isSelfHostedSyntheticReady()) {
      return {
        ok: false,
        error: "self_hosted_not_configured",
        durationMs: 0,
        proxyBytes: null,
        detail:
          "Set VIEWTRACE_SYNTHETIC_WORKER_URL and VIEWTRACE_SYNTHETIC_WORKER_SECRET when the interaction worker ships.",
      };
    }
    return {
      ok: false,
      error: "self_hosted_engine_pending",
      durationMs: 0,
      proxyBytes: null,
      detail: "Synthetic worker HTTP endpoint for Regional Interaction Check is not implemented yet.",
    };
  }
}
