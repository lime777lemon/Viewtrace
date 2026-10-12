import {
  cruxOriginQueryCandidates,
  cruxUrlQueryCandidates,
  emptyFieldCwv,
  originFromUrl,
  parseCruxRecord,
  type FieldCwvV1,
} from "@/lib/observation-field-cwv";

const CRUX_ENDPOINT = "https://chromeuxreport.googleapis.com/v1/records:queryRecord";
const CRUX_METRICS = [
  "largest_contentful_paint",
  "cumulative_layout_shift",
  "interaction_to_next_paint",
] as const;

export function isCruxConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CRUX_API_KEY?.trim());
}

type CruxQueryResult =
  | { ok: true; body: unknown }
  | { ok: false; status: number; notFound: boolean };

async function queryCrux(params: { url?: string; origin?: string }): Promise<CruxQueryResult> {
  const key = process.env.GOOGLE_CRUX_API_KEY?.trim();
  if (!key) return { ok: false, status: 0, notFound: false };
  const res = await fetch(`${CRUX_ENDPOINT}?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...(params.url ? { url: params.url } : {}),
      ...(params.origin ? { origin: params.origin } : {}),
      metrics: [...CRUX_METRICS],
    }),
    cache: "no-store",
  });
  if (res.status === 404) return { ok: false, status: 404, notFound: true };
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.warn("[crux] query failed", res.status, detail.slice(0, 240));
    return { ok: false, status: res.status, notFound: false };
  }
  const body: unknown = await res.json();
  return { ok: true, body };
}

export async function fetchFieldCwvForUrl(pageUrl: string): Promise<FieldCwvV1> {
  const measuredAt = new Date().toISOString();
  const origin = originFromUrl(pageUrl);
  if (!origin) {
    return emptyFieldCwv({
      requestedUrl: pageUrl,
      origin: pageUrl,
      measuredAt,
      error: "failed",
    });
  }
  for (const url of cruxUrlQueryCandidates(pageUrl)) {
    const urlHit = await queryCrux({ url });
    if (urlHit.ok) {
      return (
        parseCruxRecord(urlHit.body, {
          requestedUrl: pageUrl,
          origin,
          measuredAt,
          fallbackScope: "url",
        }) ?? emptyFieldCwv({ requestedUrl: pageUrl, origin, measuredAt, error: "failed" })
      );
    }
    if (!urlHit.notFound) {
      return emptyFieldCwv({ requestedUrl: pageUrl, origin, measuredAt, error: "failed" });
    }
  }
  for (const originCandidate of cruxOriginQueryCandidates(origin)) {
    const originHit = await queryCrux({ origin: originCandidate });
    if (originHit.ok) {
      return (
        parseCruxRecord(originHit.body, {
          requestedUrl: pageUrl,
          origin: originCandidate,
          measuredAt,
          fallbackScope: "origin",
        }) ??
        emptyFieldCwv({
          requestedUrl: pageUrl,
          origin: originCandidate,
          measuredAt,
          error: "failed",
        })
      );
    }
    if (!originHit.notFound) {
      return emptyFieldCwv({
        requestedUrl: pageUrl,
        origin: originCandidate,
        measuredAt,
        error: "failed",
      });
    }
  }
  return emptyFieldCwv({ requestedUrl: pageUrl, origin, measuredAt, error: "no_data" });
}
