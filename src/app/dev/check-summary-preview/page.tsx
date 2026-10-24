import { notFound } from "next/navigation";
import { ObservationCheckSummary } from "@/components/dashboard/ObservationCheckSummary";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { PAGE_SEO_SCORING_VERSION, type PageSeoDerivedV1 } from "@/lib/measurement-record";
import type { MonitoringRunLoaded } from "@/lib/monitoring-run-store";
import type { RegionalInteractionCheckV1 } from "@/lib/observation-regional-interaction";

const OBSERVATION_ID = "22518d85-db02-4224-ab9a-31173323134a";

export default async function CheckSummaryPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const locale = await getRequestLocale();
  const loaded = {
    run: {
      execution: "executed",
      plan: { workflowSteps: 0, regions: ["US-WA"], environments: ["desktop"] },
    },
    observations: [{
      id: OBSERVATION_ID,
      region: "US-WA",
      regionLabel: "US · Washington",
      device: "desktop",
      page: "not_comparable",
    }],
    journeyRuns: [],
    journeyName: null,
    alerts: [{
      id: "page:US-WA:not_comparable",
      layer: "page",
      level: "attention",
      code: "screenshot_not_comparable",
      region: "US · Washington",
      paired: false,
      severity: "warning",
    }],
    previousPages: [{ region: "US-TX", label: "US · Texas", device: "desktop" }],
    diff: {
      behavior: { measured: true, compared: false, rows: [] },
    },
  } as unknown as MonitoringRunLoaded;
  const seo: PageSeoDerivedV1 = {
    scoring_version: PAGE_SEO_SCORING_VERSION,
    score: 80,
    earned_points: 80,
    possible_points: 100,
    measured_signals: 9,
    signals: [],
  };
  const check = {
    types: [
      { type: "load_animation", detected: true, status: "working" },
      { type: "css_animation", detected: true, status: "no_change_observed" },
      { type: "js_animation", detected: true, status: "no_change_observed" },
      { type: "scroll_reveal", detected: true, status: "no_change_observed" },
      { type: "webgl", detected: true, status: "no_change_observed" },
      { type: "hover", detected: true, status: "no_change_observed" },
      { type: "menu", detected: true, status: "not_detected" },
      { type: "form", detected: true, status: "no_change_observed" },
      { type: "accordion", detected: true, status: "working" },
      { type: "modal", detected: true, status: "not_detected" },
      { type: "tabs", detected: true, status: "no_change_observed" },
      { type: "drag", detected: true, status: "not_detected" },
    ],
    discovery: {
      unknown: [{
        selector: "main",
        sources: ["style"],
        changes: ["opacity"],
        actions: [],
        t0: null,
        t1: null,
        region: { x: 40, y: 120, w: 800, h: 200 },
        shadow_path: [],
        frame_path: [],
      }],
      map: [],
      safety: { blocked: [] },
      session: {
        http: { status: 200, timed_out: false },
        resources: { script: 9, stylesheet: 8, image: 10, failed: 0 },
        errors: { console_error: 0, pageerror: 0 },
        performance: { fcp_ms: 1020, lcp_ms: null, cls: 0 },
      },
    },
  } as unknown as RegionalInteractionCheckV1;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <ObservationCheckSummary
        loaded={loaded}
        observationId={OBSERVATION_ID}
        locale={locale}
        seo={seo}
        check={check}
        behaviorDiff={null}
      />
    </main>
  );
}
