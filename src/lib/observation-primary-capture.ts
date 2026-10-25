import {
  isBrowserlessConfigured,
  runBrowserlessScreenshotWithProxyRetry,
  type BrowserlessScreenshotResult,
} from "@/lib/browserless-screenshot";
import { isPlaywrightWorkerCaptureEnabled } from "@/lib/observation-capture-backend";
import {
  runObservationWorkerCapture,
  type ObservationWorkerCaptureResult,
} from "@/lib/observation-worker-capture";
import {
  ATTR,
  browserlessResultAttrs,
  markSpanResult,
  requestedStateAttr,
  setSpanAttrs,
  urlHostAttr,
  withSpan,
} from "@/lib/otel/trace";

type PrimaryCaptureOutcome =
  | { engine: "playwright_worker"; result: ObservationWorkerCaptureResult }
  | { engine: "browserless"; result: BrowserlessScreenshotResult }
  | { engine: "none"; result: { ok: false; error: "no_capture_backend" } };

async function runPrimaryInner(params: {
  url: string;
  region: string;
  fullPage: boolean;
  viewport?: { width: number; height: number; isMobile: boolean; hasTouch: boolean };
  interaction?: Record<string, unknown>;
}): Promise<PrimaryCaptureOutcome> {
  if (isPlaywrightWorkerCaptureEnabled()) {
    const result = await runObservationWorkerCapture({
      url: params.url,
      region: params.region,
      fullPage: params.fullPage,
    });
    return { engine: "playwright_worker", result };
  }
  if (isBrowserlessConfigured()) {
    const result = await runBrowserlessScreenshotWithProxyRetry(params);
    return { engine: "browserless", result };
  }
  return { engine: "none", result: { ok: false, error: "no_capture_backend" } };
}

/**
 * 主スクリーンショット（Browserless or Playwright worker）。
 * span `capture.primary` に engine・地域・state 確認・試行回数・proxy bytes を載せる。
 */
export async function runObservationPrimaryScreenshot(params: {
  url: string;
  region: string;
  fullPage: boolean;
  viewport?: { width: number; height: number; isMobile: boolean; hasTouch: boolean };
  interaction?: Record<string, unknown>;
}): Promise<PrimaryCaptureOutcome> {
  return withSpan(
    "capture.primary",
    {
      [ATTR.urlHost]: urlHostAttr(params.url),
      [ATTR.regionRequested]: params.region,
      [ATTR.stateRequested]: requestedStateAttr(params.region),
      [ATTR.fullPage]: params.fullPage,
      "viewtrace.viewport.width": params.viewport?.width ?? null,
      "viewtrace.viewport.height": params.viewport?.height ?? null,
      "viewtrace.interaction.requested": Boolean(params.interaction),
    },
    async (span) => {
      const outcome = await runPrimaryInner(params);
      setSpanAttrs(span, { [ATTR.engine]: outcome.engine });
      if (outcome.engine === "browserless") {
        setSpanAttrs(span, browserlessResultAttrs(outcome.result));
        markSpanResult(span, outcome.result);
      } else if (outcome.engine === "playwright_worker") {
        const r = outcome.result;
        markSpanResult(span, r, {
          [ATTR.durationMs]: r.ok ? r.durationMs ?? null : null,
          [ATTR.observedCountry]: r.ok ? r.observed.country ?? null : null,
          [ATTR.observedState]: r.ok ? r.observed.region ?? null : null,
          "viewtrace.proxy.residential": r.ok ? r.viaResidentialProxy ?? null : null,
        });
      } else {
        markSpanResult(span, outcome.result);
      }
      return outcome;
    },
  );
}
