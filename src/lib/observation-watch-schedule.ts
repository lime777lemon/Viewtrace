export type WatchFrequency = "daily" | "weekly" | "monthly";
export type WatchNotifyMode = "always" | "change_only";

/**
 * Vercel Cron `0 0 * * *` と daily ウォッチの基準時刻。
 * 00:00 UTC = 09:00 JST = 前日 20:00 ET (EDT)。
 */
export const DAILY_CRON_ANCHOR_UTC_HOUR = 0;
export const DAILY_CRON_ANCHOR_UTC_MINUTE = 0;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
  if (f === "daily") return MS_PER_DAY;
  if (f === "weekly") return 7 * MS_PER_DAY;
  return 30 * MS_PER_DAY;
}

/** UTC 日付の 00:00:00.000 */
export function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
  );
}

/**
 * 今日（UTC）の daily スロットをまだ実行していなければ Cron 対象。
 * `next_run_at` が夕方にずれていても、0:00 UTC の定刻実行を取りこぼさない。
 */
export function isDailyWatchDueOnCronDay(
  now: Date,
  lastRunAt: string | null | undefined,
  repeatCount: number,
): boolean {
  const capped = clampRepeatCount("daily", repeatCount);
  const todayStart = startOfUtcDay(now);
  const slotMs = MS_PER_DAY / capped;
  const firstSlotToday = new Date(todayStart.getTime());
  if (now.getTime() < firstSlotToday.getTime()) return false;

  if (!lastRunAt) return true;
  const last = new Date(lastRunAt);
  if (Number.isNaN(last.getTime())) return true;
  return last.getTime() < firstSlotToday.getTime();
}

/**
 * 次回実行時刻。
 * - daily: UTC 0:00 起点で期間内を repeat 回に均等分割（9:00 JST / NY 前日 20:00 基準）
 * - weekly / monthly: 実行完了時刻から期間内を repeat 回に均等分割
 */
export function computeNextRunAfter(from: Date, frequency: WatchFrequency, repeatCount: number): Date {
  const capped = clampRepeatCount(frequency, repeatCount);

  if (frequency === "daily") {
    const slotMs = MS_PER_DAY / capped;
    let dayStart = startOfUtcDay(from);
    for (let days = 0; days < 400; days++) {
      for (let slot = 0; slot < capped; slot++) {
        const candidate = new Date(dayStart.getTime() + slot * slotMs);
        if (candidate.getTime() > from.getTime()) {
          return candidate;
        }
      }
      dayStart = new Date(dayStart.getTime() + MS_PER_DAY);
    }
    return new Date(from.getTime() + slotMs);
  }

  const windowMs = msForFrequencyWindow(frequency);
  const slotMs = windowMs / capped;
  return new Date(from.getTime() + slotMs);
}
