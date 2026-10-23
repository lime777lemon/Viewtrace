import {
  behaviorCells,
  buildRegionEnvironmentMatrix,
  pageLoadCell,
  resourcesCellFromRequests,
  sessionResourcesCell,
  stageFromProxy,
} from "../src/lib/region-environment-matrix";

const matrix = buildRegionEnvironmentMatrix([
  {
    region: "JP-13",
    stage: "city",
    device: "desktop",
    page: "pass",
    resources: "pass",
    behavior: "pass",
    video: "pass",
    environment: {
      viewport: "1280×720",
      dpr: 2,
      locale: "ja-JP",
      timezone: "Asia/Tokyo",
      language: "ja",
      pointer: "mouse",
      touch: false,
      userAgent: "Mozilla/5.0",
      reducedMotion: false,
    },
    steps: [
      { kind: "login", status: "pass" },
      { kind: "checkout", status: "pass" },
    ],
  },
  {
    region: "US-NY",
    stage: "state",
    device: "mobile",
    page: "pass",
    resources: "pass",
    behavior: "fail",
    environment: {
      viewport: "390×844",
      locale: "en-US",
      timezone: "America/New_York",
      language: "en",
      pointer: "touch",
      touch: true,
      userAgent: "Mobile Safari",
      reducedMotion: false,
    },
    steps: [
      { kind: "login", status: "pass" },
      { kind: "checkout", status: "fail" },
    ],
  },
  {
    region: "GB",
    stage: "country",
    device: "desktop",
    page: "pass",
    resources: "pass",
    behavior: "pass",
    video: "pass",
    steps: [
      { kind: "login", status: "pass" },
      { kind: "checkout", status: "pass" },
    ],
  },
], "en");

const labels = matrix.columns.map((column) => column.label);
if (labels.join(" | ") !== "United Kingdom Desktop | Tokyo Desktop | New York Mobile") {
  throw new Error(`labels ${labels.join(" | ")}`);
}
if (!matrix.findings.includes("Checkout is broken only on New York Mobile.")) {
  throw new Error(matrix.findings.join("\n") || "missing checkout finding");
}
if (matrix.findings.some((line) => line.includes("only") && !line.includes("New York Mobile"))) {
  throw new Error(matrix.findings.join("\n"));
}
const checkout = matrix.rows.find((row) => row.id === "checkout");
if (!checkout || checkout.cells.join(",") !== "pass,pass,fail") throw new Error(JSON.stringify(checkout));
const video = matrix.rows.find((row) => row.id === "video");
if (!video || video.cells.join(",") !== "pass,pass,not_measured") throw new Error(JSON.stringify(video));
const ny = matrix.columns[2];
if (ny?.facts.some((fact) => fact.label === "DPR")) throw new Error("missing DPR was shown");
if (!matrix.columns[1]?.facts.some((fact) => fact.label === "DPR" && fact.value === "2")) throw new Error("Tokyo DPR");

const country = buildRegionEnvironmentMatrix([{
  region: "US-NY",
  stage: "country",
  device: "mobile",
  steps: [{ kind: "checkout", status: "fail" }],
}], "en");
if (country.columns[0]?.label.includes("New York")) throw new Error(country.columns[0]?.label ?? "country");
if (country.findings[0] !== "Checkout is broken on United States Mobile.") throw new Error(country.findings[0] ?? "country finding");

const unverified = buildRegionEnvironmentMatrix([{
  region: "US-NY",
  stage: "no_proxy",
  device: "mobile",
  steps: [{ kind: "checkout", status: "fail" }],
}], "en");
if (unverified.columns[0]?.label !== "US-NY Mobile") throw new Error(unverified.columns[0]?.label ?? "unverified");
if (unverified.findings[0]?.includes("New York")) throw new Error(unverified.findings[0] ?? "named");
if (unverified.columns[0]?.facts.find((fact) => fact.label === "Region")?.value !== "not verified") {
  throw new Error("region fact");
}

if (pageLoadCell({ status: "success" }) !== "pass") throw new Error("captured page");
if (pageLoadCell({ status: "success", httpStatus: 500 }) !== "fail") throw new Error("http 500");
if (pageLoadCell({ status: "incomplete" }) !== "not_measured") throw new Error("incomplete page");

const split = buildRegionEnvironmentMatrix([
  { region: "US-NY", stage: "state", device: "desktop", page: "pass" },
  { region: "US-NY", stage: "state", device: "mobile" },
], "en");
const page = split.rows.find((row) => row.id === "page");
if (!page || page.cells.join(",") !== "pass,not_measured") throw new Error(JSON.stringify(page));

const quiet = behaviorCells([
  { type: "hover", status: "working" },
  { type: "video", status: "not_detected" },
]);
if (quiet.behavior !== "pass" || quiet.video !== "not_measured") throw new Error(JSON.stringify(quiet));
const stuck = behaviorCells([{ type: "menu", status: "no_change_observed" }]);
if (stuck.behavior !== "fail") throw new Error(JSON.stringify(stuck));
if (resourcesCellFromRequests([]) !== "not_measured") throw new Error("empty resources");
if (sessionResourcesCell(null) !== "not_measured") throw new Error("no session");
if (sessionResourcesCell({ failed: 0, status4xx: 0, status5xx: 0, requestFailed: 0 }) !== "pass") throw new Error("clean session");
if (stageFromProxy("US-NY", "none") !== "no_proxy") throw new Error("none");
if (stageFromProxy("US-NY", "browserless_residential") !== "state") throw new Error("state");
if (stageFromProxy("JP-13", "browserless_residential") !== "city") throw new Error("city");

const several = buildRegionEnvironmentMatrix([
  { region: "JP-13", stage: "city", device: "desktop", steps: [{ kind: "checkout", status: "fail" }] },
  { region: "US-NY", stage: "state", device: "mobile", steps: [{ kind: "checkout", status: "fail" }] },
  { region: "GB", stage: "country", device: "desktop", steps: [{ kind: "checkout", status: "pass" }] },
], "en");
if (several.findings[0] !== "Checkout is broken on Tokyo Desktop and New York Mobile.") throw new Error(several.findings[0] ?? "several");

const every = buildRegionEnvironmentMatrix([
  { region: "JP-13", stage: "city", device: "desktop", steps: [{ kind: "checkout", status: "fail" }] },
  { region: "US-NY", stage: "state", device: "mobile", steps: [{ kind: "checkout", status: "fail" }] },
], "en");
if (every.findings[0] !== "Checkout is broken in every measured environment.") throw new Error(every.findings[0] ?? "every");

console.log("ok");
