import type { Observation } from "@/lib/demo/observations";
import {
  clientJourneyColumns,
  clientMeasuredFromCheck,
  clientNotClickedDetail,
  clientPageLabel,
} from "@/lib/measured-client-summary";
import { observationsToCsv } from "@/lib/observations-csv-format";
import type { RegionalInteractionCheckV1 } from "@/lib/observation-regional-interaction";

function assert(cond: boolean, message: string) {
  if (!cond) throw new Error(message);
}

const detail = clientNotClickedDetail([
  "Log in / /login",
  "Log in / /login",
  "Start for free / /start",
  "Start for free / /start",
  "Start for free / /start",
  "Start for free / /start",
  "Start for free / /start",
  "Subscribe / /subscribe",
]);
assert(
  detail === "Start for free × 5; Log in × 2; Subscribe",
  `detail ${detail}`,
);

assert(clientPageLabel("success", null) === "Not comparable", "no previous");
assert(clientPageLabel("success", "changed") === "Changed", "changed");
assert(clientPageLabel("failure", "changed") === "", "failed capture");

const journey = clientJourneyColumns([
  { name: "Checkout", device: "mobile", status: "blocked" },
  { name: "Checkout", device: "desktop", status: "passed" },
]);
assert(journey.journey === "Checkout", journey.journey);
assert(journey.result === "Desktop Passed; Mobile Blocked", journey.result);

const measured = clientMeasuredFromCheck({
  types: [],
  discovery: {
    map: [],
    safety: {
      blocked: [
        { text: "Log in / /login" },
        { text: "Log in / /login" },
      ],
    },
  },
} as unknown as RegionalInteractionCheckV1);
assert(measured.verified === 0, "verified");
assert(measured.unknownChanges === 0, "unknown");
assert(measured.notClicked === 2, "not clicked");
assert(measured.notClickedDetail === "Log in × 2", measured.notClickedDetail);
assert(clientMeasuredFromCheck(null).verified === null, "not measured");

function obs(id: string, at: string, sha: string): Observation {
  return {
    id,
    url: "https://viewtrace.net/",
    regionValue: "US-NY",
    regionLabel: "New York",
    capturedAt: at,
    status: "success",
    snapshotSha256: sha,
    captureConditions: {
      full_page_requested: true,
      viewport: { width: null, height: null, source: "browserless_implicit_default" },
      engine: { name: "browserless" },
      geo: {
        country: "US",
        state: "NY",
        proxy_mode: "browserless_residential",
        proxy_provider: "browserless",
      },
      browser: { user_agent: "test" },
      result: { snapshot_bytes: null },
    } as Observation["captureConditions"],
  };
}

const older = obs("11111111-1111-4111-8111-111111111111", "2026-10-20T10:00:00.000Z", "aaa");
const newer = obs("22222222-2222-4222-8222-222222222222", "2026-10-21T10:00:00.000Z", "bbb");
const facts = new Map([
  [
    newer.id,
    {
      verified: 0,
      unknownChanges: 12,
      notClicked: 8,
      notClickedDetail: "Log in × 2; Start for free × 5; Subscribe",
      journeys: [{ name: "Checkout", device: "desktop" as const, status: "passed" }],
    },
  ],
]);
const csv = observationsToCsv([older, newer], "standard", facts);
const [header, first, second] = csv.split("\n");
assert(header?.endsWith("page,verified,unknownChanges,notClicked,notClickedDetail,journey,journeyResult"), header ?? "");
const firstCells = first?.split(",") ?? [];
assert(firstCells.at(-7) === "Not comparable", first ?? "");
assert(firstCells.slice(-6).every((cell) => cell === ""), first ?? "");
assert(second?.includes(',Changed,0,12,8,"Log in × 2; Start for free × 5; Subscribe","Checkout","Desktop Passed"') === true, second ?? "");
assert(second?.includes("Desktop Passed") === true, second ?? "");
const audit = observationsToCsv([older], "audit");
assert(audit.split("\n")[0]?.endsWith("journeyResult,captureConditionsJson") === true, "audit tail");

console.log("ok");
