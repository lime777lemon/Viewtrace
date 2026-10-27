import { runBrowserlessScrollWithProxyRetry } from "@/lib/browserless-scroll-interaction";
import type {
  RegionalBrowserSessionParams,
  RegionalSyntheticCheckResult,
  SyntheticBrowserProvider,
} from "@/lib/synthetic/browser-provider";

/** 既存 Browserless `/function` + 生成 Puppeteer コード。Engine 抽出前のアダプタ。 */
export class BrowserlessSyntheticProvider implements SyntheticBrowserProvider {
  readonly name = "browserless" as const;

  async runRegionalInteractionCheck(
    params: RegionalBrowserSessionParams,
  ): Promise<RegionalSyntheticCheckResult> {
    return runBrowserlessScrollWithProxyRetry({
      url: params.url,
      region: params.region,
      fixtureHtml: params.fixtureHtml,
      prior: params.prior,
      scan: params.scan,
      environment: params.environment,
    });
  }
}
