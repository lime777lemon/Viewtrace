/** One request observed during a page load or a later action. Unmeasured fields stay null. */

export const RESOURCE_TYPES = ["document", "script", "stylesheet", "image", "font", "xhr", "fetch", "other"] as const;
export const REQUEST_FAILURES = ["failed", "timeout", "blocked", "cors", "aborted"] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];
export type RequestFailure = (typeof REQUEST_FAILURES)[number];

export type ResourceRequestV1 = {
  method: string;
  /** Path only. A different host is prefixed. Query strings are not stored. */
  path: string;
  status: number | null;
  type: ResourceType;
  duration_ms: number | null;
  transfer_bytes: number | null;
  failure: RequestFailure | null;
  third_party: boolean;
  api: boolean;
};

const RESOURCE_LIMIT = 8;

export function classifyRequestFailure(errorText: string, status: number | null): RequestFailure | null {
  const text = errorText || "";
  if (/TIMED_OUT|ERR_CONNECTION_TIMED_OUT|timeout/i.test(text)) return "timeout";
  if (/ERR_ABORTED/i.test(text)) return "aborted";
  if (/BLOCKED_BY_CLIENT|BLOCKED_BY_RESPONSE|BLOCKED_BY_ORB|ERR_BLOCKED/i.test(text)) return "blocked";
  if (/CORS|Access-Control-Allow-Origin/i.test(text)) return "cors";
  if (status != null && status >= 400) return "failed";
  if (text) return "failed";
  return null;
}

export function parseResourceRequest(raw: unknown): ResourceRequestV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const path = typeof row.path === "string" ? row.path.split("?")[0]!.slice(0, 160) : "";
  if (!path) return null;
  const method = typeof row.method === "string" && row.method.trim() ? row.method.trim().slice(0, 12).toUpperCase() : "GET";
  const status = typeof row.status === "number" && Number.isFinite(row.status) ? Math.round(row.status) : null;
  const type = RESOURCE_TYPES.includes(row.type as ResourceType) ? (row.type as ResourceType) : "other";
  const duration = typeof row.duration_ms === "number" && Number.isFinite(row.duration_ms) ? Math.max(0, Math.round(row.duration_ms)) : null;
  const bytes = typeof row.transfer_bytes === "number" && Number.isFinite(row.transfer_bytes) ? Math.max(0, Math.round(row.transfer_bytes)) : null;
  const failure = REQUEST_FAILURES.includes(row.failure as RequestFailure)
    ? (row.failure as RequestFailure)
    : status != null && status >= 400
      ? "failed"
      : row.failed === true
        ? "failed"
        : null;
  return {
    method,
    path,
    status,
    type,
    duration_ms: duration,
    transfer_bytes: bytes,
    failure,
    third_party: row.third_party === true,
    api: row.api === true || /^\/api(?:\/|$)/.test(path),
  };
}

function rank(row: ResourceRequestV1): number {
  if (row.failure || row.status == null || row.status >= 400) return 0;
  if (row.api || row.type === "xhr" || row.type === "fetch" || (row.method !== "GET" && row.method !== "HEAD")) return 1;
  if (row.type === "document") return 2;
  return 3;
}

/** Keeps the action window in time order. Failures and API calls stay when the cap is reached. */
export function selectResourceRequests(raw: unknown, limit = RESOURCE_LIMIT): ResourceRequestV1[] {
  if (!Array.isArray(raw)) return [];
  const rows = raw.flatMap((item) => {
    const parsed = parseResourceRequest(item);
    return parsed ? [parsed] : [];
  });
  if (rows.length <= limit) return rows;
  const ranked = rows.map((row, index) => ({ index, rank: rank(row) }));
  ranked.sort((a, b) => a.rank - b.rank || a.index - b.index);
  const keep = new Set(ranked.slice(0, limit).map((row) => row.index));
  return rows.filter((_, index) => keep.has(index));
}

export function formatTransferBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${Math.round((bytes / 1024) * 10) / 10} KB`;
}

/** POST /api/checkout · 500 · failed */
export function formatResourceRequest(row: ResourceRequestV1): string {
  const parts = [`${row.method} ${row.path}`, row.status == null ? "failed" : String(row.status)];
  if (row.failure && row.failure !== "failed") parts.push(row.failure);
  else if (row.failure === "failed" || (row.status != null && row.status >= 400)) parts.push("failed");
  if (row.duration_ms != null) parts.push(`${row.duration_ms} ms`);
  if (row.transfer_bytes != null) parts.push(formatTransferBytes(row.transfer_bytes));
  return parts.join(" · ");
}
