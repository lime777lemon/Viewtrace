type Hits = number[];

const buckets = new Map<string, Hits>();

const MAX_KEYS = 4000;

function prune(now: number, windowMs: number, hits: Hits): Hits {
  return hits.filter((t) => now - t < windowMs);
}

/** Best-effort in-process limit. Serverless isolates do not share this map. */
export function takeContactRateLimit(
  key: string,
  max: number,
  windowMs: number,
  now = Date.now(),
): boolean {
  if (!key || max < 1 || windowMs < 1) return true;
  const next = prune(now, windowMs, buckets.get(key) ?? []);
  if (next.length >= max) {
    buckets.set(key, next);
    return false;
  }
  next.push(now);
  buckets.set(key, next);
  if (buckets.size > MAX_KEYS) {
    const first = buckets.keys().next().value;
    if (first) buckets.delete(first);
  }
  return true;
}
