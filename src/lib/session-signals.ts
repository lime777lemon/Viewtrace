/** Facts read inside the Browserless page session. Null means that signal was not measured. */

import { selectResourceRequests, type ResourceRequestV1 } from "@/lib/resource-request";

export type SessionResourceCounts = {
  script: number;
  stylesheet: number;
  image: number;
  font: number;
  xhr: number;
  fetch: number;
  other: number;
  failed: number;
  status_4xx: number;
  status_5xx: number;
  transfer_bytes: number | null;
};

export type SessionSignalsV1 = {
  http: {
    status: number | null;
    final_url: string | null;
    redirect_count: number | null;
    content_type: string | null;
    robots_header: string | null;
    loaded: boolean | null;
    timed_out: boolean;
  };
  resources: SessionResourceCounts;
  errors: {
    console_error: number;
    pageerror: number;
    request_failed: number;
    /** Null when this session did not listen for unhandled rejection. */
    unhandled_rejection: number | null;
  };
  performance: {
    ttfb_ms: number | null;
    dom_content_loaded_ms: number | null;
    load_ms: number | null;
    fcp_ms: number | null;
    lcp_ms: number | null;
    cls: number | null;
    long_tasks: number | null;
  };
  structured_data: {
    types: string[];
    syntax_errors: number | null;
  };
  /** Page-load requests, before the first action. Empty when that window was not recorded. */
  requests: ResourceRequestV1[];
};

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function count(value: unknown): number {
  const n = num(value);
  return n != null && n >= 0 ? Math.round(n) : 0;
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function resources(raw: unknown): SessionResourceCounts {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    script: count(row.script),
    stylesheet: count(row.stylesheet),
    image: count(row.image),
    font: count(row.font),
    xhr: count(row.xhr),
    fetch: count(row.fetch),
    other: count(row.other),
    failed: count(row.failed),
    status_4xx: count(row.status_4xx),
    status_5xx: count(row.status_5xx),
    transfer_bytes: num(row.transfer_bytes),
  };
}

export function parseSessionSignals(raw: unknown): SessionSignalsV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const http = row.http && typeof row.http === "object" ? (row.http as Record<string, unknown>) : {};
  const errors = row.errors && typeof row.errors === "object" ? (row.errors as Record<string, unknown>) : {};
  const performance = row.performance && typeof row.performance === "object" ? (row.performance as Record<string, unknown>) : {};
  const structured = row.structured_data && typeof row.structured_data === "object" ? (row.structured_data as Record<string, unknown>) : {};
  const types = Array.isArray(structured.types)
    ? structured.types.flatMap((item) => {
        const name = text(item, 80);
        return name ? [name] : [];
      }).slice(0, 8)
    : [];
  return {
    http: {
      status: num(http.status),
      final_url: text(http.final_url, 2000),
      redirect_count: num(http.redirect_count),
      content_type: text(http.content_type, 180),
      robots_header: text(http.robots_header, 180),
      loaded: typeof http.loaded === "boolean" ? http.loaded : null,
      timed_out: http.timed_out === true,
    },
    resources: resources(row.resources),
    errors: {
      console_error: count(errors.console_error),
      pageerror: count(errors.pageerror),
      request_failed: count(errors.request_failed),
      unhandled_rejection: typeof errors.unhandled_rejection === "number" && Number.isFinite(errors.unhandled_rejection)
        ? Math.max(0, Math.round(errors.unhandled_rejection))
        : null,
    },
    performance: {
      ttfb_ms: num(performance.ttfb_ms),
      dom_content_loaded_ms: num(performance.dom_content_loaded_ms),
      load_ms: num(performance.load_ms),
      fcp_ms: num(performance.fcp_ms),
      lcp_ms: num(performance.lcp_ms),
      cls: num(performance.cls),
      long_tasks: num(performance.long_tasks),
    },
    structured_data: {
      types,
      syntax_errors: num(structured.syntax_errors),
    },
    requests: selectResourceRequests(row.requests),
  };
}

/** Installed before navigation so paint and layout-shift entries are not missed. */
export const SESSION_PROBE_INSTALL = `function installSessionProbe() {
  window.__vtSession = { lcp: null, cls: 0, longTasks: 0 };
  const watch = (type, apply) => {
    try {
      const obs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) apply(entry);
      });
      obs.observe({ type: type, buffered: true });
    } catch (e) {}
  };
  watch("largest-contentful-paint", (entry) => { window.__vtSession.lcp = entry.startTime; });
  watch("layout-shift", (entry) => { if (!entry.hadRecentInput) window.__vtSession.cls += Number(entry.value) || 0; });
  watch("longtask", () => { window.__vtSession.longTasks += 1; });
}`;

/** Short Browserless function used to measure one page without running behavior checks. */
export function buildSessionProbeFunctionCode(): string {
  return `export default async function({ page, context }) {
  ${SESSION_PROBE_INSTALL}
  ${SESSION_PROBE_READ}
  const url = String(context && context.url ? context.url : "");
  const net = [];
  const errors = { console_error: 0, pageerror: 0, request_failed: 0, unhandled_rejection: 0 };
  page.on("console", (msg) => { if (msg && msg.type() === "error") errors.console_error += 1; });
  page.on("pageerror", () => { errors.pageerror += 1; });
  page.on("response", (res) => {
    const status = res.status();
    net.push({ failed: status >= 400, status: status });
  });
  page.on("requestfailed", () => { errors.request_failed += 1; net.push({ failed: true, status: null }); });
  await page.evaluateOnNewDocument(installSessionProbe);
  await page.evaluateOnNewDocument(() => {
    window.addEventListener("unhandledrejection", () => {
      window.__vtUnhandled = (window.__vtUnhandled || 0) + 1;
    });
  });
  let navigation = null;
  let timedOut = false;
  try {
    const response = await page.goto(url, { waitUntil: "load", timeout: 25000 });
    if (response) {
      const headers = typeof response.headers === "function" ? response.headers() : {};
      const req = response.request && response.request();
      const hops = req && req.redirectChain ? req.redirectChain() : [];
      navigation = {
        status: response.status(),
        final_url: String(response.url() || ""),
        content_type: String(headers["content-type"] || ""),
        robots_header: String(headers["x-robots-tag"] || ""),
        redirect_count: hops.length,
      };
    }
  } catch (e) {
    timedOut = /timeout/i.test(String(e && e.message ? e.message : e));
  }
  await new Promise((resolve) => setTimeout(resolve, 800));
  try {
    const unhandled = await page.evaluate(() => window.__vtUnhandled || 0);
    if (typeof unhandled === "number") errors.unhandled_rejection = unhandled;
  } catch (e) {}
  let probe = null;
  try { probe = await page.evaluate(readSessionProbe); } catch (e) {}
  let structured = { types: [], syntax_errors: 0 };
  try {
    structured = await page.evaluate(() => {
      const types = [];
      let syntax = 0;
      for (const node of Array.from(document.querySelectorAll('script[type="application/ld+json"]')).slice(0, 8)) {
        try {
          const parsed = JSON.parse(node.textContent || "");
          const rows = Array.isArray(parsed) ? parsed : [parsed];
          for (const item of rows) {
            const type = item && item["@type"];
            if (typeof type === "string") types.push(type);
          }
        } catch (e) { syntax += 1; }
      }
      return { types: types.slice(0, 8), syntax_errors: syntax };
    });
  } catch (e) {}
  return {
    http: {
      status: navigation ? navigation.status : null,
      final_url: navigation ? navigation.final_url : null,
      redirect_count: navigation ? navigation.redirect_count : null,
      content_type: navigation ? navigation.content_type : null,
      robots_header: navigation ? navigation.robots_header : null,
      loaded: navigation ? navigation.status > 0 && navigation.status < 400 : false,
      timed_out: timedOut,
    },
    resources: Object.assign({}, probe && probe.resources ? probe.resources : {}, {
      failed: net.filter((row) => row.failed).length,
      status_4xx: net.filter((row) => row.status >= 400 && row.status < 500).length,
      status_5xx: net.filter((row) => row.status >= 500).length,
    }),
    errors: errors,
    performance: probe && probe.performance ? probe.performance : {},
    structured_data: structured,
  };
}`;
}

/** Read at the end of the same page. Failed requests stay on the Node request log. */
export const SESSION_PROBE_READ = `function readSessionProbe() {
  const nav = performance.getEntriesByType("navigation")[0] || null;
  const paints = performance.getEntriesByType("paint") || [];
  const fcp = paints.filter((row) => row.name === "first-contentful-paint")[0] || null;
  const resources = performance.getEntriesByType("resource") || [];
  let transfer = 0;
  let transferKnown = false;
  const counts = { script: 0, stylesheet: 0, image: 0, font: 0, xhr: 0, fetch: 0, other: 0 };
  for (const row of resources) {
    const type = row.initiatorType === "xmlhttprequest" ? "xhr" : row.initiatorType === "css" ? "stylesheet" : row.initiatorType === "img" ? "image" : row.initiatorType === "link" ? "stylesheet" : row.initiatorType;
    if (type === "script" || type === "stylesheet" || type === "image" || type === "font" || type === "xhr" || type === "fetch") counts[type] += 1;
    else counts.other += 1;
    if (typeof row.transferSize === "number" && row.transferSize >= 0) {
      transfer += row.transferSize;
      transferKnown = true;
    }
  }
  const vitals = window.__vtSession || { lcp: null, cls: 0, longTasks: 0 };
  const round = (value) => typeof value === "number" && isFinite(value) ? Math.round(value) : null;
  return {
    performance: {
      ttfb_ms: nav ? round(nav.responseStart) : null,
      dom_content_loaded_ms: nav ? round(nav.domContentLoadedEventEnd) : null,
      load_ms: nav ? round(nav.loadEventEnd) : null,
      fcp_ms: fcp ? round(fcp.startTime) : null,
      lcp_ms: round(vitals.lcp),
      cls: typeof vitals.cls === "number" ? Math.round(vitals.cls * 1000) / 1000 : null,
      long_tasks: typeof vitals.longTasks === "number" ? vitals.longTasks : null,
    },
    resources: {
      script: counts.script,
      stylesheet: counts.stylesheet,
      image: counts.image,
      font: counts.font,
      xhr: counts.xhr,
      fetch: counts.fetch,
      other: counts.other,
      transfer_bytes: transferKnown ? transfer : null,
    },
  };
}`;
