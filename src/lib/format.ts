export function formatJaDateTime(iso: string, locale: "ja" | "en" = "ja"): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(d);
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
