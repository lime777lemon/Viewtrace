export function formatJaDateTime(iso: string, locale: "ja" | "en" = "ja"): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(d);
}

export function formatJaDate(iso: string, locale: "ja" | "en" = "ja"): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
    dateStyle: "medium",
    timeZone: "Asia/Tokyo",
  }).format(d);
}

/** 「2026/10/24 20:03 から 21:03」. The end date is repeated only when the hour crosses midnight. */
export function formatAttentionHourRange(startIso: string, endIso: string, locale: "ja" | "en" = "ja"): string {
  const start = formatJaDateTime(startIso, locale);
  const end = formatJaDateTime(endIso, locale);
  const day = (iso: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  const time = (iso: string) =>
    new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
      timeStyle: "short",
      timeZone: "Asia/Tokyo",
    }).format(new Date(iso));
  if (locale === "ja") return `${start} から ${day(startIso) === day(endIso) ? time(endIso) : end}`;
  return `${start} and ${end}`;
}

export function formatUtcLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const year = String(d.getUTCFullYear());
  const hour = String(d.getUTCHours()).padStart(2, "0");
  const minute = String(d.getUTCMinutes()).padStart(2, "0");
  // Intl の hour12:false は環境によって 24:00 / 00:00 が分かれ、ハイドレーションが壊れる
  return `${month}/${day}/${year}, ${hour}:${minute} UTC`;
}
