import { journeyStepReport } from "../src/lib/journey-definition";
import { journeyMeasurementLines } from "../src/lib/journey-measurement";
import { regionScreenshotNeeded, visualEvidenceLines, type StepVisualEvidence } from "../src/lib/visual-evidence";

const login = regionScreenshotNeeded({ kind: "login", selector: "#login", expectSelector: "", evidenceScreenshot: false });
const modal = regionScreenshotNeeded({ kind: "click", selector: "#open", expectSelector: "#modal" });
const explicit = regionScreenshotNeeded({ kind: "login", evidenceScreenshot: true });
if (login || !modal || !explicit) throw new Error(`need ${login} ${modal} ${explicit}`);

const hashed: StepVisualEvidence = {
  screenshot: "hashed",
  before: { box: { x: 8, y: 20, w: 220, h: 48 }, visible: false, style: { display: "block", visibility: "hidden", opacity: "0", transform: "none" } },
  after: { box: { x: 8, y: 100, w: 220, h: 180 }, visible: true, style: { display: "block", visibility: "visible", opacity: "1", transform: "none" } },
  region_hash: { before: "aaa", after: "bbb", changed: true },
  layout_shift: 0.0412,
};
const modalLines = visualEvidenceLines(hashed, "en").map((line) => `${line.label}: ${line.value}`);
if (!modalLines.some((line) => line.startsWith("Bounding box:") && line.includes("220×180"))) throw new Error(modalLines.join(" | "));
if (!modalLines.includes("Visibility: hidden → visible")) throw new Error("visibility");
if (!modalLines.some((line) => line.includes("visibility hidden → visible") && line.includes("opacity 0 → 1"))) throw new Error("style");
if (!modalLines.includes("Region hash: changed")) throw new Error("hash");
if (!modalLines.includes("Layout shift: 0.0412")) throw new Error("shift");

const plain: StepVisualEvidence = {
  screenshot: "not_taken",
  before: { box: { x: 1, y: 2, w: 40, h: 20 }, visible: true, style: { display: "inline", visibility: "visible", opacity: "1", transform: "none" } },
  after: { box: { x: 1, y: 2, w: 40, h: 20 }, visible: true, style: { display: "inline", visibility: "visible", opacity: "1", transform: "none" } },
  region_hash: null,
  layout_shift: 0,
};
const loginLines = visualEvidenceLines(plain, "en").map((line) => `${line.label}: ${line.value}`);
if (!loginLines.includes("Region screenshot: not taken")) throw new Error("jpeg");
if (!loginLines.includes("Layout shift: 0")) throw new Error("zero shift");
if (!loginLines.includes("Computed style: unchanged")) throw new Error("style same");

const report = journeyStepReport(
  {
    kind: "login",
    status: "pass",
    detail: null,
    url_after: "https://example.com/dashboard",
    before_visible: true,
    after_visible: true,
    visual: plain,
  },
  { selector: "#login", url: "", value: "", expect_text: "", expect_visible: false, expect_url: "dashboard", permitted_side_effect: null },
  0,
  "en",
);
const text = report.lines.map((line) => `${line.label}: ${line.value}`).join("\n");
if (!report.title.includes("Passed")) throw new Error(report.title);
if (!text.includes("Region screenshot: not taken")) throw new Error(text);
if (text.includes("Region hash")) throw new Error("login hashed");

const measured = journeyMeasurementLines({ status: "pass", evidenceScreenshot: false, locale: "en" });
const withFacts = journeyMeasurementLines({ status: "pass", evidenceScreenshot: false, visual: plain, locale: "en" });
if (measured.find((row) => row.label === "Measured · Visual")?.value !== "not applicable") throw new Error("old visual");
if (withFacts.find((row) => row.label === "Measured · Visual")?.value !== "measured") throw new Error("new visual");

console.log("ok");
