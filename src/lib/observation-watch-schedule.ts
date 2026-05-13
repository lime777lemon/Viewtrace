export type WatchFrequency = "daily" | "weekly" | "monthly";
export type WatchNotifyMode = "always" | "change_only";

export function parseWatchFrequency(raw: string): WatchFrequency | null {
  if (raw === "daily" || raw === "weekly" || raw === "monthly") return raw;
  return null;
}

export function parseWatchNotifyMode(raw: string): WatchNotifyMode | null {
  if (raw === "always" || raw === "change_only") return raw;
  return null;
}

/** UI プレビュー用: 「毎日（…）」→「毎日」、英語は括弧の手前まで。 */
export function shortenWatchOptionLabelForPreview(label: string): string {
  const full = label.trim();
  const i = full.indexOf("（");
  if (i > 0) return full.slice(0, i).trim();
  const j = full.indexOf("(");
  if (j > 0) return full.slice(0, j).trim();
  return full;
}

export function maxRepeatForFrequency(f: WatchFrequency): number {
  if (f === "daily") return 24;
  if (f === "weekly") return 7;
  return 4;
}

export function clampRepeatCount(f: WatchFrequency, n: number): number {
  const max = maxRepeatForFrequency(f);
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v)) return 1;
  return Math.max(1, Math.min(v, max));
}

export function msForFrequencyWindow(f: WatchFrequency): number {
  const day = 24 * 60 * 60 * 1000;
  if (f === "daily") return day;
  if (f === "weekly") return 7 * day;
  return 30 * day;
}

/** 次回実行時刻: 期間内を repeat 回に均等割り（UTC 基準の間隔）。 */
export function computeNextRunAfter(from: Date, frequency: WatchFrequency, repeatCount: number): Date {
  const capped = clampRepeatCount(frequency, repeatCount);
  const windowMs = msForFrequencyWindow(frequency);
  const slotMs = windowMs / capped;
  return new Date(from.getTime() + slotMs);
}
