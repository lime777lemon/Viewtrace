import type { SupabaseClient } from "@supabase/supabase-js";
import { buildCaptureConditionsFromBrowserless } from "@/lib/capture-conditions";
import { computeObservationContentHash } from "@/lib/observation-content-hash";
import { countObservationsThisUtcMonth, remainingObservations } from "@/lib/observation-quota";
import { uploadObservationSnapshotPng } from "@/lib/observation-snapshot-storage";
import { generateObservationVerifyToken } from "@/lib/observation-verify-token";
import { getPngDimensions } from "@/lib/png-dimensions";
import type { LabCwvV1 } from "@/lib/observation-lab-cwv";
import { getPlan, parsePlanId } from "@/lib/plans";
import { nextStateRetryAt } from "@/lib/browserless-state-session";
import { saveObservationLabCwv } from "@/lib/observation-optional-metrics-store";
import { buildRegionalCheckFromSession } from "@/lib/observation-regional-interaction";
import { persistRegionalInteractionCheck } from "@/lib/observation-watch-interaction";
import { runStateMeasurementSession, type StateMeasure } from "@/lib/state-measurement-session";
import type { Observation } from "@/lib/demo/observations";

export type StateCoverageStatus = "pending" | "verified" | "exhausted";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function jstWeekStartDate(now: Date): string {
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  const daysFromMonday = (jst.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate() - daysFromMonday));
  return monday.toISOString().slice(0, 10);
}

function isUsState(region: string): boolean {
  return /^US-[A-Z]{2}$/.test(region.trim());
}

export async function recordStateCoverage(
  admin: SupabaseClient,
  input: {
    userId: string;
    url: string;
    region: string;
    capturedAt: string;
    observationId: string;
    stateVerified: boolean;
    geoAttempts: number;
    stateTargetingRejected?: boolean;
  },
): Promise<void> {
  const region = input.region.trim();
  if (!isUsState(region)) return;
  const captured = new Date(input.capturedAt);
  const weekStart = jstWeekStartDate(Number.isNaN(captured.getTime()) ? new Date() : captured);
  const { data: existing, error: readError } = await admin
    .from("state_coverage")
    .select("status, attempt_count, weekly_retries")
    .eq("user_id", input.userId)
    .eq("week_start", weekStart)
    .eq("region_value", region)
    .maybeSingle();
  if (readError) {
    if (readError.code === "42P01" || readError.code === "PGRST205") return;
    console.warn("[state-coverage] read failed", { code: readError.code });
    return;
  }
  const row = (existing ?? null) as { status?: string; attempt_count?: number; weekly_retries?: number } | null;
  if (row?.status === "verified") return;
  if (row?.status === "exhausted" && !input.stateVerified) return;
  const attemptCount = (row?.attempt_count ?? 0) + Math.max(0, input.geoAttempts);
  const weeklyRetries = row?.weekly_retries ?? 0;
  const now = Number.isNaN(captured.getTime()) ? new Date() : captured;
  const verified = input.stateVerified;
  const rejected = !verified && input.stateTargetingRejected === true;
  const { error } = await admin.from("state_coverage").upsert({
    user_id: input.userId,
    week_start: weekStart,
    region_value: region,
    url: input.url,
    status: verified ? "verified" : rejected ? "exhausted" : "pending",
    verified_observation_id: verified ? input.observationId : null,
    attempt_count: attemptCount,
    weekly_retries: weeklyRetries,
    last_attempt_at: now.toISOString(),
    next_attempt_at: verified || rejected ? null : nextStateRetryAt(now, weeklyRetries)?.toISOString() ?? null,
  });
  if (error) console.warn("[state-coverage] write failed", { code: error.code });
}

async function planLimit(admin: SupabaseClient, userId: string): Promise<number> {
  const { data } = await admin.from("users").select("plan").eq("id", userId).maybeSingle();
  const planId = parsePlanId(typeof (data as { plan?: unknown } | null)?.plan === "string" ? (data as { plan: string }).plan : undefined);
  return getPlan(planId).monthlyObservations;
}

export async function runDueStateCoverage(admin: SupabaseClient, now = new Date()): Promise<{ checked: number; verified: number; pending: number }> {
  const result = { checked: 0, verified: 0, pending: 0 };
  const { data, error } = await admin
    .from("state_coverage")
    .select("user_id, week_start, region_value, url, attempt_count, weekly_retries, status")
    .eq("status", "pending")
    .lte("next_attempt_at", now.toISOString())
    .limit(20);
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return result;
    console.warn("[state-coverage] due read failed", { code: error.code });
    return result;
  }
  for (const raw of data ?? []) {
    const row = raw as {
      user_id: string;
      week_start: string;
      region_value: string;
      url: string;
      attempt_count: number;
      weekly_retries: number;
    };
    result.checked += 1;
    if (jstWeekStartDate(now) !== row.week_start) {
      await admin
        .from("state_coverage")
        .update({ status: "exhausted", next_attempt_at: null })
        .eq("user_id", row.user_id)
        .eq("week_start", row.week_start)
        .eq("region_value", row.region_value);
      continue;
    }
    const used = await countObservationsThisUtcMonth(admin, row.user_id, now);
    const limit = await planLimit(admin, row.user_id);
    if (used == null || remainingObservations(used, limit) < 1) {
      result.pending += 1;
      continue;
    }
    const probe = await runStateMeasurementSession({
      url: row.url,
      region: row.region_value,
      fullPage: true,
      measures: ["screenshot", "interaction"],
      countryFallback: false,
    });
    const weeklyRetries = row.weekly_retries + 1;
    const next = nextStateRetryAt(now, weeklyRetries);
    if (!(probe.ok && probe.stateVerified && probe.png)) {
      const rejected = probe.stateTargetingRejected;
      const exhausted = rejected || !next;
      await admin
        .from("state_coverage")
        .update({
          attempt_count: row.attempt_count + 1,
          weekly_retries: weeklyRetries,
          last_attempt_at: now.toISOString(),
          next_attempt_at: exhausted ? null : next.toISOString(),
          status: exhausted ? "exhausted" : "pending",
        })
        .eq("user_id", row.user_id)
        .eq("week_start", row.week_start)
        .eq("region_value", row.region_value);
      result.pending += 1;
      continue;
    }
    const saved = await saveVerifiedObservation(admin, {
      userId: row.user_id,
      url: row.url,
      region: row.region_value,
      png: probe.png,
      capturedAt: now.toISOString(),
      viaExternalProxy: probe.viaExternalProxy,
      geoAttempts: probe.geoAttempts,
      verifiedMeasurements: probe.verifiedMeasurements,
      proxyProvider: probe.provider === "decodo" ? "decodo" : undefined,
      interaction: probe.interaction,
      labCwv: probe.labCwv,
      durationMs: probe.durationMs,
    });
    await admin
      .from("state_coverage")
      .update({
        status: saved ? "verified" : "pending",
        verified_observation_id: saved,
        attempt_count: row.attempt_count + 1,
        weekly_retries: weeklyRetries,
        last_attempt_at: now.toISOString(),
        next_attempt_at: saved ? null : next?.toISOString() ?? null,
      })
      .eq("user_id", row.user_id)
      .eq("week_start", row.week_start)
      .eq("region_value", row.region_value);
    if (saved) result.verified += 1;
    else result.pending += 1;
  }
  return result;
}

async function saveVerifiedObservation(
  admin: SupabaseClient,
  input: {
    userId: string;
    url: string;
    region: string;
    png: ArrayBuffer;
    capturedAt: string;
    viaExternalProxy: boolean;
    geoAttempts: number;
    verifiedMeasurements: StateMeasure[];
    proxyProvider?: "decodo";
    interaction: unknown;
    labCwv: LabCwvV1 | null;
    durationMs: number;
  },
): Promise<string | null> {
  const id = crypto.randomUUID();
  const blob = await uploadObservationSnapshotPng(id, input.png, { format: "webp", webpQuality: 86, includePerceptualHash: true });
  if (!blob.ok) return null;
  const dims = await getPngDimensions(input.png);
  const captureConditions = buildCaptureConditionsFromBrowserless({
    capturedAt: input.capturedAt,
    regionInput: input.region,
    regionLabel: input.region,
    fullPageRequested: true,
    viaResidential: !input.viaExternalProxy,
    viaExternalProxy: input.viaExternalProxy,
    usedRetryWithoutProxy: false,
    stateVerified: true,
    fallbackLevel: "state",
    geoAttempts: input.geoAttempts,
    verifiedMeasurements: input.verifiedMeasurements,
    proxyProvider: input.proxyProvider,
    residentialStateApplied: true,
    durationMs: null,
    storageFormat: "webp",
    webpQuality: 86,
    imageWidthPx: dims?.width ?? null,
    imageHeightPx: dims?.height ?? null,
    snapshotBytes: blob.snapshotBytes,
    snapshotContentType: blob.snapshotContentType,
    snapshotSha256Present: Boolean(blob.snapshotSha256),
  });
  const observation: Observation = {
    id,
    url: input.url,
    regionValue: input.region,
    regionLabel: input.region,
    capturedAt: input.capturedAt,
    status: "success",
    note: "州単位の再試行",
    snapshotImageUrl: blob.url,
    snapshotSha256: blob.snapshotSha256,
    snapshotPhash: blob.snapshotPhash ?? undefined,
    captureConditions,
  };
  const { error } = await admin.from("observations").insert({
    id,
    user_id: input.userId,
    url: input.url,
    region: input.region,
    region_label: input.region,
    status: "success",
    note: "州単位の再試行",
    snapshot_image_url: blob.url,
    captured_at: input.capturedAt,
    updated_at: input.capturedAt,
    content_hash: computeObservationContentHash(observation),
    snapshot_sha256: blob.snapshotSha256,
    snapshot_phash: blob.snapshotPhash,
    snapshot_bytes: blob.snapshotBytes,
    snapshot_content_type: blob.snapshotContentType,
    capture_conditions: captureConditions,
    verify_token: generateObservationVerifyToken(),
  });
  if (error) {
    console.warn("[state-coverage] observation insert failed", { code: error.code });
    return null;
  }
  if (input.interaction) {
    const check = buildRegionalCheckFromSession({
      raw: input.interaction,
      requestedUrl: input.url,
      requestedRegion: input.region,
      measuredAt: input.capturedAt,
      durationMs: input.durationMs,
      proxyBytes: null,
    });
    await persistRegionalInteractionCheck(admin, {
      userId: input.userId,
      observationId: id,
      url: input.url,
      region: input.region,
      capturedAt: input.capturedAt,
      check,
      billing: "watch_included",
    });
  }
  if (input.labCwv?.error == null && input.labCwv) {
    await saveObservationLabCwv(admin, {
      userId: input.userId,
      observationId: id,
      labCwv: input.labCwv,
    });
  }
  return id;
}
