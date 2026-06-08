"use server";

import { getSession } from "@/lib/auth/session";
import {
  isBrowserlessConfigured,
  runBrowserlessScreenshotWithProxyRetry,
} from "@/lib/browserless-screenshot";
import { getObservationMergedForPlan } from "@/lib/demo/user-observations";
import {
  computeSnapshotDiffRatioBetweenBuffers,
  formatDiffRatioPercent,
} from "@/lib/snapshot-diff";

export type LivePageCompareVerdict = "unchanged" | "minor" | "changed";

const MINOR_CHANGE_THRESHOLD = 0.01;
const MAJOR_CHANGE_THRESHOLD = 0.07;

function verdictFromRatio(ratio: number): LivePageCompareVerdict {
  if (ratio < MINOR_CHANGE_THRESHOLD) return "unchanged";
  if (ratio < MAJOR_CHANGE_THRESHOLD) return "minor";
  return "changed";
}

export type CompareObservationLivePageResult =
  | {
      ok: true;
      ratio: number;
      ratioLabel: string;
      verdict: LivePageCompareVerdict;
    }
  | {
      ok: false;
      error:
        | "unauthorized"
        | "not_found"
        | "not_success"
        | "no_snapshot"
        | "no_region"
        | "browserless_not_configured"
        | "forbidden_host"
        | "capture_failed"
        | "diff_failed";
    };

/**
 * オンデマンド: 同一 URL・地域でページを再撮影し、記録時の保存画像とピクセル差分を比較する。
 * 新しい Observation は作成せず、再撮影画像も永続化しない。
 */
export async function compareObservationLivePageAction(
  observationId: string,
): Promise<CompareObservationLivePageResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };

  const obs = await getObservationMergedForPlan(observationId, session.plan);
  if (!obs) return { ok: false, error: "not_found" };
  if (obs.status !== "success") return { ok: false, error: "not_success" };

  const storedUrl = obs.snapshotImageUrl?.trim();
  if (!storedUrl || !/^https?:\/\//i.test(storedUrl)) {
    return { ok: false, error: "no_snapshot" };
  }

  const region = obs.regionValue?.trim();
  if (!region) return { ok: false, error: "no_region" };

  if (!isBrowserlessConfigured()) {
    return { ok: false, error: "browserless_not_configured" };
  }

  const fullPage = obs.captureConditions?.full_page_requested === true;

  const shot = await runBrowserlessScreenshotWithProxyRetry({
    url: obs.url,
    region,
    fullPage,
  });

  if (!shot.ok) {
    if (shot.error === "forbidden_host") {
      return { ok: false, error: "forbidden_host" };
    }
    return { ok: false, error: "capture_failed" };
  }

  let storedBuf: Buffer;
  try {
    const res = await fetch(storedUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return { ok: false, error: "diff_failed" };
    storedBuf = Buffer.from(await res.arrayBuffer());
  } catch {
    return { ok: false, error: "diff_failed" };
  }

  const liveBuf = Buffer.from(shot.png);
  const ratio = await computeSnapshotDiffRatioBetweenBuffers(liveBuf, storedBuf);
  if (ratio === null) return { ok: false, error: "diff_failed" };

  return {
    ok: true,
    ratio,
    ratioLabel: formatDiffRatioPercent(ratio),
    verdict: verdictFromRatio(ratio),
  };
}
