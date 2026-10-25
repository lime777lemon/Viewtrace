import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Agent, fetch as undiciFetch } from "undici";
import {
  isBlockedEvidenceWebhookHost,
  normalizeOtherWebhookUrl,
  normalizePagerDutyRoutingKey,
  normalizeSlackIncomingWebhookUrl,
  normalizeTeamsWebhookUrl,
  otherWebhookEvidencePayload,
  pagerDutyEvidencePayload,
  slackEvidencePayload,
  teamsEvidencePayload,
} from "@/lib/scheduled-evidence-report";

/** Stored provider text after redaction. 4KB, not the full body. */
export const EVIDENCE_PROVIDER_RESPONSE_LIMIT = 4096;
/** In-process tries for HTTP 429 and 5xx. Other statuses are not retried. */
export const EVIDENCE_HTTP_TRIES = 3;
/** A later run of the same week may try a pending channel this many extra times. */
export const EVIDENCE_PENDING_RERUNS = 1;
const DELIVERY_TIMEOUT_MS = 15_000;

export type EvidenceDeliveryChannel = "email" | "slack" | "teams" | "pagerduty" | "webhook";

/** accepted: the provider returned 2xx. failed: terminal. blocked: not sent. pending: 429/5xx still retryable. */
export type EvidenceDeliveryOutcome = "pending" | "accepted" | "failed" | "blocked";

export type EvidenceDeliveryAttempt = {
  channel: EvidenceDeliveryChannel;
  outcome: EvidenceDeliveryOutcome;
  httpStatus: number | null;
  providerResponse: string | null;
  attemptedAt: string;
  acceptedAt: string | null;
};

export type EvidenceEmailSendResult = {
  ok: boolean;
  httpStatus: number | null;
  providerResponse: string | null;
};

type ResolveHost = (hostname: string) => Promise<string[]>;

type FetchImpl = (url: string, body: unknown, pinnedAddress: string) => Promise<{ status: number; body: string }>;

export async function defaultResolveEvidenceWebhookHost(hostname: string): Promise<string[]> {
  if (isBlockedEvidenceWebhookHost(hostname)) return [];
  if (isIP(hostname)) return [hostname];
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
}

export function evidenceWebhookLookup(pinnedAddress: string) {
  return (
    hostname: string,
    _options: unknown,
    callback: (error: NodeJS.ErrnoException | null, address: string, family: number) => void,
  ) => {
    if (isBlockedEvidenceWebhookHost(hostname) || isBlockedEvidenceWebhookHost(pinnedAddress)) {
      const error = new Error("blocked") as NodeJS.ErrnoException;
      error.code = "EBLOCKED";
      callback(error, "", 4);
      return;
    }
    callback(null, pinnedAddress, pinnedAddress.includes(":") ? 6 : 4);
  };
}

function secretNeedles(values: Array<string | null | undefined>): string[] {
  const needles: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim() ?? "";
    if (trimmed.length < 8) continue;
    needles.push(trimmed);
    try {
      const url = new URL(trimmed);
      if (url.pathname.length > 1) needles.push(url.pathname);
      if (url.password.length >= 8) needles.push(url.password);
      if (url.search.length > 1) needles.push(url.search.slice(1));
      const encoded = encodeURIComponent(trimmed);
      if (encoded !== trimmed) needles.push(encoded);
    } catch {
      const encoded = encodeURIComponent(trimmed);
      if (encoded !== trimmed) needles.push(encoded);
    }
  }
  return [...new Set(needles)].sort((left, right) => right.length - left.length);
}

export function redactDeliveryResponse(value: string, secrets: Array<string | null | undefined>): string {
  let out = value.replace(/\s+/g, " ").trim();
  for (const secret of secretNeedles(secrets)) {
    out = out.split(secret).join("[redacted]");
  }
  return out.slice(0, EVIDENCE_PROVIDER_RESPONSE_LIMIT);
}

export function evidenceChannelShouldSend(prior: Array<{ outcome: string }>): boolean {
  if (prior.some((row) => row.outcome === "accepted" || row.outcome === "failed" || row.outcome === "blocked")) {
    return false;
  }
  const pending = prior.filter((row) => row.outcome === "pending").length;
  return pending <= EVIDENCE_PENDING_RERUNS;
}

export function settleEvidenceAttempt(priorPending: number, item: EvidenceDeliveryAttempt): EvidenceDeliveryAttempt {
  if (item.outcome === "pending" && priorPending >= EVIDENCE_PENDING_RERUNS) {
    return { ...item, outcome: "failed" };
  }
  return item;
}

function classifyHttp(status: number): "accepted" | "failed" | "pending" {
  if (status >= 200 && status < 300) return "accepted";
  if (status === 429 || status >= 500) return "pending";
  return "failed";
}

function attempt(
  channel: EvidenceDeliveryChannel,
  outcome: EvidenceDeliveryOutcome,
  httpStatus: number | null,
  providerResponse: string | null,
  startedAt: string,
): EvidenceDeliveryAttempt {
  return {
    channel,
    outcome,
    httpStatus,
    providerResponse,
    attemptedAt: startedAt,
    acceptedAt: outcome === "accepted" ? new Date().toISOString() : null,
  };
}

function failed(
  channel: EvidenceDeliveryChannel,
  providerResponse: string,
  startedAt: string,
): EvidenceDeliveryAttempt {
  return attempt(channel, "failed", null, providerResponse, startedAt);
}

function blocked(
  channel: EvidenceDeliveryChannel,
  startedAt: string,
): EvidenceDeliveryAttempt {
  return attempt(channel, "blocked", null, "blocked", startedAt);
}

function wait(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function publicAddress(hostname: string, resolveHost: ResolveHost): Promise<string | null> {
  if (isBlockedEvidenceWebhookHost(hostname)) return null;
  let addresses: string[];
  try {
    addresses = await resolveHost(hostname);
  } catch {
    return null;
  }
  const usable = addresses.map((address) => address.trim()).filter(Boolean);
  if (usable.length === 0 || usable.some((address) => isBlockedEvidenceWebhookHost(address))) return null;
  return usable[0] ?? null;
}

async function readCappedText(body: unknown, cap: number): Promise<string> {
  if (!body || typeof body !== "object" || !("getReader" in body) || typeof body.getReader !== "function") return "";
  const reader = (body as ReadableStream<Uint8Array>).getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < cap) {
    const next = await reader.read();
    if (next.done || !next.value) break;
    const room = cap - total;
    chunks.push(next.value.byteLength > room ? next.value.subarray(0, room) : next.value);
    total += Math.min(next.value.byteLength, room);
  }
  await reader.cancel().catch(() => undefined);
  const merged = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

async function defaultFetch(url: string, body: unknown, pinnedAddress: string): Promise<{ status: number; body: string }> {
  const agent = new Agent({ connect: { lookup: evidenceWebhookLookup(pinnedAddress) } });
  try {
    const response = await undiciFetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      redirect: "manual",
      dispatcher: agent,
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
    });
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      return { status: response.status, body: "" };
    }
    return { status: response.status, body: await readCappedText(response.body, 16 * 1024) };
  } finally {
    await agent.close();
  }
}

async function postChannel(input: {
  channel: EvidenceDeliveryChannel;
  url: string;
  body: unknown;
  secrets: Array<string | null | undefined>;
  resolveHost: ResolveHost;
  fetchImpl: FetchImpl;
  startedAt: string;
  retryDelayMs: number;
}): Promise<EvidenceDeliveryAttempt> {
  let hostname: string;
  try {
    hostname = new URL(input.url).hostname;
  } catch {
    return failed(input.channel, "invalid", input.startedAt);
  }
  const pinned = await publicAddress(hostname, input.resolveHost);
  if (!pinned) return blocked(input.channel, input.startedAt);
  for (let tryIndex = 0; tryIndex < EVIDENCE_HTTP_TRIES; tryIndex += 1) {
    let response: { status: number; body: string };
    try {
      response = await input.fetchImpl(input.url, input.body, pinned);
    } catch {
      return failed(input.channel, "network_error", input.startedAt);
    }
    const kind = classifyHttp(response.status);
    if (kind === "pending" && tryIndex < EVIDENCE_HTTP_TRIES - 1) {
      await wait(input.retryDelayMs);
      continue;
    }
    if (response.status >= 300 && response.status < 400) {
      return attempt(input.channel, "failed", response.status, "redirect_not_followed", input.startedAt);
    }
    const text = redactDeliveryResponse(response.body, input.secrets);
    return attempt(input.channel, kind, response.status, text || null, input.startedAt);
  }
  return failed(input.channel, "network_error", input.startedAt);
}

export async function prepareOtherWebhookUrl(
  raw: string,
  resolveHost: ResolveHost = defaultResolveEvidenceWebhookHost,
): Promise<string | null> {
  const normalized = normalizeOtherWebhookUrl(raw);
  if (!normalized) return null;
  const pinned = await publicAddress(new URL(normalized).hostname, resolveHost);
  return pinned ? normalized : null;
}

export async function deliverEvidenceReportChannels(input: {
  subject: string;
  text: string;
  email?: { to: string | string[] | null; configured: boolean } | null;
  slackUrl?: string | null;
  teamsUrl?: string | null;
  pagerDutyKey?: string | null;
  otherUrl?: string | null;
  dedupKey: string;
  sendEmail?: (to: string[]) => Promise<EvidenceEmailSendResult>;
  resolveHost?: ResolveHost;
  fetchImpl?: FetchImpl;
  retryDelayMs?: number;
}): Promise<EvidenceDeliveryAttempt[]> {
  const resolveHost = input.resolveHost ?? defaultResolveEvidenceWebhookHost;
  const fetchImpl = input.fetchImpl ?? defaultFetch;
  const retryDelayMs = input.retryDelayMs ?? 200;
  const attempts: EvidenceDeliveryAttempt[] = [];
  const slackUrl = normalizeSlackIncomingWebhookUrl(input.slackUrl);
  const teamsUrl = normalizeTeamsWebhookUrl(input.teamsUrl);
  const pagerDutyKey = normalizePagerDutyRoutingKey(input.pagerDutyKey);
  const otherUrl = input.otherUrl ? await prepareOtherWebhookUrl(input.otherUrl, resolveHost) : null;
  const emailTo = (Array.isArray(input.email?.to) ? input.email.to : input.email?.to ? [input.email.to] : [])
    .map((address) => address.trim())
    .filter(Boolean);
  const secrets = [slackUrl, teamsUrl, pagerDutyKey, otherUrl, ...emailTo];

  if (input.email) {
    const startedAt = new Date().toISOString();
    if (!input.email.configured) {
      attempts.push(failed("email", "resend_not_configured", startedAt));
    } else if (emailTo.length === 0) {
      attempts.push(failed("email", "user_email_missing", startedAt));
    } else if (!input.sendEmail) {
      attempts.push(failed("email", "resend_not_configured", startedAt));
    } else {
      let recorded = false;
      for (let tryIndex = 0; tryIndex < EVIDENCE_HTTP_TRIES && !recorded; tryIndex += 1) {
        try {
          const sent = await input.sendEmail(emailTo);
          const providerResponse = sent.providerResponse
            ? redactDeliveryResponse(sent.providerResponse, secrets)
            : null;
          const status = sent.httpStatus;
          const kind = sent.ok && (status == null || (status >= 200 && status < 300))
            ? "accepted"
            : status != null
              ? classifyHttp(status)
              : "failed";
          if (kind === "pending" && tryIndex < EVIDENCE_HTTP_TRIES - 1) {
            await wait(retryDelayMs);
            continue;
          }
          attempts.push(attempt("email", kind, status, providerResponse || null, startedAt));
          recorded = true;
        } catch {
          attempts.push(failed("email", "network_error", startedAt));
          recorded = true;
        }
      }
    }
  }

  if (input.slackUrl) {
    const startedAt = new Date().toISOString();
    attempts.push(
      slackUrl
        ? await postChannel({
            channel: "slack",
            url: slackUrl,
            body: slackEvidencePayload(input.text),
            secrets,
            resolveHost,
            fetchImpl,
            startedAt,
            retryDelayMs,
          })
        : failed("slack", "invalid", startedAt),
    );
  }

  if (input.teamsUrl) {
    const startedAt = new Date().toISOString();
    attempts.push(
      teamsUrl
        ? await postChannel({
            channel: "teams",
            url: teamsUrl,
            body: teamsEvidencePayload(teamsUrl, input.subject, input.text),
            secrets,
            resolveHost,
            fetchImpl,
            startedAt,
            retryDelayMs,
          })
        : failed("teams", "invalid", startedAt),
    );
  }

  if (input.pagerDutyKey) {
    const startedAt = new Date().toISOString();
    if (!pagerDutyKey) {
      attempts.push(failed("pagerduty", "invalid", startedAt));
    } else {
      const event = pagerDutyEvidencePayload({
        routingKey: pagerDutyKey,
        subject: input.subject,
        text: input.text,
        dedupKey: input.dedupKey,
      });
      attempts.push(
        await postChannel({
          channel: "pagerduty",
          url: event.url,
          body: event.body,
          secrets,
          resolveHost,
          fetchImpl,
          startedAt,
          retryDelayMs,
        }),
      );
    }
  }

  if (input.otherUrl) {
    const startedAt = new Date().toISOString();
    attempts.push(
      otherUrl
        ? await postChannel({
            channel: "webhook",
            url: otherUrl,
            body: otherWebhookEvidencePayload(input.subject, input.text),
            secrets,
            resolveHost,
            fetchImpl,
            startedAt,
            retryDelayMs,
          })
        : blocked("webhook", startedAt),
    );
  }

  return attempts;
}
