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
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(d);
}
