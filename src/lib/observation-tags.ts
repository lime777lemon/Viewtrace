export const MAX_OBSERVATION_TAGS = 12;
export const MAX_OBSERVATION_TAG_LENGTH = 32;

/** 同じ着地ページとしてタグを共有するキー（host 小文字・hash なし・末尾スラッシュなし） */
export function canonicalObservationUrl(raw: string): string {
  const trimmed = raw.trim();
  try {
    const u = new URL(trimmed);
    u.hash = "";
    u.hostname = u.hostname.toLowerCase();
    u.protocol = u.protocol.toLowerCase();
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return `${u.protocol}//${u.host}${u.pathname}${u.search}`;
  } catch {
    return trimmed.toLowerCase();
  }
}

export function normalizeObservationTags(raw: string[] | undefined): string[] {
  if (!raw?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw) {
    const v = t.trim().slice(0, MAX_OBSERVATION_TAG_LENGTH);
    if (!v || seen.has(v.toLowerCase())) continue;
    seen.add(v.toLowerCase());
    out.push(v);
    if (out.length >= MAX_OBSERVATION_TAGS) break;
  }
  return out;
}

export const UNTAGGED_FILTER = "__untagged__";

export function uniqueObservationTags(rows: { tags?: string[] }[]): string[] {
  const seen = new Map<string, string>();
  for (const row of rows) {
    for (const tag of row.tags ?? []) {
      const key = tag.toLowerCase();
      if (!seen.has(key)) seen.set(key, tag);
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

export function observationMatchesQuery(
  row: {
    url: string;
    pageTitle?: string;
    regionLabel: string;
    note?: string;
    tags?: string[];
    folder?: string;
  },
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    row.url,
    row.pageTitle ?? "",
    row.regionLabel,
    row.note ?? "",
    row.folder ?? "",
    ...(row.tags ?? []),
  ]
    .join("\n")
    .toLowerCase();
  return hay.includes(q);
}

export function filterObservationsByLibrary<
  T extends {
    url: string;
    pageTitle?: string;
    regionLabel: string;
    note?: string;
    tags?: string[];
    folder?: string;
  },
>(rows: T[], query: string, tagFilter: string | null): T[] {
  return rows.filter((row) => {
    if (!observationMatchesQuery(row, query)) return false;
    if (tagFilter === null) return true;
    if (tagFilter === UNTAGGED_FILTER) return !(row.tags && row.tags.length > 0);
    return (row.tags ?? []).some((t) => t.toLowerCase() === tagFilter.toLowerCase());
  });
}
