import type { CaptureConditionsV1 } from "@/lib/capture-conditions";
import { regionalVerification } from "@/lib/capture-conditions-presentation";
import type { Observation } from "@/lib/demo/observations";
import type { JourneyStepEvidence } from "@/lib/journey-runner";
import type { Locale } from "@/lib/i18n";
import type { RenderedPageMeasurementV1 } from "@/lib/browser-rendered-page";
import { formatResourceRequest, selectResourceRequests } from "@/lib/resource-request";
import type { SessionSignalsV1 } from "@/lib/session-signals";

export type LedgerState = "observed" | "observed_absent" | "not_measured" | "not_verifiable";

export type LedgerLayerId =
  | "reachability"
  | "rendering"
  | "resources"
  | "runtime"
  | "visual"
  | "behavior"
  | "journey"
  | "regional";

export type LedgerLine = {
  id: string;
  state: LedgerState;
  detail: string | null;
};

export type LedgerLayer = {
  id: LedgerLayerId;
  lines: LedgerLine[];
};

export type JourneyRunFacts = {
  region: string;
  deviceClass: "desktop" | "mobile";
  status: string;
  steps: JourneyStepEvidence[];
};

export type BehaviorTypeFact = {
  detected: boolean;
  status: string;
};

export type ResourceCounts = {
  script: number;
  stylesheet: number;
  image: number;
  font: number;
  xhr: number;
  fetch: number;
  failed: number;
};

export type JourneyTraffic = {
  requests: number;
  failed: number;
  consoleErrors: number;
  pageErrors: number;
  /** Null when this run did not listen for unhandled rejection. */
  unhandledRejections: number | null;
};

export type ObservationRuntimeFacts = {
  resources: ResourceCounts | null;
  journey: JourneyTraffic | null;
};

const COPY = {
  ja: {
    reachability: "1. 到達",
    rendering: "2. 表示",
    resources: "3. リソース",
    runtime: "4. 実行時",
    visual: "5. 見た目",
    behavior: "6. 挙動",
    journey: "7. Journey",
    regional: "8. 地域",
    http: "HTTP",
    redirect: "リダイレクト",
    finalUrl: "最終 URL",
    dns: "DNS",
    tls: "TLS",
    screenshot: "スクリーンショット",
    heading: "見出し",
    css: "CSS",
    font: "フォント",
    script: "JS",
    stylesheet: "CSS",
    image: "画像",
    xhr: "XHR",
    fetch: "fetch",
    failed: "失敗したリクエスト",
    requests: "リクエスト",
    consoleError: "console error",
    pageError: "pageerror",
    unhandled: "unhandled rejection",
    layout: "レイアウト",
    visibility: "表示 / 非表示",
    behaviorSummary: "実行結果",
    journeySummary: "手順",
    region: "指定した地域",
    device: "端末",
    verification: "地域の確認",
    verified: "確認できた",
    notVerified: "確認できていない",
    redirectYes: "あり",
    redirectNo: "なし",
    still: "静止画",
    clip: "短い動画",
    live: "ライブ確認",
    desktop: "Desktop",
    mobile: "Mobile",
    working: "動作を確認",
    noChange: "描画の変化なし",
    failedStatus: "実行エラー",
    blocked: "安全のため未実行",
    notDetected: "検出なし",
    notMeasuredStatus: "未測定",
    pass: "完了",
    fail: "未完了",
    stateObserved: "測った",
    stateAbsent: "なかった",
    stateNotMeasured: "未測定",
    stateNotVerifiable: "確認できない",
    dnsNote: "ページ読み込みの DNS と TLS は未測定です。ホストの DNS レコード（A / MX / NS）は、この到達確認に含めていません。",
    behaviorSource: "挙動確認",
    journeySource: "Journey",
  },
  en: {
    reachability: "1. Reachability",
    rendering: "2. Rendering",
    resources: "3. Resources",
    runtime: "4. Runtime",
    visual: "5. Visual",
    behavior: "6. Behavior",
    journey: "7. Journey",
    regional: "8. Regional",
    http: "HTTP",
    redirect: "Redirect",
    finalUrl: "Final URL",
    dns: "DNS",
    tls: "TLS",
    screenshot: "Screenshot",
    heading: "Heading",
    css: "CSS",
    font: "Font",
    script: "JS",
    stylesheet: "CSS",
    image: "Image",
    xhr: "XHR",
    fetch: "fetch",
    failed: "Failed requests",
    requests: "Requests",
    consoleError: "console error",
    pageError: "pageerror",
    unhandled: "unhandled rejection",
    layout: "Layout",
    visibility: "Visible / hidden",
    behaviorSummary: "Executed",
    journeySummary: "Steps",
    region: "Requested region",
    device: "Device",
    verification: "Regional verification",
    verified: "Verified",
    notVerified: "Not verified",
    redirectYes: "Yes",
    redirectNo: "No",
    still: "Still",
    clip: "Short clip",
    live: "Live check",
    desktop: "Desktop",
    mobile: "Mobile",
    working: "Working",
    noChange: "No rendered state change",
    failedStatus: "Execution error",
    blocked: "Blocked for safety",
    notDetected: "Not detected",
    notMeasuredStatus: "Not measured",
    pass: "Passed",
    fail: "Failed",
    stateObserved: "Measured",
    stateAbsent: "Absent",
    stateNotMeasured: "Not measured",
    stateNotVerifiable: "Not verifiable",
    dnsNote: "DNS and TLS for this page load were not measured. Host DNS records (A / MX / NS) are not part of this reachability check.",
    behaviorSource: "Behavior check",
    journeySource: "Journey",
  },
} as const;

export function observationLedgerCopy(locale: Locale) {
  return COPY[locale];
}

export function ledgerLayerLabel(id: LedgerLayerId, locale: Locale): string {
  return COPY[locale][id];
}

export function ledgerLineLabel(id: string, locale: Locale): string {
  const copy = COPY[locale];
  const labels: Record<string, string> = {
    http: copy.http,
    redirect: copy.redirect,
    finalUrl: copy.finalUrl,
    dns: copy.dns,
    tls: copy.tls,
    screenshot: copy.screenshot,
    heading: copy.heading,
    css: copy.css,
    font: copy.font,
    script: copy.script,
    stylesheet: copy.stylesheet,
    image: copy.image,
    xhr: copy.xhr,
    fetch: copy.fetch,
    failed: copy.failed,
    requests: copy.requests,
    "journey-requests": `${copy.journeySource} · ${copy.requests}`,
    "journey-failed": `${copy.journeySource} · ${copy.failed}`,
    "behavior-errors": copy.consoleError,
    "journey-errors": copy.consoleError,
    console: copy.consoleError,
    unhandled: copy.unhandled,
    layout: copy.layout,
    visibility: copy.visibility,
    behavior: copy.behaviorSummary,
    journey: copy.journeySummary,
    region: copy.region,
    device: copy.device,
    verification: copy.verification,
  };
  if (id.startsWith("request-")) return copy.requests;
  return labels[id] ?? id;
}

export function ledgerStateLabel(state: LedgerState, locale: Locale): string {
  const copy = COPY[locale];
  if (state === "observed") return copy.stateObserved;
  if (state === "observed_absent") return copy.stateAbsent;
  if (state === "not_verifiable") return copy.stateNotVerifiable;
  return copy.stateNotMeasured;
}

function line(id: string, state: LedgerState, detail: string | null = null): LedgerLine {
  return { id, state, detail };
}

function ran(status: string): boolean {
  return status === "pass" || status === "fail" || status === "incomplete";
}

function sameToken(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function selectJourneyRunsForObservation(obs: Observation, runs: JourneyRunFacts[]): JourneyRunFacts[] {
  const keys = [
    obs.regionValue,
    obs.regionLabel,
    obs.captureConditions?.region_input,
    obs.captureConditions?.region_label,
  ].flatMap((value) => {
    const text = value?.trim();
    return text ? [text] : [];
  });
  if (!keys.length) return [];
  const device = obs.captureConditions?.device_class;
  return runs.filter((run) => {
    if (!keys.some((key) => sameToken(key, run.region))) return false;
    if (device && run.deviceClass !== device) return false;
    return true;
  });
}

function journeyTraffic(runs: JourneyRunFacts[]): JourneyTraffic | null {
  const steps = runs.flatMap((run) => run.steps).filter((step) => ran(step.status));
  if (!steps.length) return null;
  let requests = 0;
  let failedInNetwork = 0;
  let consoleErrors = 0;
  let pageErrors = 0;
  let evidenceConsole = 0;
  let evidencePage = 0;
  let evidenceFailed = 0;
  let unhandledRejections = 0;
  let unhandledObserved = false;
  for (const step of steps) {
    const network = Array.isArray(step.network) ? step.network : [];
    requests += network.length;
    failedInNetwork += network.filter((row) => row.status == null || row.status >= 400).length;
    const runtime = Array.isArray(step.runtime) ? step.runtime : [];
    consoleErrors += runtime.filter((row) => row.kind === "console_error").length;
    pageErrors += runtime.filter((row) => row.kind === "pageerror" || row.kind === "uncaught").length;
    unhandledRejections += runtime.filter((row) => row.kind === "unhandled_rejection").length;
    if (step.runtime_observed) unhandledObserved = true;
    const evidence = Array.isArray(step.evidence) ? step.evidence : [];
    evidenceConsole += evidence.filter((row) => row.kind === "console_error").length;
    evidencePage += evidence.filter((row) => row.kind === "error_appeared").length;
    evidenceFailed += evidence.filter((row) => row.kind === "request_failed").length;
  }
  return {
    requests,
    failed: Math.max(failedInNetwork, evidenceFailed),
    consoleErrors: Math.max(consoleErrors, evidenceConsole),
    pageErrors: Math.max(pageErrors, evidencePage),
    unhandledRejections: unhandledObserved || unhandledRejections > 0 ? unhandledRejections : null,
  };
}

export function observationRuntimeFacts(input: {
  session?: SessionSignalsV1 | null;
  journeys?: JourneyRunFacts[];
}): ObservationRuntimeFacts {
  const session = input.session;
  const resources = session
    ? {
        script: session.resources.script,
        stylesheet: session.resources.stylesheet,
        image: session.resources.image,
        font: session.resources.font,
        xhr: session.resources.xhr,
        fetch: session.resources.fetch,
        failed: session.errors.request_failed,
      }
    : null;
  return {
    resources,
    journey: journeyTraffic(input.journeys ?? []),
  };
}

function countStatus(types: BehaviorTypeFact[], status: string): number {
  return types.filter((row) => row.status === status).length;
}

function headingState(rendered: RenderedPageMeasurementV1 | null, runs: JourneyRunFacts[]): LedgerLine {
  if (rendered) {
    return rendered.h1.length
      ? line("heading", "observed", String(rendered.h1.length))
      : line("heading", "observed_absent");
  }
  const headings = runs.flatMap((run) => run.steps).flatMap((step) => step.evidence ?? []).filter((item) => item.kind === "rendered_heading");
  if (!headings.length) return line("heading", "not_measured");
  const absent = headings.every((item) => item.summary === "absent");
  return line("heading", absent ? "observed_absent" : "observed", String(headings.length));
}

export function buildObservationMeasureLedger(input: {
  observation: Observation;
  locale: Locale;
  httpStatus: number | null;
  finalUrl: string | null;
  redirected: boolean;
  visual: "still" | "clip" | "live" | "none";
  session?: SessionSignalsV1 | null;
  renderedPage?: RenderedPageMeasurementV1 | null;
  behaviorTypes?: BehaviorTypeFact[] | null;
  journeyRuns?: JourneyRunFacts[];
  syntheticOverall?: "pass" | "fail" | "not_run";
  syntheticSteps?: number;
}): { layers: LedgerLayer[]; dnsNote: string } {
  const copy = COPY[input.locale];
  const runs = selectJourneyRunsForObservation(input.observation, input.journeyRuns ?? []);
  const traffic = observationRuntimeFacts({ session: input.session, journeys: runs });
  const conditions: CaptureConditionsV1 | null | undefined = input.observation.captureConditions;
  const http = input.httpStatus != null
    ? line("http", "observed", String(input.httpStatus))
    : line("http", "not_measured");
  const redirect = input.finalUrl
    ? line("redirect", "observed", input.redirected ? copy.redirectYes : copy.redirectNo)
    : line("redirect", "not_measured");
  const finalUrl = input.finalUrl
    ? line("finalUrl", "observed", input.finalUrl)
    : line("finalUrl", "not_measured");

  const screenshot = input.visual === "none"
    ? line("screenshot", "not_measured")
    : line("screenshot", "observed", input.visual === "clip" ? copy.clip : input.visual === "live" ? copy.live : copy.still);

  const resourceLines: LedgerLine[] = [];
  if (traffic.resources) {
    resourceLines.push(
      line("script", "observed", String(traffic.resources.script)),
      line("stylesheet", "observed", String(traffic.resources.stylesheet)),
      line("image", "observed", String(traffic.resources.image)),
      line("font", "observed", String(traffic.resources.font)),
      line("xhr", "observed", String(traffic.resources.xhr)),
      line("fetch", "observed", String(traffic.resources.fetch)),
      line("failed", "observed", String(traffic.resources.failed)),
    );
  }
  if (traffic.journey) {
    resourceLines.push(
      line("journey-requests", "observed", String(traffic.journey.requests)),
      line("journey-failed", "observed", String(traffic.journey.failed)),
    );
  }
  const recordedRequests = selectResourceRequests([
    ...(input.session?.requests ?? []),
    ...runs.flatMap((run) => run.steps.flatMap((step) => step.network ?? [])),
  ]);
  recordedRequests.forEach((row, index) => {
    resourceLines.push(line(`request-${index}`, "observed", formatResourceRequest(row)));
  });
  if (!resourceLines.length) {
    resourceLines.push(
      line("script", "not_measured"),
      line("stylesheet", "not_measured"),
      line("image", "not_measured"),
      line("font", "not_measured"),
      line("xhr", "not_measured"),
      line("fetch", "not_measured"),
    );
  }

  const consoleDetail = (consoleErrors: number, pageErrors: number) =>
    `${copy.consoleError} ${consoleErrors} · ${copy.pageError} ${pageErrors}`;
  const runtimeLines: LedgerLine[] = [];
  if (traffic.resources && input.session) {
    runtimeLines.push(line("behavior-errors", "observed", `${copy.behaviorSource} · ${consoleDetail(input.session.errors.console_error, input.session.errors.pageerror)}`));
  }
  if (traffic.journey) {
    runtimeLines.push(line("journey-errors", "observed", `${copy.journeySource} · ${consoleDetail(traffic.journey.consoleErrors, traffic.journey.pageErrors)}`));
  }
  if (!runtimeLines.length) runtimeLines.push(line("console", "not_measured"));
  const unhandledParts: string[] = [];
  if (input.session && input.session.errors.unhandled_rejection != null) {
    unhandledParts.push(`${copy.behaviorSource} ${input.session.errors.unhandled_rejection}`);
  }
  if (traffic.journey?.unhandledRejections != null) {
    unhandledParts.push(`${copy.journeySource} ${traffic.journey.unhandledRejections}`);
  }
  runtimeLines.push(unhandledParts.length
    ? line("unhandled", "observed", unhandledParts.join(" · "))
    : line("unhandled", "not_measured"));

  const visibilityItems = runs.flatMap((run) => run.steps).flatMap((step) => step.evidence ?? []).filter((item) => item.kind === "element_visible" || item.kind === "element_hidden");

  const types = input.behaviorTypes;
  const behaviorRan = Boolean(types?.some((row) => row.status !== "not_measured"));
  const behaviorDetail = types && behaviorRan
    ? [
        `${copy.working} ${countStatus(types, "working")}`,
        `${copy.noChange} ${countStatus(types, "no_change_observed")}`,
        `${copy.failedStatus} ${countStatus(types, "failed")}`,
        `${copy.blocked} ${countStatus(types, "blocked_for_safety")}`,
        `${copy.notDetected} ${countStatus(types, "not_detected")}`,
      ].join(" · ")
    : null;

  const journeyBits: string[] = [];
  if (input.syntheticOverall && input.syntheticOverall !== "not_run") {
    journeyBits.push(`${input.syntheticOverall === "fail" ? copy.fail : copy.pass} ${input.syntheticSteps ?? 0}`);
  }
  for (const run of runs) {
    const executed = run.steps.filter((step) => ran(step.status)).length;
    if (!executed && run.status !== "passed" && run.status !== "failed") continue;
    const label = run.status === "passed" ? copy.pass : run.status === "failed" ? copy.fail : run.status;
    journeyBits.push(`${label} ${executed}`);
  }

  const device = conditions?.device_class === "mobile"
    ? line("device", "observed", copy.mobile)
    : conditions?.device_class === "desktop"
      ? line("device", "observed", copy.desktop)
      : line("device", "not_measured");
  const regionLabel = input.observation.regionLabel || input.observation.regionValue || "";
  const verification = conditions?.geo?.proxy_mode
    ? line("verification", "observed", regionalVerification(conditions) === "verified" ? copy.verified : copy.notVerified)
    : line("verification", "not_measured");

  return {
    dnsNote: copy.dnsNote,
    layers: [
      {
        id: "reachability",
        lines: [
          http,
          redirect,
          finalUrl,
          line("dns", "not_measured"),
          line("tls", "not_measured"),
        ],
      },
      {
        id: "rendering",
        lines: [
          screenshot,
          headingState(input.renderedPage ?? null, runs),
          line("css", "not_measured"),
          line("font", "not_measured"),
        ],
      },
      { id: "resources", lines: resourceLines },
      { id: "runtime", lines: runtimeLines },
      {
        id: "visual",
        lines: [
          screenshot,
          line("layout", "not_measured"),
          visibilityItems.length
            ? line("visibility", "observed", String(visibilityItems.length))
            : line("visibility", "not_measured"),
        ],
      },
      {
        id: "behavior",
        lines: [behaviorRan ? line("behavior", "observed", behaviorDetail) : line("behavior", "not_measured")],
      },
      {
        id: "journey",
        lines: [journeyBits.length ? line("journey", "observed", journeyBits.join(" · ")) : line("journey", "not_measured")],
      },
      {
        id: "regional",
        lines: [
          regionLabel ? line("region", "observed", regionLabel) : line("region", "not_measured"),
          device,
          verification,
        ],
      },
    ],
  };
}
