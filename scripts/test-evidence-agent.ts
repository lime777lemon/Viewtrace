import assert from "node:assert/strict";
import type { Observation } from "../src/lib/demo/observations";
import { buildEvidenceHandoffQueue, buildEvidenceReview, evidenceHandoffRecordAnswer, evidenceReviewSentence } from "../src/lib/evidence-agent";
import {
  INTERACTION_CHECK_TYPES,
  REGIONAL_INTERACTION_SCHEMA_VERSION,
  REGIONAL_INTERACTION_SOURCE,
  type InteractionCheckType,
  type RegionalInteractionCheckV1,
} from "../src/lib/observation-regional-interaction";
import type { ScrollInteractionStatus } from "../src/lib/observation-scroll-interaction";

const now = new Date("2026-10-28T00:00:00.000Z");

function obs(partial: {
  id: string;
  at: string;
  sha: string;
  region?: string;
  url?: string;
}): Observation {
  return {
    id: partial.id,
    url: partial.url ?? "https://www.client.example/landing",
    regionValue: partial.region ?? "US-CA",
    regionLabel: "US · California",
    capturedAt: partial.at,
    status: "success",
    snapshotSha256: partial.sha,
    captureConditions: { full_page_requested: true } as Observation["captureConditions"],
  };
}

function check(
  statuses: Partial<Record<InteractionCheckType, ScrollInteractionStatus>>,
): RegionalInteractionCheckV1 {
  return {
    schema_version: REGIONAL_INTERACTION_SCHEMA_VERSION,
    source: REGIONAL_INTERACTION_SOURCE,
    measured_at: now.toISOString(),
    requested_url: "https://client.example/landing",
    requested_region: "US-CA",
    types: INTERACTION_CHECK_TYPES.map((type) => ({
      type,
      detected: Boolean(statuses[type] && statuses[type] !== "not_detected" && statuses[type] !== "not_measured"),
      status: statuses[type] ?? "not_measured",
    })),
    scroll: null,
    duration_ms: 10,
    proxy_bytes: null,
  };
}

const previous = obs({ id: "prev", at: "2026-10-20T00:00:00.000Z", sha: "aaa" });
const current = obs({ id: "curr", at: "2026-10-27T00:00:00.000Z", sha: "aaa" });
const checks = new Map<string, RegionalInteractionCheckV1>([
  ["prev", check({ carousel: "working" })],
  ["curr", check({ carousel: "no_change_observed" })],
]);

const regression = buildEvidenceHandoffQueue({ now, observations: [previous, current], checks });
assert.equal(regression.length, 1);
assert.equal(regression[0]?.host, "client.example");
assert.equal(regression[0]?.screenshot, "same");
assert.equal(regression[0]?.behaviors.some((row) => row.label === "Carousel" && row.current === "No rendered state change observed"), true);

const changed = buildEvidenceHandoffQueue({
  now,
  observations: [previous, obs({ id: "shot", at: "2026-10-27T01:00:00.000Z", sha: "bbb" })],
  checks: new Map(),
});
assert.equal(changed.length, 1);
assert.equal(changed[0]?.screenshot, "changed");
assert.equal(changed[0]?.previousObservationId, "prev");

const quiet = buildEvidenceHandoffQueue({
  now,
  observations: [previous, current],
  checks: new Map([
    ["prev", check({ carousel: "working" })],
    ["curr", check({ carousel: "working" })],
  ]),
});
assert.equal(quiet.length, 0);

const stale = buildEvidenceHandoffQueue({
  now,
  observations: [
    obs({ id: "old-prev", at: "2026-09-01T00:00:00.000Z", sha: "aaa" }),
    obs({ id: "old", at: "2026-09-02T00:00:00.000Z", sha: "bbb" }),
  ],
  checks: new Map(),
});
assert.equal(stale.length, 0);

const text = evidenceHandoffRecordAnswer(regression[0]!, "ja");
assert.match(text, /Changed|Same/);
assert.match(text, /Carousel/);
assert.equal(text.includes("Page changed"), false);

const stillOpen = buildEvidenceReview({
  now,
  observations: [
    obs({ id: "b1", at: "2026-10-22T00:00:00.000Z", sha: "aaa" }),
    obs({ id: "b2", at: "2026-10-25T00:00:00.000Z", sha: "aaa" }),
    obs({ id: "b3", at: "2026-10-27T00:00:00.000Z", sha: "aaa" }),
  ],
  checks: new Map([
    ["b1", check({ carousel: "working" })],
    ["b2", check({ carousel: "no_change_observed" })],
    ["b3", check({ carousel: "no_change_observed" })],
  ]),
});
assert.equal(stillOpen.open.length, 1);
assert.equal(stillOpen.matched.length, 0);
assert.match(stillOpen.open[0]?.checks[0]?.label ?? "", /Carousel/);
assert.match(evidenceReviewSentence(stillOpen.open[0]!.checks[0]!, "ja"), /Working に戻ったか/);

const closed = buildEvidenceReview({
  now,
  observations: [
    obs({ id: "c1", at: "2026-10-22T00:00:00.000Z", sha: "aaa" }),
    obs({ id: "c2", at: "2026-10-25T00:00:00.000Z", sha: "aaa" }),
    obs({ id: "c3", at: "2026-10-27T00:00:00.000Z", sha: "aaa" }),
  ],
  checks: new Map([
    ["c1", check({ carousel: "working" })],
    ["c2", check({ carousel: "no_change_observed" })],
    ["c3", check({ carousel: "working" })],
  ]),
});
assert.equal(closed.open.length, 0);
assert.equal(closed.matched.length, 1);
assert.equal(closed.matched[0]?.checks[0]?.resultStatus, "Working");

const shotClosed = buildEvidenceReview({
  now,
  observations: [
    obs({ id: "s1", at: "2026-10-22T00:00:00.000Z", sha: "aaa" }),
    obs({ id: "s2", at: "2026-10-25T00:00:00.000Z", sha: "bbb" }),
    obs({ id: "s3", at: "2026-10-27T00:00:00.000Z", sha: "bbb" }),
  ],
  checks: new Map(),
});
assert.equal(shotClosed.open.length, 0);
assert.equal(shotClosed.matched.length, 1);
assert.equal(shotClosed.matched[0]?.checks[0]?.kind, "screenshot");

const shotOpen = buildEvidenceReview({
  now,
  observations: [
    obs({ id: "t1", at: "2026-10-22T00:00:00.000Z", sha: "aaa" }),
    obs({ id: "t2", at: "2026-10-25T00:00:00.000Z", sha: "bbb" }),
    obs({ id: "t3", at: "2026-10-27T00:00:00.000Z", sha: "ccc" }),
  ],
  checks: new Map(),
});
assert.equal(shotOpen.open.length, 1);
assert.equal(shotOpen.matched.length, 0);
assert.match(evidenceReviewSentence(shotOpen.open[0]!.checks[0]!, "ja"), /Same/);

console.log("evidence-agent ok");
