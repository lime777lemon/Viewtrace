import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildEvidenceReportShareUrl,
  generateEvidenceReportShareToken,
  insertEvidenceReportShare,
} from "@/lib/evidence-report-share";
import { parseStoredScroll } from "@/lib/observation-optional-metrics-store";
import { INTERACTION_CHECK_TYPES, type InteractionCheckType } from "@/lib/observation-regional-interaction";
import type { ScrollInteractionStatus } from "@/lib/observation-scroll-interaction";
import { sendResendEmail, isResendConfigured } from "@/lib/resend";
import { getAppOriginForEmailLinks } from "@/lib/site";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  deliverEvidenceReportChannels,
  evidenceChannelShouldSend,
  settleEvidenceAttempt,
  type EvidenceDeliveryAttempt,
  type EvidenceDeliveryChannel,
} from "@/lib/scheduled-evidence-report-deliver";
import {
  buildWeeklyEvidenceReport,
  evidenceReportRecipientEmails,
  normalizeOtherWebhookUrl,
  normalizeSlackIncomingWebhookUrl,
  normalizeTeamsWebhookUrl,
  previousJstWeek,
  type EvidenceReportPeriod,
  type EvidenceReportBehaviorFact,
  type EvidenceReportJourneyFact,
  type EvidenceReportObservationFact,
} from "@/lib/scheduled-evidence-report";

const LOOKBACK_MS = 70 * 24 * 60 * 60 * 1000;
const PAGE = 1000;
const TYPE_SET = new Set<string>(INTERACTION_CHECK_TYPES);

type DeliveryRow = {
  email_accepted_at: string | null;
  slack_accepted_at: string | null;
  teams_accepted_at: string | null;
  pagerduty_accepted_at: string | null;
  webhook_accepted_at: string | null;
};

export type EvidenceReportRunResult = {
  ok: boolean;
  periodStart: string;
  users: number;
  emailed: number;
  slacked: number;
  teams: number;
  pagerduty: number;
  webhooks: number;
  skipped: number;
  error?: string;
};

function missingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || /evidence_report_/i.test(error.message ?? "");
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function boolOrNull(value: unknown): boolean | null {
  if (value === true || value === false) return value;
  return null;
}

function observationFromRow(row: Record<string, unknown>): EvidenceReportObservationFact | null {
  const id = text(row.id);
  const capturedAt = text(row.captured_at);
  if (!id || !capturedAt) return null;
  const statusRaw = text(row.status);
  const status = statusRaw === "success" || statusRaw === "failure" || statusRaw === "pending" ? statusRaw : "pending";
  const viewport = row.viewport && typeof row.viewport === "object" ? (row.viewport as Record<string, unknown>) : null;
  const geo = row.geo && typeof row.geo === "object" ? (row.geo as Record<string, unknown>) : null;
  const device = text(row.device_class);
  return {
    id,
    url: text(row.url),
    regionValue: text(row.region),
    regionLabel: text(row.region_label) || text(row.region),
    capturedAt,
    status,
    snapshotSha256: text(row.snapshot_sha256) || undefined,
    snapshotPhash: text(row.snapshot_phash) || undefined,
    snapshotImageUrl: text(row.snapshot_image_url) || undefined,
    snapshotPurgedAt: text(row.snapshot_purged_at) || undefined,
    fullPageRequested: boolOrNull(row.full_page_requested),
    deviceClass: device || null,
    viewport: viewport
      ? {
          width: typeof viewport.width === "number" ? viewport.width : null,
          height: typeof viewport.height === "number" ? viewport.height : null,
          source: text(viewport.source) || null,
        }
      : null,
    geo: geo
      ? {
          country: text(geo.country) || null,
          state: text(geo.state) || null,
          proxy_mode: text(geo.proxy_mode) || null,
          state_verified: geo.state_verified === true,
          state_targeting_rejected: geo.state_targeting_rejected === true,
          verified_measurements: Array.isArray(geo.verified_measurements)
            ? geo.verified_measurements.filter((item): item is "screenshot" | "interaction" | "journey" | "lab_cwv" =>
                item === "screenshot" || item === "interaction" || item === "journey" || item === "lab_cwv",
              )
            : [],
          geo_attempts: typeof geo.geo_attempts === "number" ? geo.geo_attempts : null,
        }
      : null,
    regionInput: text(row.region_input) || null,
    behavior: null,
  };
}

function behaviorFromNotes(notes: unknown): EvidenceReportBehaviorFact[] | null {
  const stored = parseStoredScroll(notes);
  if (!stored) return null;
  const rows: EvidenceReportBehaviorFact[] = [];
  for (const typeRow of stored.result.types) {
    if (!TYPE_SET.has(typeRow.type)) continue;
    rows.push({
      type: typeRow.type as InteractionCheckType,
      status: typeRow.status as ScrollInteractionStatus,
    });
  }
  return rows;
}

async function listUserIds(admin: SupabaseClient, startIso: string, endIso: string): Promise<string[]> {
  const ids = new Set<string>();
  for (let from = 0; from < 8000; from += PAGE) {
    const { data, error } = await admin
      .from("observations")
      .select("user_id")
      .gte("captured_at", startIso)
      .lt("captured_at", endIso)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = data ?? [];
    for (const row of rows) {
      const id = text((row as { user_id?: unknown }).user_id);
      if (id) ids.add(id);
    }
    if (rows.length < PAGE) break;
  }
  return [...ids];
}

const OBSERVATION_SELECT =
  "id,url,region,region_label,status,captured_at,snapshot_sha256,snapshot_phash,snapshot_image_url,snapshot_purged_at,full_page_requested:capture_conditions->full_page_requested,viewport:capture_conditions->viewport,device_class:capture_conditions->device_class,geo:capture_conditions->geo,region_input:capture_conditions->region_input";

async function loadObservations(
  admin: SupabaseClient,
  userId: string,
  fromIso: string,
  endIso: string,
): Promise<EvidenceReportObservationFact[]> {
  const facts: EvidenceReportObservationFact[] = [];
  for (let from = 0; from < 4000; from += PAGE) {
    const { data, error } = await admin
      .from("observations")
      .select(OBSERVATION_SELECT)
      .eq("user_id", userId)
      .gte("captured_at", fromIso)
      .lt("captured_at", endIso)
      .order("captured_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    for (const row of rows) {
      const fact = observationFromRow(row);
      if (fact) facts.push(fact);
    }
    if (rows.length < PAGE) break;
  }
  return facts;
}

async function attachBehavior(
  admin: SupabaseClient,
  userId: string,
  facts: EvidenceReportObservationFact[],
): Promise<void> {
  const ids = facts.map((fact) => fact.id);
  for (let index = 0; index < ids.length; index += 100) {
    const slice = ids.slice(index, index + 100);
    const { data, error } = await admin
      .from("ai_analyses")
      .select("observation_id, notes")
      .eq("user_id", userId)
      .eq("analysis_type", "scroll_interaction")
      .in("observation_id", slice);
    if (error) {
      if (missingTable(error)) return;
      throw error;
    }
    const byId = new Map<string, EvidenceReportBehaviorFact[] | null>();
    for (const row of data ?? []) {
      const observationId = text((row as { observation_id?: unknown }).observation_id);
      byId.set(observationId, behaviorFromNotes((row as { notes?: unknown }).notes));
    }
    for (const fact of facts) {
      if (byId.has(fact.id)) fact.behavior = byId.get(fact.id) ?? null;
    }
  }
}

async function loadJourneys(
  admin: SupabaseClient,
  userId: string,
  startIso: string,
  endIso: string,
): Promise<EvidenceReportJourneyFact[]> {
  const { data, error } = await admin
    .from("journey_runs")
    .select("region, device_class, status, alert, journey_id, environment")
    .eq("user_id", userId)
    .gte("created_at", startIso)
    .lt("created_at", endIso);
  if (error) {
    if (missingTable(error)) return [];
    throw error;
  }
  const rows = (data ?? []) as {
    region?: unknown;
    device_class?: unknown;
    status?: unknown;
    alert?: unknown;
    journey_id?: unknown;
    environment?: unknown;
  }[];
  const journeyIds = [...new Set(rows.map((row) => text(row.journey_id)).filter(Boolean))];
  const names = new Map<string, string>();
  if (journeyIds.length > 0) {
    const named = await admin.from("journey_definitions").select("id, name").in("id", journeyIds);
    if (!named.error) {
      for (const row of named.data ?? []) {
        const id = text((row as { id?: unknown }).id);
        const name = text((row as { name?: unknown }).name);
        if (id && name) names.set(id, name);
      }
    }
  }
  return rows.map((row) => ({
    id: text(row.journey_id) || undefined,
    name: names.get(text(row.journey_id)) || "Journey",
    region: text(row.region),
    deviceClass: text(row.device_class),
    status: text(row.status) || "incomplete",
    alert: text(row.alert) || null,
    stateVerified: journeyStateVerified(row.environment),
  }));
}

function journeyStateVerified(environment: unknown): boolean {
  if (!environment || typeof environment !== "object") return false;
  const geo = (environment as { geo?: { state_verified?: unknown } }).geo;
  return geo?.state_verified === true;
}

async function loadStateCoverage(
  admin: SupabaseClient,
  userId: string,
  weekStart: string,
): Promise<Array<{ regionValue: string; status: "pending" | "verified" | "exhausted"; verifiedAt: string | null; attemptCount: number }>> {
  const { data, error } = await admin
    .from("state_coverage")
    .select("region_value, status, last_attempt_at, attempt_count")
    .eq("user_id", userId)
    .eq("week_start", weekStart);
  if (error) return [];
  return (data ?? []).flatMap((raw) => {
    const row = raw as { region_value?: unknown; status?: unknown; last_attempt_at?: unknown; attempt_count?: unknown };
    const regionValue = text(row.region_value);
    const status = row.status === "verified" || row.status === "exhausted" || row.status === "pending" ? row.status : null;
    if (!regionValue || !status) return [];
    return [{
      regionValue,
      status,
      verifiedAt: status === "verified" ? text(row.last_attempt_at) || null : null,
      attemptCount: typeof row.attempt_count === "number" ? row.attempt_count : 0,
    }];
  });
}

export async function composeWeeklyEvidenceReportForUser(
  admin: SupabaseClient,
  userId: string,
  period: EvidenceReportPeriod,
  origin: string,
  publicUrl?: string | null,
): Promise<{ subject: string; text: string; html: string; observationCount: number }> {
  const lookback = new Date(period.start.getTime() - LOOKBACK_MS).toISOString();
  const history = await loadObservations(admin, userId, lookback, period.end.toISOString());
  const observations = history.filter((fact) => fact.capturedAt >= period.start.toISOString());
  await attachBehavior(admin, userId, observations);
  const journeys = await loadJourneys(admin, userId, period.start.toISOString(), period.end.toISOString());
  const report = buildWeeklyEvidenceReport({
    period,
    observations,
    priorObservations: history.filter((fact) => fact.capturedAt < period.start.toISOString()),
    journeys,
    stateCoverage: await loadStateCoverage(admin, userId, period.startDate),
    origin,
    publicUrl,
  });
  const html = `<pre style="font-family:ui-sans-serif,system-ui,sans-serif;white-space:pre-wrap">${escapeHtml(report.text)}</pre>`;
  return { subject: report.subject, text: report.text, html, observationCount: observations.length };
}

export async function runScheduledEvidenceReports(now = new Date()): Promise<EvidenceReportRunResult> {
  const period = previousJstWeek(now);
  const result: EvidenceReportRunResult = {
    ok: true,
    periodStart: period.startDate,
    users: 0,
    emailed: 0,
    slacked: 0,
    teams: 0,
    pagerduty: 0,
    webhooks: 0,
    skipped: 0,
  };
  const admin = createSupabaseAdminClient();
  if (!admin) return { ...result, ok: false, error: "supabase_admin_not_configured" };

  let userIds: string[];
  try {
    userIds = await listUserIds(admin, period.start.toISOString(), period.end.toISOString());
  } catch (error) {
    const message = error instanceof Error ? error.message : "observations_query_failed";
    return { ...result, ok: false, error: message };
  }
  result.users = userIds.length;
  const origin = getAppOriginForEmailLinks();

  for (const userId of userIds) {
    const { data: settings, error: settingsError } = await admin
      .from("evidence_report_settings")
      .select("email_enabled, email_recipients, slack_webhook_url, teams_webhook_url, other_webhook_url")
      .eq("user_id", userId)
      .maybeSingle();
    if (settingsError && !missingTable(settingsError)) {
      console.warn("[evidence-report] settings read failed", { userId, error: settingsError.message });
      result.skipped += 1;
      continue;
    }
    const emailEnabled = settings?.email_enabled !== false;
    const slackUrl = normalizeSlackIncomingWebhookUrl(
      typeof settings?.slack_webhook_url === "string" ? settings.slack_webhook_url : null,
    );
    const teamsUrl = normalizeTeamsWebhookUrl(
      typeof settings?.teams_webhook_url === "string" ? settings.teams_webhook_url : null,
    );
    const otherUrl = normalizeOtherWebhookUrl(
      typeof settings?.other_webhook_url === "string" ? settings.other_webhook_url : null,
    );
    if (!emailEnabled && !slackUrl && !teamsUrl && !otherUrl) {
      result.skipped += 1;
      continue;
    }

    const { data: delivery, error: deliveryError } = await admin
      .from("evidence_report_deliveries")
      .select("email_accepted_at, slack_accepted_at, teams_accepted_at, pagerduty_accepted_at, webhook_accepted_at")
      .eq("user_id", userId)
      .eq("period_start", period.startDate)
      .maybeSingle();
    if (deliveryError) {
      if (missingTable(deliveryError)) return { ...result, ok: false, error: "evidence_report_deliveries_missing" };
      console.warn("[evidence-report] delivery read failed", { userId, error: deliveryError.message });
      result.skipped += 1;
      continue;
    }
    const acceptedRow = (delivery ?? null) as DeliveryRow | null;
    const { data: priorAttempts, error: priorError } = await admin
      .from("evidence_report_delivery_attempts")
      .select("channel, outcome")
      .eq("user_id", userId)
      .eq("period_start", period.startDate);
    if (priorError && !missingTable(priorError)) {
      console.warn("[evidence-report] attempt read failed", { userId, code: priorError.code });
      result.skipped += 1;
      continue;
    }
    const prior = (priorAttempts ?? []) as Array<{ channel: string; outcome: string }>;
    const priorFor = (channel: EvidenceDeliveryChannel) => prior.filter((row) => row.channel === channel);
    const pendingCount = (channel: EvidenceDeliveryChannel) =>
      priorFor(channel).filter((row) => row.outcome === "pending").length;
    const needEmail = emailEnabled && !acceptedRow?.email_accepted_at && evidenceChannelShouldSend(priorFor("email"));
    const needSlack = Boolean(slackUrl) && !acceptedRow?.slack_accepted_at && evidenceChannelShouldSend(priorFor("slack"));
    const needTeams = Boolean(teamsUrl) && !acceptedRow?.teams_accepted_at && evidenceChannelShouldSend(priorFor("teams"));
    const needWebhook = Boolean(otherUrl) && !acceptedRow?.webhook_accepted_at && evidenceChannelShouldSend(priorFor("webhook"));
    if (!needEmail && !needSlack && !needTeams && !needWebhook) {
      result.skipped += 1;
      continue;
    }

    try {
      const shareToken = generateEvidenceReportShareToken();
      const publicUrl = buildEvidenceReportShareUrl(origin, shareToken);
      const report = await composeWeeklyEvidenceReportForUser(admin, userId, period, origin, publicUrl);
      if (report.observationCount === 0) {
        result.skipped += 1;
        continue;
      }
      const published = await insertEvidenceReportShare(admin, {
        token: shareToken,
        userId,
        periodStart: period.startDate,
        subject: report.subject,
        body: report.text,
      });
      if (!published) {
        console.warn("[evidence-report] public share was not saved", { userId });
        result.skipped += 1;
        continue;
      }
      const html = report.html;

      let emailTo: string[] = [];
      if (needEmail && isResendConfigured()) {
        const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
        const account = userError ? "" : userData.user?.email?.trim().toLowerCase() || "";
        const extras = evidenceReportRecipientEmails(settings?.email_recipients);
        emailTo = [...new Set([account, ...extras].filter(Boolean))];
      }
      const attempts = await deliverEvidenceReportChannels({
        subject: report.subject,
        text: report.text,
        email: needEmail ? { to: emailTo, configured: isResendConfigured() } : null,
        slackUrl: needSlack ? slackUrl : null,
        teamsUrl: needTeams ? teamsUrl : null,
        otherUrl: needWebhook ? otherUrl : null,
        dedupKey: `viewtrace-evidence-report-${period.startDate}`,
        sendEmail: async (to) => {
          const sentMail = await sendResendEmail({
            to,
            subject: report.subject,
            text: report.text,
            html,
            tags: [{ name: "type", value: "evidence_report" }],
          });
          return {
            ok: sentMail.ok,
            httpStatus: sentMail.status,
            providerResponse: sentMail.ok ? sentMail.id : sentMail.error,
          };
        },
      });
      for (const raw of attempts) {
        const item = settleEvidenceAttempt(pendingCount(raw.channel), raw);
        await recordAttempt(admin, userId, period.startDate, item);
        if (item.outcome !== "accepted" || !item.acceptedAt) {
          console.warn("[evidence-report] channel not accepted", {
            userId,
            channel: item.channel,
            outcome: item.outcome,
            httpStatus: item.httpStatus,
          });
          continue;
        }
        if (item.channel === "email") {
          result.emailed += 1;
          await markDelivery(admin, userId, period.startDate, { email_accepted_at: item.acceptedAt });
        } else if (item.channel === "slack") {
          result.slacked += 1;
          await markDelivery(admin, userId, period.startDate, { slack_accepted_at: item.acceptedAt });
        } else if (item.channel === "teams") {
          result.teams += 1;
          await markDelivery(admin, userId, period.startDate, { teams_accepted_at: item.acceptedAt });
        } else if (item.channel === "webhook") {
          result.webhooks += 1;
          await markDelivery(admin, userId, period.startDate, { webhook_accepted_at: item.acceptedAt });
        }
      }
    } catch (error) {
      console.warn("[evidence-report] user failed", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      result.skipped += 1;
    }
  }

  return result;
}

async function markDelivery(
  admin: SupabaseClient,
  userId: string,
  periodStart: string,
  patch: {
    email_accepted_at?: string;
    slack_accepted_at?: string;
    teams_accepted_at?: string;
    pagerduty_accepted_at?: string;
    webhook_accepted_at?: string;
  },
): Promise<void> {
  const { data: existing } = await admin
    .from("evidence_report_deliveries")
    .select("email_accepted_at, slack_accepted_at, teams_accepted_at, pagerduty_accepted_at, webhook_accepted_at")
    .eq("user_id", userId)
    .eq("period_start", periodStart)
    .maybeSingle();
  const row = (existing ?? {}) as DeliveryRow;
  const { error } = await admin.from("evidence_report_deliveries").upsert({
    user_id: userId,
    period_start: periodStart,
    email_accepted_at: patch.email_accepted_at ?? row.email_accepted_at ?? null,
    slack_accepted_at: patch.slack_accepted_at ?? row.slack_accepted_at ?? null,
    teams_accepted_at: patch.teams_accepted_at ?? row.teams_accepted_at ?? null,
    pagerduty_accepted_at: patch.pagerduty_accepted_at ?? row.pagerduty_accepted_at ?? null,
    webhook_accepted_at: patch.webhook_accepted_at ?? row.webhook_accepted_at ?? null,
  });
  if (error) console.warn("[evidence-report] delivery write failed", { userId, code: error.code });
}

async function recordAttempt(
  admin: SupabaseClient,
  userId: string,
  periodStart: string,
  item: EvidenceDeliveryAttempt,
): Promise<void> {
  const { error } = await admin.from("evidence_report_delivery_attempts").insert({
    user_id: userId,
    period_start: periodStart,
    channel: item.channel,
    outcome: item.outcome,
    http_status: item.httpStatus,
    provider_response: item.providerResponse,
    accepted_at: item.acceptedAt,
    attempted_at: item.attemptedAt,
  });
  if (error) {
    console.warn("[evidence-report] attempt write failed", { userId, channel: item.channel, code: error.code });
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
