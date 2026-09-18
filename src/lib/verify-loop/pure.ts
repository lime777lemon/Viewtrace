const OBSERVATION_NEW_PREFIX = "/dashboard/observations/new";

/** Prefill path for first observation. Query may include url= only. */
export function buildObservationNewPathFromNormalizedUrl(normalizedUrl: string): string {
  const params = new URLSearchParams();
  params.set("url", normalizedUrl);
  return `${OBSERVATION_NEW_PREFIX}?${params.toString()}`;
}

export function isVerifyLoopNextPath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  if (!path.startsWith(OBSERVATION_NEW_PREFIX)) return false;
  if (path.includes("://")) return false;
  return path.length <= 2000;
}

/** Drop keys that must never land in verify_events.metadata. */
export function sanitizeVerifyEventMetadata(
  raw: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!raw) return {};
  const blocked = new Set([
    "email",
    "ip",
    "ip_address",
    "url",
    "raw_url",
    "submitted_url",
    "password",
    "phone",
    "name",
    "full_name",
  ]);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    const k = key.toLowerCase();
    if (blocked.has(k)) continue;
    if (typeof value === "string" && /@/.test(value)) continue;
    out[key] = value;
  }
  return out;
}
