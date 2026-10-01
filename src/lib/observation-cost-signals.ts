export type CaptureCostAttemptStage = "state" | "country" | "no_proxy" | "direct";

/** 1 Browserless 呼び出し。失敗試行も含む。content_hash には入れない。 */
export type CaptureCostAttemptV1 = {
  stage: CaptureCostAttemptStage;
  ok: boolean;
  /** Browserless に実際に投げた（原価が発生し得る） */
  billed: boolean;
  duration_ms: number | null;
  estimated_time_units: number | null;
  /** null = 未測定。0 = 転送 0 を観測した */
  proxy_bytes: number | null;
  used_proxy: boolean;
  error: string | null;
};

/** 測定できた非負の数だけ。未測定は null。0 は「0だと分かった」ときだけ。 */
export function nonNegativeNumberOrNull(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

/**
 * ヘッダ等の生値から proxy bytes を読む。
 * "" / 欠落 / 非数値は null（0 にしない）。"0" だけが 0。
 */
export function parseMeasuredProxyBytes(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  return nonNegativeNumberOrNull(Number(trimmed));
}

export function estimatedBrowserTimeUnits(durationMs: number): number {
  if (!Number.isFinite(durationMs) || durationMs < 0) return 1;
  return Math.max(1, Math.ceil(durationMs / 30_000));
}

export function summarizeCaptureCostAttempts(log: CaptureCostAttemptV1[]): {
  duration_ms: number | null;
  estimated_time_units: number | null;
  proxy_bytes: number | null;
  proxy_bytes_measured_attempts: number;
  attempts: number;
} {
  const billed = log.filter((row) => row.billed && row.duration_ms != null);
  const duration_ms = billed.length
    ? billed.reduce((sum, row) => sum + (row.duration_ms ?? 0), 0)
    : null;
  const estimated_time_units = billed.length
    ? billed.reduce((sum, row) => sum + (row.estimated_time_units ?? 0), 0)
    : null;

  const proxyUsing = log.filter((row) => row.billed && row.used_proxy);
  const proxy_bytes_measured_attempts = log.filter((row) => row.proxy_bytes != null).length;
  const proxyComplete =
    proxyUsing.length > 0 && proxyUsing.every((row) => row.proxy_bytes != null);
  const proxy_bytes = proxyComplete
    ? proxyUsing.reduce((sum, row) => sum + (row.proxy_bytes ?? 0), 0)
    : null;

  return {
    duration_ms,
    estimated_time_units,
    proxy_bytes,
    proxy_bytes_measured_attempts,
    attempts: billed.length,
  };
}
