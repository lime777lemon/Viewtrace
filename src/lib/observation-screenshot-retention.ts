import type { Observation } from "@/lib/demo/observations";

export const SCREENSHOT_RETENTION_DAY_MS = 24 * 60 * 60 * 1000;

export function screenshotRetentionCutoffIso(retentionDays: number): string {
  const days = Number.isFinite(retentionDays) && retentionDays > 0 ? retentionDays : 7;
  return new Date(Date.now() - days * SCREENSHOT_RETENTION_DAY_MS).toISOString();
}

export function isPastScreenshotRetention(
  capturedAt: string,
  retentionDays: number,
): boolean {
  const t = Date.parse(capturedAt);
  if (Number.isNaN(t)) return false;
  const days = Number.isFinite(retentionDays) && retentionDays > 0 ? retentionDays : 7;
  return t < Date.now() - days * SCREENSHOT_RETENTION_DAY_MS;
}

export function isObservationScreenshotExpired(
  obs: Pick<Observation, "capturedAt"> & {
    snapshotPurgedAt?: string | null;
  },
  retentionDays: number,
): boolean {
  if (obs.snapshotPurgedAt) return true;
  return isPastScreenshotRetention(obs.capturedAt, retentionDays);
}

export function visibleSnapshotImageUrl(
  obs: Pick<Observation, "capturedAt" | "snapshotImageUrl"> & {
    snapshotPurgedAt?: string | null;
  },
  retentionDays: number,
): string | undefined {
  if (isObservationScreenshotExpired(obs, retentionDays)) return undefined;
  const url = obs.snapshotImageUrl?.trim();
  return url && /^https?:\/\//i.test(url) ? url : undefined;
}
