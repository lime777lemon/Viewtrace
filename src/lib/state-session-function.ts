import { buildInteractionFunctionCode } from "@/lib/browserless-interaction-function";
import { buildJourneyFunctionCode } from "@/lib/browserless-journey-function";

export type StateMeasure = "screenshot" | "interaction" | "journey" | "lab_cwv";

const EXPORT_MARKER = "export default async function({ page, context })";

export function asNamedFunction(code: string, name: string): string {
  const index = code.indexOf(EXPORT_MARKER);
  if (index < 0) throw new Error(`state session function is missing ${name}`);
  return `async function ${name}(page, context)${code.slice(index + EXPORT_MARKER.length)}`;
}

const LAB_INSTALL = `await page.evaluateOnNewDocument(() => {
  window.__vtLab = { lcp: null, fcp: null, cls: 0, tbt: 0 };
  const add = (type, onEntry) => {
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) onEntry(entry);
      }).observe({ type: type, buffered: true });
    } catch (error) {}
  };
  add("largest-contentful-paint", (entry) => { window.__vtLab.lcp = entry.startTime; });
  add("paint", (entry) => { if (entry.name === "first-contentful-paint") window.__vtLab.fcp = entry.startTime; });
  add("layout-shift", (entry) => { if (!entry.hadRecentInput) window.__vtLab.cls += entry.value || 0; });
  add("longtask", (entry) => { const extra = entry.duration - 50; if (extra > 0) window.__vtLab.tbt += extra; });
});`;

/**
 * One Browserless function. Exit geo runs before any measurement.
 * A mismatch returns without opening the target site.
 */
export function buildStateSessionFunction(measures: StateMeasure[]): string {
  const parts: string[] = [];
  if (measures.includes("interaction")) parts.push(asNamedFunction(buildInteractionFunctionCode(), "runInteraction"));
  if (measures.includes("journey")) parts.push(asNamedFunction(buildJourneyFunctionCode(), "runJourney"));
  const body = [
    "export default async function({ page, context }) {",
    "  const expectedCountry = String(context && context.expectedCountry ? context.expectedCountry : '').toUpperCase();",
    "  const expectedState = String(context && context.expectedState ? context.expectedState : '').toUpperCase();",
    "  const requireState = context && context.requireState !== false;",
    "  let payload = {};",
    "  try {",
    "    payload = await page.evaluate(async () => {",
    "      const response = await fetch('https://ipwho.is/');",
    "      return await response.json();",
    "    });",
    "  } catch (error) { payload = {}; }",
    "  const country = String(payload && payload.country_code ? payload.country_code : '').toUpperCase();",
    "  const state = String(payload && payload.region_code ? payload.region_code : '').toUpperCase();",
    "  const ip = payload && typeof payload.ip === 'string' ? payload.ip : '';",
    "  const matched = Boolean(expectedCountry && expectedState && country === expectedCountry && state === expectedState);",
    "  if (requireState && !matched) return { matched: false, country: country || null, state: state || null, ip: ip, measurements: [] };",
    "  const measures = Array.isArray(context && context.measures) ? context.measures : [];",
    "  const measurements = [];",
    "  let png = null;",
    "  let interaction = null;",
    "  let journey = null;",
    "  let lab = null;",
    "  const viewport = context && context.viewport ? context.viewport : { width: 1280, height: 800 };",
    "  await page.setViewport({ width: Number(viewport.width) || 1280, height: Number(viewport.height) || 800 });",
    "  if (context && context.userAgent) await page.setUserAgent(String(context.userAgent));",
    measures.includes("lab_cwv") ? `  if (measures.indexOf('lab_cwv') >= 0) { ${LAB_INSTALL} }` : "",
    "  const openTarget = measures.indexOf('screenshot') >= 0 || measures.indexOf('lab_cwv') >= 0;",
    "  if (openTarget && context && context.url) {",
    "    await page.goto(String(context.url), { waitUntil: 'networkidle2', timeout: 30000 });",
    "  }",
    measures.includes("lab_cwv")
      ? `  if (measures.indexOf('lab_cwv') >= 0) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try { lab = await page.evaluate(() => window.__vtLab || null); } catch (error) { lab = null; }
    if (lab) measurements.push('lab_cwv');
  }`
      : "",
    measures.includes("screenshot")
      ? `  if (measures.indexOf('screenshot') >= 0) {
    const image = await page.screenshot({ fullPage: Boolean(context && context.fullPage), type: 'png' });
    png = Buffer.from(image).toString('base64');
    measurements.push('screenshot');
  }`
      : "",
    measures.includes("interaction")
      ? `  if (measures.indexOf('interaction') >= 0) {
    try {
      interaction = await runInteraction(page, context.interaction || {});
      measurements.push('interaction');
    } catch (error) { interaction = null; }
  }`
      : "",
    measures.includes("journey")
      ? `  if (measures.indexOf('journey') >= 0) {
    try {
      journey = await runJourney(page, context.journey || {});
      measurements.push('journey');
    } catch (error) { journey = null; }
  }`
      : "",
    "  return { matched: matched, country: country || null, state: state || null, ip: ip, png: png, interaction: interaction, journey: journey, lab: lab, measurements: measurements };",
    "}",
  ].filter(Boolean);
  parts.push(body.join("\n"));
  return parts.join("\n");
}
