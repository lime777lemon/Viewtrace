import { notFound } from "next/navigation";
import { EvidenceReportSheet } from "@/components/dashboard/EvidenceReportSheet";
import { observationAiAuditCopyFrom } from "@/lib/observation-ai-audit-copy";
import { buildEvidenceReportFacts } from "@/lib/evidence-report";
import { copy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import type { Observation } from "@/lib/demo/observations";
import type { CaptureConditionsV1 } from "@/lib/capture-conditions";

export default async function EvidenceReportPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const locale = await getRequestLocale();
  const t = copy[locale].observationVerificationReport;
  const td = copy[locale].observationDetail;
  const conditions = {
    region_input: "US-CA",
    region_label: "US · California",
    full_page_requested: true,
    viewport: { width: 1280, height: 800, device_scale_factor: 1, source: "playwright_worker_1280x800" },
    geo: { country: "us", state: null, proxy_mode: "browserless_residential", proxy_provider: "browserless", proxy_sticky: null },
    html_signals: {
      document_title: "Pricing",
      meta_description: null,
      canonical_url: "https://example.com/pricing",
      robots_meta: "index,follow",
      x_robots_tag: null,
      og_title: null,
      og_description: null,
      og_image: "https://example.com/now.png",
      json_ld_types: [],
      http_status: 200,
      final_url: "https://example.com/pricing",
    },
  } as unknown as CaptureConditionsV1;
  const current = {
    id: "preview-current",
    url: "https://example.com/pricing",
    regionValue: "US-CA",
    regionLabel: "US · California",
    capturedAt: "2026-10-24T10:00:00.000Z",
    status: "success",
    snapshotSha256: "bbb",
    contentHash: "content",
    captureConditions: conditions,
  } satisfies Observation;
  const previous = {
    ...current,
    id: "preview-previous",
    capturedAt: "2026-10-20T10:00:00.000Z",
    snapshotSha256: "aaa",
    captureConditions: {
      ...conditions,
      html_signals: { ...conditions.html_signals!, document_title: "Old pricing", og_image: "https://example.com/then.png" },
    },
  } satisfies Observation;
  const facts = buildEvidenceReportFacts({
    observation: current,
    locale,
    siblings: [previous, current],
    session: {
      http: { status: 200, final_url: null, redirect_count: null, content_type: null, robots_header: null, loaded: true, timed_out: false },
      resources: { script: 0, stylesheet: 0, image: 0, font: 0, xhr: 0, fetch: 0, other: 0, failed: 0, status_4xx: 0, status_5xx: 0, transfer_bytes: null },
      errors: { console_error: 0, pageerror: 0, request_failed: 0, unhandled_rejection: null },
      performance: { ttfb_ms: null, dom_content_loaded_ms: null, load_ms: null, fcp_ms: null, lcp_ms: null, cls: null, long_tasks: null },
      connection: { dns_ms: 0, tls_ms: null, protocol: null, secure: false },
      structured_data: { types: [], syntax_errors: null },
      requests: [],
    },
    behaviorTypes: [
      { type: "hover", detected: true, status: "working" },
      {
        type: "js_animation",
        detected: true,
        status: "working",
        evidence: {
          actions: ["SCROLL"],
          selector: "#hero-title",
          trace: {
            x: "120 → 112 → 104 → 100",
            opacity: "0.1 → 0.4 → 0.8 → 1",
            transform: "",
            time: "18ms → 168ms → 318ms → 468ms",
          },
          driver: {
            implementation: "js_driven",
            raf_callbacks: 4,
            raf_style_mutations: 4,
            style_mutations: 4,
            class_mutations: 0,
            css_animation: false,
            css_transition: false,
            waapi: false,
            gsap: true,
          },
        },
      },
      {
        type: "menu",
        detected: true,
        status: "working",
        evidence: {
          actions: ["SAFE_CLICK"],
          selector: "#mobile-menu",
          note: "open verified, close verified",
          toggle: { open: "working", close: "working", close_by: "escape" },
          t0: { key: "#mobile-menu", visibility: "hidden", opacity: 0, expanded: "false", display: "none", w: 0, h: 0 },
          t1: { key: "#mobile-menu", visibility: "visible", opacity: 1, expanded: "true", display: "block", w: 320, h: 480 },
          timing: { response_ms: 83, open_ms: 290, in_viewport: true },
          window: {
            executed: true,
            samples: [{ at_ms: 83, changed: true }],
            rendered_changes: ["visibility"],
            visual_changed: null,
            network_count: 0,
            runtime_errors: 0,
            request_failed: 0,
            duration_ms: 290,
          },
        },
      },
      { type: "carousel", detected: true, status: "not_detected" },
      { type: "form", detected: true, status: "blocked_for_safety" },
      { type: "video", detected: false, status: "not_measured" },
    ],
    synthetic: {
      schema_version: 1,
      source: "browserless_click",
      measured_at: "2026-10-24T10:00:00.000Z",
      requested_url: current.url,
      duration_ms: 400,
      proxy_bytes: null,
      skipped_unsafe: 1,
      interactions: [{ label: "Pricing", kind: "link", latency_ms: 120, navigated: true, error: null }],
      error: null,
    },
  });
  return (
    <EvidenceReportSheet
      copy={{
        title: t.title,
        subtitle: t.subtitle,
        disclaimer: t.disclaimer,
        fieldObservationId: t.fieldObservationId,
        fieldUrl: t.fieldUrl,
        fieldCaptureTime: t.fieldCaptureTime,
        fieldCountry: t.fieldCountry,
        fieldScreenshot: t.fieldScreenshot,
        fieldSha256: t.fieldSha256,
        fieldSha256Hint: t.fieldSha256Hint,
        fieldContentHash: t.fieldContentHash,
        fieldVerifyUrl: t.fieldVerifyUrl,
        fieldStatus: t.fieldStatus,
        statusSuccess: td.statusSuccess,
        statusFailure: td.statusFailure,
        statusPending: td.statusPending,
        noScreenshot: t.noScreenshot,
        fieldRequested: t.fieldRequested,
        fieldObserved: t.fieldObserved,
        sectionReachability: t.sectionReachability,
        fieldHttp: t.fieldHttp,
        fieldFinalUrl: t.fieldFinalUrl,
        fieldPageTitle: t.fieldPageTitle,
        fieldDns: t.fieldDns,
        fieldTls: t.fieldTls,
        unmeasured: t.unmeasured,
        sectionDetected: t.sectionDetected,
        detectedHint: t.detectedHint,
        previousValue: t.previousValue,
        thisValue: t.thisValue,
        sectionBehavior: t.sectionBehavior,
        behaviorNote: t.behaviorNote,
        sectionJourney: t.sectionJourney,
        journeyNoSafeTarget: t.journeyNoSafeTarget,
        journeyIncomplete: t.journeyIncomplete,
        auditInference: t.auditInference,
      }}
      observationId={current.id}
      url={current.url}
      capturedLabel="2026/10/24 19:00"
      status={current.status}
      verifyUrl="https://viewtrace.net/verify/preview"
      facts={facts}
      locale={locale}
    />
  );
}
