import type { HtmlHeadSignalsV1 } from "@/lib/url-preview";
import { htmlHeadSignalsHasAny } from "@/lib/url-preview";

export type ObservationWorkerObserved = {
  ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
};

export type ObservationWorkerCaptureResult =
  | {
      ok: true;
      png: ArrayBuffer;
      requested: { country: string; state: string | null };
      observed: ObservationWorkerObserved;
      htmlSignals: HtmlHeadSignalsV1 | null;
      viaResidentialProxy: boolean;
      durationMs: number;
      proxyBytes: null;
      httpStatus: number | null;
      finalUrl: string | null;
    }
  | {
      ok: false;
      error: string;
      detail?: string;
      durationMs?: number;
      observed?: ObservationWorkerObserved;
      viaResidentialProxy?: boolean;
    };

function asSignals(raw: unknown): HtmlHeadSignalsV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as HtmlHeadSignalsV1;
  return htmlHeadSignalsHasAny(s) ? s : null;
}

function workerBaseUrl(): string | null {
  const raw = process.env.VIEWTRACE_OBSERVATION_WORKER_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

export async function runObservationWorkerCapture(params: {
  url: string;
  region: string;
  fullPage: boolean;
}): Promise<ObservationWorkerCaptureResult> {
  const base = workerBaseUrl();
  const secret = process.env.VIEWTRACE_OBSERVATION_WORKER_SECRET?.trim();
  if (!base || !secret) {
    return { ok: false, error: "observation_worker_not_configured" };
  }

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 70_000);
  const startedAt = Date.now();
  try {
    const res = await fetch(`${base}/capture`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${secret}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        url: params.url,
        region: params.region,
        full_page: params.fullPage,
      }),
      signal: ac.signal,
    });
    const durationMs = Date.now() - startedAt;
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok || json.ok !== true) {
      return {
        ok: false,
        error: typeof json.error === "string" ? json.error : "observation_worker_error",
        detail: typeof json.detail === "string" ? json.detail.slice(0, 500) : undefined,
        durationMs,
      };
    }
    const b64 = typeof json.png_base64 === "string" ? json.png_base64 : "";
    if (!b64) {
      return { ok: false, error: "observation_worker_empty_png", durationMs };
    }
    const png = Buffer.from(b64, "base64");
    const observedRaw = (json.observed ?? {}) as ObservationWorkerObserved;
    const requestedRaw = (json.requested ?? {}) as { country?: string; state?: string | null };
    return {
      ok: true,
      png: png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength),
      requested: {
        country: typeof requestedRaw.country === "string" ? requestedRaw.country : "",
        state: typeof requestedRaw.state === "string" ? requestedRaw.state : null,
      },
      observed: {
        ip: typeof observedRaw.ip === "string" ? observedRaw.ip : null,
        country: typeof observedRaw.country === "string" ? observedRaw.country : null,
        region: typeof observedRaw.region === "string" ? observedRaw.region : null,
        city: typeof observedRaw.city === "string" ? observedRaw.city : null,
      },
      htmlSignals: asSignals(json.html_signals),
      viaResidentialProxy: json.via_residential_proxy === true,
      durationMs: typeof json.duration_ms === "number" ? json.duration_ms : durationMs,
      proxyBytes: null,
      httpStatus: typeof json.http_status === "number" ? json.http_status : null,
      finalUrl: typeof json.final_url === "string" ? json.final_url : null,
    };
  } catch {
    return {
      ok: false,
      error: "observation_worker_network_error",
      durationMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(t);
  }
}
