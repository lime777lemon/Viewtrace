import assert from "node:assert/strict";
import {
  buildWeeklyEvidenceReport,
  isBlockedEvidenceWebhookHost,
  maskEvidenceWebhookUrl,
  maskPagerDutyRoutingKey,
  evidenceReportRecipientEmails,
  normalizeOtherWebhookUrl,
  parseEvidenceReportRecipientEmails,
  normalizePagerDutyRoutingKey,
  normalizeSlackIncomingWebhookUrl,
  normalizeTeamsWebhookUrl,
  otherWebhookEvidencePayload,
  pagerDutyEvidencePayload,
  evidenceReportPeriodStarting,
  previousJstWeek,
  slackEvidencePayload,
  teamsEvidencePayload,
  type EvidenceReportObservationFact,
} from "../src/lib/scheduled-evidence-report";
import {
  EVIDENCE_PROVIDER_RESPONSE_LIMIT,
  deliverEvidenceReportChannels,
  evidenceChannelShouldSend,
  evidenceWebhookLookup,
  redactDeliveryResponse,
  settleEvidenceAttempt,
} from "../src/lib/scheduled-evidence-report-deliver";
import { parseEvidenceReportBody } from "../src/lib/evidence-report-public-view";

const period = previousJstWeek(new Date("2026-10-26T00:00:00.000Z"));
const opened = evidenceReportPeriodStarting(period.startDate);
assert.equal(opened?.startDate, period.startDate);
assert.equal(opened?.endDateInclusive, period.endDateInclusive);
assert.equal(opened?.start.toISOString(), period.start.toISOString());
assert.equal(opened?.end.toISOString(), period.end.toISOString());
assert.equal(period.start.toISOString(), "2026-10-18T15:00:00.000Z");
assert.equal(period.end.toISOString(), "2026-10-25T15:00:00.000Z");
assert.equal(period.startDate, "2026-10-19");
assert.deepEqual(
  parseEvidenceReportRecipientEmails("Ops@Agency.com\nowner@example.com, ops@agency.com", "owner@example.com"),
  ["ops@agency.com"],
);
assert.equal(parseEvidenceReportRecipientEmails("not-an-email", null), null);
assert.equal(parseEvidenceReportRecipientEmails(Array.from({ length: 11 }, (_, index) => `a${index}@agency.com`).join("\n")), null);
assert.deepEqual(evidenceReportRecipientEmails(["ops@agency.com"]), ["ops@agency.com"]);
assert.deepEqual(evidenceReportRecipientEmails(["not-an-email"]), []);
assert.equal(period.endDateInclusive, "2026-10-25");

function fact(patch: Partial<EvidenceReportObservationFact>): EvidenceReportObservationFact {
  return {
    id: "obs-1",
    url: "https://example.com/",
    regionValue: "US-TX",
    regionLabel: "US · Texas",
    capturedAt: "2026-10-20T00:00:00.000Z",
    status: "success",
    fullPageRequested: true,
    viewport: { width: 1440, height: 900, source: "requested_environment" },
    deviceClass: "desktop",
    behavior: null,
    ...patch,
  };
}

const prior = fact({
  id: "obs-0",
  capturedAt: "2026-10-13T00:00:00.000Z",
  snapshotSha256: "a".repeat(64),
});
const current = fact({
  snapshotSha256: "b".repeat(64),
  geo: { country: "us", state: null, proxy_mode: "browserless_residential" },
  regionInput: "US-TX",
  behavior: [
    { type: "menu", status: "working" },
    { type: "modal", status: "working" },
    { type: "hover", status: "not_measured" },
    { type: "tabs", status: "not_detected" },
    { type: "tooltip", status: "not_detected" },
  ],
});
const scopeMismatch = fact({
  id: "obs-scope",
  capturedAt: "2026-10-21T00:00:00.000Z",
  snapshotSha256: "d".repeat(64),
  fullPageRequested: false,
  behavior: [{ type: "scroll", status: "no_change_observed" }],
});
const california = fact({
  id: "obs-ca",
  regionValue: "US-CA",
  regionLabel: "US · California",
  snapshotSha256: "c".repeat(64),
  behavior: null,
});

const report = buildWeeklyEvidenceReport({
  period,
  observations: [current, california, scopeMismatch],
  priorObservations: [prior],
  journeys: [
    {
      id: "journey-1",
      name: "Checkout",
      region: "US-TX",
      deviceClass: "desktop",
      status: "failed",
      alert: "Step: Checkout",
    },
    {
      id: "journey-1",
      name: "Checkout",
      region: "US-TX",
      deviceClass: "desktop",
      status: "passed",
      alert: null,
    },
    {
      id: "journey-1",
      name: "Checkout",
      region: "US-TX",
      deviceClass: "desktop",
      status: "passed",
      alert: null,
    },
  ],
  origin: "https://viewtrace.net",
  publicUrl: "https://viewtrace.net/evidence-report/abc",
});

assert.match(report.subject, /Evidence Report 2026-10-19 — 2026-10-25/);
assert.match(report.text, /Observations: 3/);
assert.match(report.text, /Journey: Passed 2 \/ Failed 1/);
assert.match(report.text, /Screenshot Changed: 1/);
assert.match(report.text, /Screenshot: Changed（screenshot content differs）/);
assert.match(report.text, /Working: Menu, Modal/);
assert.match(report.text, /Not detected: Tabs, Tooltip/);
assert.match(report.text, /Screenshot: Not comparable — 撮影範囲が違う/);
assert.match(report.text, /No rendered state change observed: Scroll/);
assert.match(report.text, /指定: US · Texas/);
assert.match(report.text, /実際の取得: 米国/);
assert.match(report.text, /州単位の確認: 確認できていない/);
assert.match(report.text, /州の出口を確認していない Journey は、その州の測定ではありません。/);
assert.match(report.text, /Desktop: Passed 2 \/ Failed 1/);
assert.match(report.text, /- Step: Checkout/);
assert.match(report.text, /https:\/\/viewtrace\.net\/evidence-report\/abc/);
assert.match(report.text, /ログインなしで開けます。/);
assert.doesNotMatch(report.text, /ほか \d+ 件はこの週の件数に含まれています。/);
assert.doesNotMatch(report.text, /\/dashboard\//);
assert.doesNotMatch(report.text, /Menu: Working|Modal: Working|Not measured/);
assert.doesNotMatch(report.text, /obs-ca/);
assert.doesNotMatch(report.text, /Journey: Checkout|Status: failed/);
assert.doesNotMatch(report.text, /Page changed/);
assert.doesNotMatch(report.text, /失敗: 0|failed: 0|0 failed|Failed 0|失敗 0/);

const emptyBehavior = buildWeeklyEvidenceReport({
  period,
  observations: [california],
  priorObservations: [],
  journeys: [],
  origin: "https://viewtrace.net",
});
assert.doesNotMatch(emptyBehavior.text, /Not measured|Working|Execution error|失敗: 0|Failed 0/);
assert.match(emptyBehavior.text, /example\.com/);
assert.match(emptyBehavior.text, /Screenshot: Not comparable — 前回の同じ URL × 地域がない/);
assert.doesNotMatch(emptyBehavior.text, /ほか \d+ 件はこの週の件数に含まれています。/);
assert.doesNotMatch(emptyBehavior.text, /\/dashboard\//);

const repeatedWorking = buildWeeklyEvidenceReport({
  period,
  observations: [
    fact({
      id: "w1",
      capturedAt: "2026-10-20T00:00:00.000Z",
      snapshotSha256: "a".repeat(64),
      behavior: [{ type: "scroll", status: "working" }],
    }),
    fact({
      id: "w2",
      capturedAt: "2026-10-22T00:00:00.000Z",
      snapshotSha256: "a".repeat(64),
      behavior: [
        { type: "scroll", status: "working" },
        { type: "menu", status: "not_detected" },
      ],
    }),
  ],
  priorObservations: [fact({ id: "w0", capturedAt: "2026-10-13T00:00:00.000Z", snapshotSha256: "a".repeat(64) })],
  journeys: [],
  origin: "https://viewtrace.net",
});
assert.doesNotMatch(repeatedWorking.text, /\/dashboard\/observations\/w2/);
assert.doesNotMatch(repeatedWorking.text, /\/dashboard\/observations\/w1/);
assert.match(repeatedWorking.text, /Working: Scroll/);
assert.match(repeatedWorking.text, /Not detected: Menu × 1/);
assert.match(repeatedWorking.text, /Screenshot: Same × 2/);
assert.equal(repeatedWorking.text.split("example.com").length - 1, 1);
const repeatedView = parseEvidenceReportBody(repeatedWorking.text);
assert.equal(repeatedView.records[0]?.pages.length, 1);
assert.match(repeatedView.records[0]?.pages[0]?.facts.join("\n") ?? "", /Screenshot: Same × 2/);
const repeatedMail = [
  "Viewtrace Evidence Report",
  "2026-10-12 — 2026-10-18 JST",
  "Observations: 3",
  "Screenshot Changed: 2",
  "Screenshot Same: 1",
  "",
  "## 主な記録",
  "",
  "US-WA",
  "実際の取得: 米国。州単位の確認はできていません。",
  "ipinfo.io",
  "2026-10-14 08:01 JST",
  "Screenshot: Changed（screenshot content differs）",
  "ipinfo.io",
  "2026-10-15 09:01 JST",
  "Screenshot: Changed（screenshot content differs）",
  "ipinfo.io",
  "2026-10-18 09:01 JST",
  "Screenshot: Changed（screenshot content differs）",
  "ipinfo.io",
  "2026-10-16 08:01 JST",
  "Screenshot: Same",
  "",
  "## このレポート",
  "ログインなしで開けます。",
  "http://localhost:3000/evidence-report/abc",
].join("\n");
const mailed = parseEvidenceReportBody(repeatedMail);
assert.equal(mailed.counts.find((item) => item.label === "Observations")?.value, "3");
assert.equal(mailed.records[0]?.pages.filter((page) => page.name === "ipinfo.io").length, 2);
assert.match(mailed.records[0]?.pages[0]?.facts.join("\n") ?? "", /× 3/);
assert.match(mailed.records[0]?.pages[0]?.facts.join("\n") ?? "", /2026-10-14 08:01 — 2026-10-18 09:01 JST/);
assert.equal(mailed.sections.length, 0);
assert.doesNotMatch(repeatedWorking.text, /ほか \d+ 件はこの週の件数に含まれています。/);
assert.doesNotMatch(repeatedWorking.text, /\/dashboard\//);

const withDetail = buildWeeklyEvidenceReport({
  period,
  observations: [
    fact({
      id: "detail-1",
      url: "https://ipinfo.io/",
      regionValue: "US-WA",
      regionLabel: "US · Washington",
      capturedAt: "2026-10-20T00:01:00.000Z",
      snapshotSha256: "e".repeat(64),
      detailUrl: "https://viewtrace.net/verify/abc123",
    }),
  ],
  priorObservations: [
    fact({
      id: "detail-0",
      url: "https://ipinfo.io/",
      regionValue: "US-WA",
      regionLabel: "US · Washington",
      capturedAt: "2026-10-13T00:00:00.000Z",
      snapshotSha256: "e".repeat(64),
    }),
  ],
  journeys: [],
  origin: "https://viewtrace.net",
});
assert.match(withDetail.text, /## 各記録/);
assert.match(withDetail.text, /各 Observation の詳細です。ログインは不要です。/);
assert.match(withDetail.text, /https:\/\/viewtrace\.net\/verify\/abc123/);
assert.match(withDetail.text, /Screenshot: Same/);
assert.doesNotMatch(withDetail.text, /\/dashboard\//);
const detailView = parseEvidenceReportBody(withDetail.text);
assert.equal(detailView.sections.find((section) => section.heading === "各記録"), undefined);
assert.match(detailView.records[0]?.pages[0]?.facts.join("\n") ?? "", /Screenshot: Same/);

assert.equal(normalizeSlackIncomingWebhookUrl("https://hooks.slack.com/services/T/B/x"), "https://hooks.slack.com/services/T/B/x");
assert.equal(normalizeSlackIncomingWebhookUrl("https://example.com/hook"), null);
assert.deepEqual(slackEvidencePayload("hello"), { text: "hello" });
assert.equal(
  normalizeTeamsWebhookUrl("https://outlook.office.com/webhook/abc"),
  "https://outlook.office.com/webhook/abc",
);
assert.equal(normalizeTeamsWebhookUrl("https://example.com/hook"), null);
assert.equal(teamsEvidencePayload("https://outlook.office.com/webhook/abc", "Subject", "Body")["@type"], "MessageCard");
assert.equal(
  (teamsEvidencePayload("https://prod.logic.azure.com/workflows/abc", "Subject", "Body").type as string),
  "message",
);
assert.equal(normalizePagerDutyRoutingKey("a".repeat(32)), "a".repeat(32));
assert.equal(normalizePagerDutyRoutingKey("short"), null);
const pager = pagerDutyEvidencePayload({
  routingKey: "a".repeat(32),
  subject: "Viewtrace: Evidence Report",
  text: "facts",
  dedupKey: "viewtrace-evidence-report-2026-10-19",
});
assert.equal(pager.url, "https://events.pagerduty.com/v2/enqueue");
assert.equal((pager.body.payload as { severity: string }).severity, "info");
assert.equal(normalizeOtherWebhookUrl("https://example.com/hooks/viewtrace"), "https://example.com/hooks/viewtrace");
assert.equal(normalizeOtherWebhookUrl("https://hooks.slack.com/services/T/B/x"), null);
assert.equal(normalizeOtherWebhookUrl("https://127.0.0.1/hook"), null);
assert.equal(normalizeOtherWebhookUrl("https://localhost/hook"), null);
assert.equal(normalizeOtherWebhookUrl("https://10.1.2.3/hook"), null);
assert.equal(normalizeOtherWebhookUrl("https://169.254.169.254/latest"), null);
assert.equal(normalizeOtherWebhookUrl("https://metadata.google.internal/computeMetadata/v1/"), null);
assert.equal(normalizeOtherWebhookUrl("https://2130706433/latest"), null);
assert.equal(normalizeOtherWebhookUrl("https://user:pass@example.com/hook"), null);
assert.equal(normalizeOtherWebhookUrl("http://example.com/hook"), null);
assert.equal(isBlockedEvidenceWebhookHost("0177.0.0.1"), true);
assert.equal(otherWebhookEvidencePayload("Subject", "facts").source, "viewtrace.evidence_report");

const slackSecret = "https://hooks.slack.com/services/T000/B000/secretvalue";
const teamsSecret = "https://outlook.office.com/webhook/secretvalue";
const pagerSecret = `${"a".repeat(28)}1234`;
const otherSecret = "https://example.com/hooks/secretvalue";
assert.equal(maskEvidenceWebhookUrl(slackSecret), "hooks.slack.com/••••••••");
assert.equal(maskEvidenceWebhookUrl(teamsSecret), "outlook.office.com/••••••••");
assert.equal(maskEvidenceWebhookUrl(otherSecret), "example.com/••••••••");
assert.equal(maskPagerDutyRoutingKey(pagerSecret), `${"•".repeat(16)}1234`);
assert.equal(maskEvidenceWebhookUrl(slackSecret)?.includes("secretvalue"), false);
assert.equal(redactDeliveryResponse(`accepted ${pagerSecret}`, [pagerSecret]).includes(pagerSecret), false);
assert.equal(redactDeliveryResponse(`see ${otherSecret}`, [otherSecret]).includes("secretvalue"), false);
assert.equal(redactDeliveryResponse("x".repeat(EVIDENCE_PROVIDER_RESPONSE_LIMIT + 40), []).length, EVIDENCE_PROVIDER_RESPONSE_LIMIT);
assert.equal(evidenceChannelShouldSend([]), true);
assert.equal(evidenceChannelShouldSend([{ outcome: "accepted" }]), false);
assert.equal(evidenceChannelShouldSend([{ outcome: "failed" }]), false);
assert.equal(evidenceChannelShouldSend([{ outcome: "blocked" }]), false);
assert.equal(evidenceChannelShouldSend([{ outcome: "pending" }]), true);
assert.equal(evidenceChannelShouldSend([{ outcome: "pending" }, { outcome: "pending" }]), false);
assert.equal(
  settleEvidenceAttempt(1, {
    channel: "slack",
    outcome: "pending",
    httpStatus: 503,
    providerResponse: null,
    attemptedAt: "2026-10-26T00:00:00.000Z",
    acceptedAt: null,
  }).outcome,
  "failed",
);

const calls: string[] = [];
const publicResolve = async (hostname: string) => {
  if (hostname === "evil.example") return ["169.254.169.254"];
  if (hostname === "hooks.slack.com") return ["1.2.3.4"];
  if (hostname === "outlook.office.com") return ["1.2.3.5"];
  if (hostname === "events.pagerduty.com") return ["1.2.3.6"];
  if (hostname === "example.com") return ["93.184.216.34"];
  return ["127.0.0.1"];
};
async function runDeliveryTest(): Promise<void> {
const attempts = await deliverEvidenceReportChannels({
  subject: "Viewtrace: Evidence Report",
  text: "facts",
  email: { to: ["owner@example.com", "ops@agency.com"], configured: true },
  slackUrl: slackSecret,
  teamsUrl: teamsSecret,
  pagerDutyKey: pagerSecret,
  otherUrl: otherSecret,
  dedupKey: "viewtrace-evidence-report-2026-10-19",
  resolveHost: publicResolve,
  retryDelayMs: 0,
  sendEmail: async (to) => {
    assert.deepEqual(to, ["owner@example.com", "ops@agency.com"]);
    return { ok: true, httpStatus: 202, providerResponse: "email-id" };
  },
  fetchImpl: async (url, body) => {
    calls.push(new URL(url).hostname);
    const payload = JSON.stringify(body);
    if (url.includes("events.pagerduty.com")) {
      return { status: 400, body: `invalid key ${pagerSecret}` };
    }
    if (url.includes("outlook.office.com")) return { status: 302, body: "go" };
    assert.equal(payload.includes(pagerSecret), false);
    return { status: 200, body: "ok" };
  },
});
const byChannel = Object.fromEntries(attempts.map((item) => [item.channel, item]));
assert.equal(byChannel.email?.outcome, "accepted");
assert.equal(byChannel.email?.httpStatus, 202);
assert.ok(byChannel.email?.acceptedAt);
assert.equal(byChannel.slack?.outcome, "accepted");
assert.equal(byChannel.slack?.httpStatus, 200);
assert.ok(byChannel.slack?.acceptedAt);
assert.equal(byChannel.teams?.outcome, "failed");
assert.equal(byChannel.teams?.httpStatus, 302);
assert.equal(byChannel.teams?.providerResponse, "redirect_not_followed");
assert.equal(byChannel.teams?.acceptedAt, null);
assert.equal(byChannel.pagerduty?.outcome, "failed");
assert.equal(byChannel.pagerduty?.httpStatus, 400);
assert.equal(byChannel.pagerduty?.providerResponse?.includes(pagerSecret), false);
assert.equal(byChannel.pagerduty?.providerResponse?.includes("[redacted]"), true);
assert.equal(byChannel.webhook?.outcome, "accepted");
assert.equal(byChannel.webhook?.httpStatus, 200);
assert.ok(byChannel.webhook?.acceptedAt);
assert.deepEqual(calls, ["hooks.slack.com", "outlook.office.com", "events.pagerduty.com", "example.com"]);

const blockedCalls: string[] = [];
const blocked = await deliverEvidenceReportChannels({
  subject: "Viewtrace: Evidence Report",
  text: "facts",
  otherUrl: "https://evil.example/hook",
  dedupKey: "viewtrace-evidence-report-2026-10-19",
  resolveHost: publicResolve,
  fetchImpl: async (url) => {
    blockedCalls.push(url);
    return { status: 200, body: "should-not-send" };
  },
});
assert.equal(blocked[0]?.outcome, "blocked");
assert.equal(blocked[0]?.providerResponse, "blocked");
assert.equal(blocked[0]?.acceptedAt, null);
assert.deepEqual(blockedCalls, []);

let slackTries = 0;
const retried = await deliverEvidenceReportChannels({
  subject: "Viewtrace: Evidence Report",
  text: "facts",
  slackUrl: slackSecret,
  dedupKey: "viewtrace-evidence-report-2026-10-19",
  resolveHost: publicResolve,
  retryDelayMs: 0,
  fetchImpl: async () => {
    slackTries += 1;
    return slackTries < 3 ? { status: 503, body: "later" } : { status: 200, body: "ok" };
  },
});
assert.equal(slackTries, 3);
assert.equal(retried[0]?.outcome, "accepted");

let clientErrors = 0;
const notRetried = await deliverEvidenceReportChannels({
  subject: "Viewtrace: Evidence Report",
  text: "facts",
  slackUrl: slackSecret,
  dedupKey: "viewtrace-evidence-report-2026-10-19",
  resolveHost: publicResolve,
  retryDelayMs: 0,
  fetchImpl: async () => {
    clientErrors += 1;
    return { status: 400, body: "no" };
  },
});
assert.equal(clientErrors, 1);
assert.equal(notRetried[0]?.outcome, "failed");

let exhausted = 0;
const stillPending = await deliverEvidenceReportChannels({
  subject: "Viewtrace: Evidence Report",
  text: "facts",
  slackUrl: slackSecret,
  dedupKey: "viewtrace-evidence-report-2026-10-19",
  resolveHost: publicResolve,
  retryDelayMs: 0,
  fetchImpl: async () => {
    exhausted += 1;
    return { status: 429, body: "slow" };
  },
});
assert.equal(exhausted, 3);
assert.equal(stillPending[0]?.outcome, "pending");
assert.equal(stillPending[0]?.acceptedAt, null);
assert.equal(normalizeOtherWebhookUrl("https://127.0.0.1/hook"), null);

const lookupResult: { code?: string } = {};
evidenceWebhookLookup("127.0.0.1")("example.com", {}, (error) => {
  lookupResult.code = error?.code;
});
assert.equal(lookupResult.code, "EBLOCKED");
let pinned = "";
evidenceWebhookLookup("93.184.216.34")("example.com", {}, (_error, address) => {
  pinned = address;
});
assert.equal(pinned, "93.184.216.34");
}

runDeliveryTest()
  .then(() => {
    console.log("scheduled evidence report ok");
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
