import type { SupabaseClient } from "@supabase/supabase-js";
import { buildCaptureConditionsFromBrowserless, buildCaptureConditionsFromPlaywrightWorker } from "@/lib/capture-conditions";
import type { Observation } from "@/lib/demo/observations";
import { computeObservationContentHash } from "@/lib/observation-content-hash";
import { runObservationPrimaryScreenshot } from "@/lib/observation-primary-capture";
import { stampMeasurement } from "@/lib/measurement-record";
import { seoFactsForObservation } from "@/lib/observation-seo-facts";
import { uploadObservationSnapshotPng } from "@/lib/observation-snapshot-storage";
import { collectObservationWebFacts } from "@/lib/observation-web-facts";
import { getPngDimensions } from "@/lib/png-dimensions";
import { getPlan, parsePlanId } from "@/lib/plans";
import { getRegionLabelForLocale, getRegionOptions } from "@/lib/regions";
import { generateObservationVerifyToken } from "@/lib/observation-verify-token";
import { htmlHeadSignalsHasAny } from "@/lib/url-preview";
import { runUrlPreviewFetch } from "@/lib/url-preview-fetch";

function regionLabel(region: string): string {
  const option = getRegionOptions("pro").find((item) => item.value === region);
  return option ? getRegionLabelForLocale(option, "en") : region;
}

/** One Observation for a Monitoring Run. Journey steps stay on journey_runs. */
export async function recordMonitoringPageObservation(
  supabase: SupabaseClient,
  input: { userId: string; url: string; region: string },
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await supabase.from("users").select("plan").eq("id", input.userId).maybeSingle();
  const plan = getPlan(parsePlanId(typeof (user.data as { plan?: unknown } | null)?.plan === "string" ? String((user.data as { plan: string }).plan) : null));
  const region = input.region.trim();
  const label = regionLabel(region);
  const primary = await runObservationPrimaryScreenshot({
    url: input.url,
    region,
    fullPage: plan.snapshotFullPage,
  });
  const shot = primary.result;
  if (!shot.ok || !("png" in shot)) return { ok: false, error: "error" in shot ? shot.error : "screenshot_failed" };

  const id = crypto.randomUUID();
  const blobResult = await uploadObservationSnapshotPng(id, shot.png, {
    format: "webp",
    webpQuality: 86,
    includePerceptualHash: true,
  });
  const blobUrl = blobResult.ok ? blobResult.url : null;
  const capturedAt = new Date().toISOString();
  const pngDims = await getPngDimensions(shot.png);
  const image = {
    storageFormat: "webp" as const,
    webpQuality: 86,
    imageWidthPx: pngDims?.width ?? null,
    imageHeightPx: pngDims?.height ?? null,
    snapshotBytes: blobResult.ok ? blobResult.snapshotBytes : null,
    snapshotContentType: blobResult.ok ? blobResult.snapshotContentType : null,
    snapshotSha256Present: Boolean(blobResult.ok && blobResult.snapshotSha256),
  };

  let htmlSignals;
  let previewForFacts: Awaited<ReturnType<typeof runUrlPreviewFetch>> | undefined;
  try {
    const preview = await runUrlPreviewFetch(input.url, {
      screenshotFallback: false,
      regionValue: region,
      retryWithoutProxyOnFailure: true,
    });
    previewForFacts = preview;
    if (preview.ok && htmlHeadSignalsHasAny(preview.htmlSignals)) htmlSignals = preview.htmlSignals;
  } catch {
    htmlSignals = undefined;
  }

  let captureConditions =
    primary.engine === "playwright_worker" && primary.result.ok
      ? buildCaptureConditionsFromPlaywrightWorker({
          capturedAt,
          regionInput: region,
          regionLabel: label,
          fullPageRequested: plan.snapshotFullPage,
          observedCountry: primary.result.observed.country,
          observedState: primary.result.observed.region,
          viaResidentialProxy: primary.result.viaResidentialProxy,
          durationMs: primary.result.durationMs,
          ...image,
        })
      : buildCaptureConditionsFromBrowserless({
          capturedAt,
          regionInput: region,
          regionLabel: label,
          fullPageRequested: plan.snapshotFullPage,
          viaResidential: primary.engine === "browserless" && primary.result.ok ? primary.result.viaResidential ?? false : false,
          viaExternalProxy: primary.engine === "browserless" && primary.result.ok ? primary.result.viaExternalProxy ?? false : false,
          usedRetryWithoutProxy: primary.engine === "browserless" && primary.result.ok ? primary.result.usedRetryWithoutProxy ?? false : false,
          residentialStateApplied: primary.engine === "browserless" && primary.result.ok ? primary.result.residentialStateApplied ?? false : false,
          durationMs: primary.engine === "browserless" && primary.result.ok ? primary.result.durationMs ?? null : null,
          estimatedTimeUnits: primary.engine === "browserless" && primary.result.ok ? primary.result.estimatedTimeUnits ?? null : null,
          proxyBytes: primary.engine === "browserless" && primary.result.ok ? primary.result.proxyBytes ?? null : null,
          proxyBytesMeasuredAttempts: primary.engine === "browserless" && primary.result.ok ? primary.result.proxyBytesMeasuredAttempts ?? null : null,
          fallback: primary.engine === "browserless" && primary.result.ok ? primary.result.usedRetryWithoutProxy ?? false : false,
          attempts: primary.engine === "browserless" && primary.result.ok ? primary.result.attempts ?? null : null,
          attemptsLog: primary.engine === "browserless" && primary.result.ok ? primary.result.attemptsLog ?? null : null,
          ...image,
        });
  if (primary.engine === "playwright_worker" && primary.result.ok && primary.result.htmlSignals) {
    captureConditions = { ...captureConditions, html_signals: primary.result.htmlSignals };
  } else if (htmlSignals) {
    captureConditions = { ...captureConditions, html_signals: htmlSignals };
  }
  try {
    const preview = previewForFacts?.ok ? previewForFacts : undefined;
    const webFacts = await collectObservationWebFacts({
      target: input.url,
      observedAt: capturedAt,
      preview: preview
        ? {
            status: preview.status,
            final_url: preview.canonicalUrl,
            via_proxy: preview.viaProxy,
            headers: preview.headers,
            html_sample_sha256: preview.htmlSampleSha256,
            html_sample_bytes: preview.htmlSampleBytes,
            html_sample_truncated: preview.htmlSampleTruncated,
          }
        : undefined,
    });
    if (webFacts) captureConditions = { ...captureConditions, web_facts: webFacts };
    captureConditions = stampMeasurement(captureConditions);
  } catch {
    /* Signals stay absent when the fetch record is unavailable. */
  }
  const seoFacts = seoFactsForObservation({
    requestedUrl: input.url,
    storedHtmlSignals: captureConditions.html_signals,
    preview: previewForFacts?.ok
      ? { ok: true, html: previewForFacts.html, htmlSignals: previewForFacts.htmlSignals }
      : { ok: false },
    webFacts: captureConditions.web_facts,
  });
  if (seoFacts) captureConditions = { ...captureConditions, seo_facts: seoFacts };

  const observation: Observation = {
    id,
    url: input.url,
    regionValue: region,
    regionLabel: label,
    capturedAt,
    status: blobUrl ? "success" : "failure",
    note: "Monitoring run",
    snapshotImageUrl: blobUrl ?? undefined,
    snapshotSha256: blobResult.ok ? blobResult.snapshotSha256 ?? undefined : undefined,
    snapshotPhash: blobResult.ok ? blobResult.snapshotPhash ?? undefined : undefined,
    captureConditions,
  };
  const { error } = await supabase.from("observations").insert({
    id,
    user_id: input.userId,
    url: input.url,
    region,
    region_label: label,
    status: blobUrl ? "success" : "failure",
    note: "Monitoring run",
    snapshot_image_url: blobUrl,
    captured_at: capturedAt,
    updated_at: capturedAt,
    content_hash: computeObservationContentHash(observation),
    snapshot_sha256: blobResult.ok ? blobResult.snapshotSha256 : null,
    snapshot_phash: blobResult.ok ? blobResult.snapshotPhash : null,
    snapshot_bytes: blobResult.ok ? blobResult.snapshotBytes : null,
    snapshot_content_type: blobResult.ok ? blobResult.snapshotContentType : null,
    capture_conditions: captureConditions,
    verify_token: generateObservationVerifyToken(),
  });
  if (error) return { ok: false, error: "save_failed" };
  return { ok: true, id };
}
