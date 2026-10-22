import { readFileSync } from "node:fs";
import { browserlessPathEndpoint } from "../src/lib/browserless-geo-endpoint";
import { buildJourneyFunctionCode } from "../src/lib/browserless-journey-function";
import { parseJourneyEvidence, type JourneyEvidenceKind } from "../src/lib/journey-step-evidence";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && process.env[match[1]] == null) process.env[match[1]] = match[2].trim();
}

const FIXTURE = `<!doctype html><html><body>
<button id="go" type="button">Go</button>
<button id="hide" type="button">Hide</button>
<input id="name" />
<p id="panel">panel</p>
<div id="result" hidden></div>
<div id="err" role="alert"></div>
<script>
document.getElementById("go").addEventListener("click", () => {
  document.getElementById("name").value = "probe";
  const result = document.getElementById("result");
  result.hidden = false;
  result.textContent = "done";
  result.setAttribute("aria-expanded", "true");
  document.getElementById("err").textContent = "shown";
  console.error("probe-console");
  fetch("https://invalid.invalid/vt-missing").catch(() => {});
  window.open("data:text/html,tab", "_blank");
});
document.getElementById("hide").addEventListener("click", () => {
  const panel = document.getElementById("panel");
  panel.hidden = true;
  panel.textContent = "closed";
});
</script>
</body></html>`;

async function run(context: Record<string, unknown>) {
  const href = browserlessPathEndpoint("/function");
  if (!href) throw new Error("browserless_not_configured");
  const endpoint = new URL(href);
  endpoint.searchParams.set("timeout", "45000");
  const started = Date.now();
  console.log("start", context.html ? "fixture" : "open");
  const response = await fetch(endpoint.href, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ code: buildJourneyFunctionCode(), context }),
    signal: AbortSignal.timeout(70000),
  });
  const durationMs = Date.now() - started;
  const text = await response.text();
  let raw: { steps?: unknown; data?: { steps?: unknown } } = {};
  try {
    raw = JSON.parse(text) as { steps?: unknown; data?: { steps?: unknown } };
  } catch {
    console.log(JSON.stringify({ ok: false, status: response.status, durationMs, body: text.slice(0, 180) }));
    return { durationMs, steps: [] };
  }
  if (!response.ok) {
    console.log(JSON.stringify({ ok: false, status: response.status, durationMs, body: text.slice(0, 400) }));
    return { durationMs, steps: [] };
  }
  const body = raw.data && typeof raw.data === "object" ? raw.data : raw;
  const steps = Array.isArray(body.steps) ? body.steps : [];
  return {
    durationMs,
    steps: steps.map((item) => {
      const step = item as { kind?: string; status?: string; detail?: string | null; evidence?: unknown };
      const evidence = parseJourneyEvidence(step.evidence);
      return {
        kind: step.kind,
        status: step.status,
        detail: step.detail,
        kinds: evidence.map((row) => row.kind),
        evidence: evidence.map((row) => `${row.kind}: ${row.summary}`),
      };
    }),
  };
}

function has(kinds: JourneyEvidenceKind[] | undefined, kind: JourneyEvidenceKind) {
  return Boolean(kinds?.includes(kind));
}

async function main() {
  if (process.argv[2] === "fixture") {
    const fixtureOnly = await run({
      url: "https://viewtrace.net/tests/journey",
      html: FIXTURE,
      device_class: "desktop",
      region: "",
      steps: [
        { id: "go", kind: "click", selector: "#go", expect_selector: "#result", expect_text: "done", wait_ms: 4000, evidence_screenshot: true },
        { id: "hide", kind: "click", selector: "#hide", expect_selector: "#panel", expect_text: "closed", wait_ms: 4000 },
      ],
    });
    console.log(JSON.stringify(fixtureOnly, null, 2));
    if (fixtureOnly.steps[0]?.status !== "pass") process.exit(1);
    return;
  }
  const open = await run({
    url: "http://example.com/",
    device_class: "desktop",
    region: "",
    steps: [{ id: "open", kind: "open_url", url: "http://example.com/" }],
  });
  const fixture = await run({
    url: "https://viewtrace.net/tests/journey",
    html: FIXTURE,
    device_class: "desktop",
    region: "",
    steps: [
      { id: "go", kind: "click", selector: "#go", expect_selector: "#result", expect_text: "done", wait_ms: 4000, evidence_screenshot: true },
      { id: "hide", kind: "click", selector: "#hide", expect_selector: "#panel", expect_text: "closed", wait_ms: 4000 },
    ],
  });
  const openKinds = open.steps[0]?.kinds;
  const goKinds = fixture.steps[0]?.kinds;
  const hideKinds = fixture.steps[1]?.kinds;
  const ok = open.steps[0]?.status === "pass"
    && has(openKinds, "url_changed")
    && has(openKinds, "http_request")
    && has(openKinds, "http_status")
    && fixture.steps[0]?.status === "pass"
    && has(openKinds, "resource_loaded")
    && has(openKinds, "redirect")
    && has(goKinds, "element_visible")
    && has(goKinds, "text_exists")
    && has(goKinds, "input_value")
    && has(goKinds, "attribute_changed")
    && has(goKinds, "dom_changed")
    && has(goKinds, "screenshot_region_changed")
    && !has(goKinds, "video_playing")
    && !has(openKinds, "screenshot_region_changed")
    && !has(openKinds, "video_playing")
    && has(goKinds, "error_appeared")
    && has(goKinds, "console_error")
    && has(goKinds, "request_failed")
    && has(goKinds, "new_tab")
    && fixture.steps[1]?.status === "pass"
    && has(hideKinds, "element_hidden")
    && !has(hideKinds, "screenshot_region_changed")
    && !has(hideKinds, "video_playing");
  console.log(JSON.stringify({ ok, open, fixture }, null, 2));
  if (!ok) process.exit(1);
}

main();
