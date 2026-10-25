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

export async function runObservationPrimaryScreenshot(params: {
  url: string;
  region: string;
  fullPage: boolean;
  viewport?: { width: number; height: number; isMobile: boolean; hasTouch: boolean };
  interaction?: Record<string, unknown>;
}): Promise<
  | { engine: "playwright_worker"; result: ObservationWorkerCaptureResult }
  | { engine: "browserless"; result: BrowserlessScreenshotResult }
  | { engine: "none"; result: { ok: false; error: "no_capture_backend" } }
> {
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
