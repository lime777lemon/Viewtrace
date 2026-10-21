import assert from "node:assert/strict";
import {
  behaviorAlertEmailCopy,
  behaviorAlertTransitions,
  buildBehaviorDiff,
} from "../src/lib/observation-behavior-diff";
import { parseStoredScroll } from "../src/lib/observation-optional-metrics-store";
import {
  INTERACTION_CHECK_TYPES,
  REGIONAL_INTERACTION_SCHEMA_VERSION,
  REGIONAL_INTERACTION_SOURCE,
  type InteractionCheckType,
  type RegionalInteractionCheckV1,
} from "../src/lib/observation-regional-interaction";
import type { ScrollInteractionStatus } from "../src/lib/observation-scroll-interaction";

function check(
  statuses: Partial<Record<InteractionCheckType, ScrollInteractionStatus>>,
): RegionalInteractionCheckV1 {
  return {
    schema_version: REGIONAL_INTERACTION_SCHEMA_VERSION,
    source: REGIONAL_INTERACTION_SOURCE,
    measured_at: "2026-10-21T00:00:00.000Z",
    requested_url: "https://example.com/",
    requested_region: "US-CA",
    types: INTERACTION_CHECK_TYPES.map((type) => ({
      type,
      detected: Boolean(statuses[type] && statuses[type] !== "not_detected" && statuses[type] !== "not_measured"),
      status: statuses[type] ?? "not_measured",
    })),
    scroll: null,
    duration_ms: 12,
    proxy_bytes: null,
  };
}

const regression = buildBehaviorDiff(
  check({ carousel: "working", scroll: "working" }),
  check({ carousel: "no_change_observed", scroll: "working", form: "not_detected" }),
  "prev-obs",
);
const alerts = behaviorAlertTransitions(regression);
assert.deepEqual(
  alerts.map((row) => row.type),
  ["carousel"],
);
assert.equal(alerts[0]?.kind, "regression");
assert.equal(
  regression.transitions.find((row) => row.type === "scroll")?.kind,
  "unchanged",
);

const candidate = buildBehaviorDiff(
  check({ menu: "working" }),
  check({ menu: "not_detected" }),
  "prev-obs",
);
assert.equal(behaviorAlertTransitions(candidate)[0]?.kind, "alert_candidate");

const appeared = buildBehaviorDiff(
  check({ hover: "not_detected" }),
  check({ hover: "working" }),
  "prev-obs",
);
assert.equal(appeared.transitions.find((row) => row.type === "hover")?.kind, "new_interaction");
assert.equal(behaviorAlertTransitions(appeared).length, 0);

const unmeasured = buildBehaviorDiff(
  check({ video: "working" }),
  check({ video: "not_measured" }),
  "prev-obs",
);
assert.equal(unmeasured.transitions.find((row) => row.type === "video")?.kind, "not_comparable");
assert.equal(behaviorAlertTransitions(unmeasured).length, 0);

const blocked = buildBehaviorDiff(
  check({ form: "blocked_for_safety" }),
  check({ form: "blocked_for_safety" }),
  "prev-obs",
);
assert.equal(blocked.transitions.find((row) => row.type === "form")?.kind, "unchanged");

assert.equal(buildBehaviorDiff(null, check({ scroll: "working" }), null).transitions.length, 0);

const email = behaviorAlertEmailCopy({ region: "California", alerts });
assert.match(email.subject, /Behavior regression detected/);
assert.equal(/page changed/i.test([email.subject, ...email.lines].join("\n")), false);
assert.match(email.lines.join("\n"), /Carousel regression detected in California/);
assert.match(email.lines.join("\n"), /Previous: Working/);
assert.match(email.lines.join("\n"), /Current: No rendered state change observed/);

const watchNotes = [
  {
    kind: "scroll_interaction",
    result: check({ scroll: "working" }),
    run_times: ["2026-10-21T00:00:00.000Z"],
    quota_run_times: [],
    billing: "watch_included",
  },
];
assert.deepEqual(parseStoredScroll(watchNotes)?.quota_run_times, []);
assert.equal(parseStoredScroll(watchNotes)?.billing, "watch_included");

const legacyNotes = [
  {
    result: check({ scroll: "working" }),
    run_times: ["2026-10-01T00:00:00.000Z", "2026-10-21T00:00:00.000Z"],
  },
];
assert.deepEqual(parseStoredScroll(legacyNotes)?.quota_run_times, [
  "2026-10-01T00:00:00.000Z",
  "2026-10-21T00:00:00.000Z",
]);
assert.equal(parseStoredScroll(legacyNotes)?.billing, "synthetic");

console.log("test-observation-behavior-diff: ok");
