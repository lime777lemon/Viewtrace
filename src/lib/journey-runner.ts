import { isBrowserlessConfigured } from "@/lib/browserless-screenshot";
import {
  applyBrowserlessGeoToUrl,
  browserlessPathEndpoint,
  withBrowserlessGeoRetry,
} from "@/lib/browserless-geo-endpoint";
import { buildJourneyFunctionCode } from "@/lib/browserless-journey-function";
import { journeyNetworkEvidence, type JourneyDeviceClass, type JourneyGeoStage, type JourneyStepDefinition } from "@/lib/journey-definition";
import { parseJourneyEvidence, type JourneyEvidenceItem } from "@/lib/journey-step-evidence";
import { resolveBrowserlessResidentialTarget } from "@/lib/regions";
import { normalizeUserUrlInput } from "@/lib/url-preview";

const FUNCTION_TIMEOUT_MS = 300_000;

export type JourneyRunStatus = "passed" | "failed" | "blocked" | "incomplete";

export type JourneyStepEvidence = {
  id: string;
  kind: string;
  status: "pass" | "fail" | "blocked_for_safety" | "not_run" | "incomplete";
  duration_ms: number;
  url_after: string | null;
  detail: string | null;
  rendered_text: string | null;
  before_text: string | null;
  after_text: string | null;
  before_visible: boolean | null;
  after_visible: boolean | null;
  network: Array<{ method: string; path: string; status: number | null }>;
  runtime: Array<{ kind: string; message: string }>;
  /** Evidence observed during this step. Absent kinds were not observed. */
  evidence?: JourneyEvidenceItem[];
  /** open_url の画面。viewport の JPEG を base64。Observation のフルページ画像ではない。 */
  frame_jpeg?: string | null;
};

export type JourneyEnvironmentObserved = {
  device_class: JourneyDeviceClass;
  viewport: { width: number; height: number };
  pointer: "mouse" | "touch";
  touch: boolean;
  locale: string;
  timezone: string;
  prefers_reduced_motion: boolean;
  geo?: {
    requested_region: string;
    stage: JourneyGeoStage;
  };
};

export type JourneyExecution = {
  ok: true;
  status: JourneyRunStatus;
  durationMs: number;
  environment: JourneyEnvironmentObserved | { geo: NonNullable<JourneyEnvironmentObserved["geo"]> } | null;
  steps: JourneyStepEvidence[];
};

export type JourneyExecutionFailure = {
  ok: false;
  error: string;
  durationMs: number;
};

function parseSteps(raw: unknown): JourneyStepEvidence[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 12).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const status = row.status;
    if (status !== "pass" && status !== "fail" && status !== "blocked_for_safety" && status !== "not_run" && status !== "incomplete") return [];
    const network = Array.isArray(row.network)
      ? row.network.slice(0, 8).flatMap((event) => {
          if (!event || typeof event !== "object") return [];
          const net = event as Record<string, unknown>;
          return [{
            method: typeof net.method === "string" ? net.method.slice(0, 12) : "GET",
            path: typeof net.path === "string" ? net.path.slice(0, 120) : "",
            status: typeof net.status === "number" ? net.status : null,
          }];
        })
      : [];
    const runtime = Array.isArray(row.runtime)
      ? row.runtime.slice(0, 6).flatMap((event) => {
          if (!event || typeof event !== "object") return [];
          const log = event as Record<string, unknown>;
          return [{
            kind: typeof log.kind === "string" ? log.kind.slice(0, 40) : "runtime",
            message: typeof log.message === "string" ? log.message.slice(0, 160) : "",
          }];
        })
      : [];
    return [{
      id: typeof row.id === "string" ? row.id.slice(0, 40) : "step",
      kind: typeof row.kind === "string" ? row.kind.slice(0, 40) : "",
      status,
      duration_ms: typeof row.duration_ms === "number" ? Math.max(0, Math.round(row.duration_ms)) : 0,
      url_after: typeof row.url_after === "string" ? row.url_after.slice(0, 500) : null,
      detail: typeof row.detail === "string" ? row.detail.slice(0, 180) : null,
      rendered_text: typeof row.rendered_text === "string" ? row.rendered_text.slice(0, 180) : null,
      before_text: typeof row.before_text === "string" ? row.before_text.slice(0, 180) : null,
      after_text: typeof row.after_text === "string" ? row.after_text.slice(0, 180) : null,
      before_visible: typeof row.before_visible === "boolean" ? row.before_visible : null,
      after_visible: typeof row.after_visible === "boolean" ? row.after_visible : null,
      network: journeyNetworkEvidence(network),
      runtime,
      evidence: parseJourneyEvidence(row.evidence),
      frame_jpeg: typeof row.frame_jpeg === "string" && row.frame_jpeg.length > 32 && row.frame_jpeg.length < 180_000
        ? row.frame_jpeg
        : null,
    }];
  });
}

export function journeyRunStatus(steps: JourneyStepEvidence[]): JourneyRunStatus {
  if (steps.some((step) => step.status === "fail")) return "failed";
  if (steps.some((step) => step.status === "blocked_for_safety")) return "blocked";
  if (steps.some((step) => step.status === "incomplete" || step.status === "not_run")) return "incomplete";
  if (steps.length > 0 && steps.every((step) => step.status === "pass")) return "passed";
  return "incomplete";
}

export function journeyAlert(previous: JourneyStepEvidence[] | null, current: JourneyStepEvidence[]): string | null {
  if (!previous?.length) return null;
  const prior = new Map(previous.map((step) => [step.id, step.status]));
  const changed = current.filter((step) => prior.get(step.id) === "pass" && step.status !== "pass");
  if (!changed.length) return null;
  return changed.map((step) => `${step.kind} ${step.id} ${step.status}`).join("; ").slice(0, 240);
}

export async function runJourneyInBrowserless(params: {
  url: string;
  region: string;
  deviceClass: JourneyDeviceClass;
  steps: JourneyStepDefinition[];
  credentials?: { username?: string; password?: string };
  fixtureHtml?: string;
}): Promise<JourneyExecution | JourneyExecutionFailure> {
  if (!isBrowserlessConfigured()) return { ok: false, error: "browserless_not_configured", durationMs: 0 };
  const target = params.fixtureHtml ? "https://viewtrace.net/tests/journey" : normalizeUserUrlInput(params.url);
  if (!target) return { ok: false, error: "invalid_url", durationMs: 0 };
  const href = browserlessPathEndpoint("/function");
  if (!href) return { ok: false, error: "browserless_not_configured", durationMs: 0 };

  const runOnce = async (opts: { disableProxy?: boolean; residentialState?: boolean; residentialCity?: boolean }) => {
    const geo = applyBrowserlessGeoToUrl({
      href,
      regionRaw: params.region,
      disableProxy: opts.disableProxy,
      residentialState: opts.residentialState,
      residentialCity: opts.residentialCity,
    });
    if ("error" in geo) return { ok: false as const, error: geo.error, durationMs: 0 };
    const stage: JourneyGeoStage = opts.disableProxy
      ? "no_proxy"
      : geo.flags.viaExternalProxy
        ? (resolveBrowserlessResidentialTarget(params.region)?.stateCode ? "state" : "country")
        : geo.flags.residentialStateApplied
          ? (opts.residentialCity ? "city" : "state")
          : geo.flags.viaResidential
            ? "country"
            : "direct";
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), FUNCTION_TIMEOUT_MS + 15_000);
    const started = Date.now();
    const endpoint = new URL(geo.href);
    endpoint.searchParams.set("timeout", String(FUNCTION_TIMEOUT_MS));
    try {
      const upstream = await fetch(endpoint.href, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          code: buildJourneyFunctionCode(),
          context: {
            url: target,
            html: params.fixtureHtml || undefined,
            device_class: params.deviceClass,
            region: params.region,
            steps: params.steps,
            credentials: {
              username: params.credentials?.username ?? "",
              password: params.credentials?.password ?? "",
            },
          },
        }),
        signal: ac.signal,
      });
      const durationMs = Date.now() - started;
      if (!upstream.ok) return { ok: false as const, error: "browserless_error", durationMs };
      const raw = await upstream.json() as { steps?: unknown; environment?: unknown; data?: { steps?: unknown; environment?: unknown } };
      const body = raw && typeof raw === "object" && raw.data && typeof raw.data === "object" ? raw.data : raw;
      const steps = parseSteps(body.steps);
      const envRaw = body.environment && typeof body.environment === "object" ? body.environment as Record<string, unknown> : null;
      const viewport = envRaw?.viewport && typeof envRaw.viewport === "object" ? envRaw.viewport as Record<string, unknown> : null;
      const width = typeof viewport?.width === "number" ? viewport.width : 0;
      const height = typeof viewport?.height === "number" ? viewport.height : 0;
      const geoRecord = { requested_region: params.region, stage };
      const environment = width && height ? {
        device_class: (width < 700 ? "mobile" : "desktop") as JourneyDeviceClass,
        viewport: { width, height },
        pointer: envRaw?.pointer === "touch" ? "touch" as const : "mouse" as const,
        touch: envRaw?.touch === true,
        locale: typeof envRaw?.locale === "string" ? envRaw.locale : "",
        timezone: typeof envRaw?.timezone === "string" ? envRaw.timezone : "",
        prefers_reduced_motion: envRaw?.prefers_reduced_motion === true,
        geo: geoRecord,
      } : { geo: geoRecord };
      return { ok: true as const, status: journeyRunStatus(steps), durationMs, environment, steps };
    } catch {
      return { ok: false as const, error: "browserless_network_error", durationMs: Date.now() - started };
    } finally {
      clearTimeout(timer);
    }
  };

  return withBrowserlessGeoRetry({
    region: params.region,
    retryable: (result) => !result.ok && result.error === "browserless_error",
    run: runOnce,
  });
}
