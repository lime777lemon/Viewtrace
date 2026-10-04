/**
 * Pull-based geo node. Same program for Tokyo, California, or London.
 * Registers itself, heartbeats, then pulls jobs. Does not replace Browserless.
 *
 *   VIEWTRACE_GEO_NODE_ID=tokyo \
 *   VIEWTRACE_GEO_NODE_COUNTRY=JP \
 *   VIEWTRACE_GEO_NODE_IP_TYPE=residential \
 *   node agent.mjs once --url https://example.com
 *
 *   VIEWTRACE_GEO_NODE_POLL_URL=http://localhost:3000 \
 *   VIEWTRACE_GEO_NODE_SECRET=... \
 *   node agent.mjs poll
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { captureUrl, lookupEgress } from "./capture.mjs";

const nodeId = process.env.VIEWTRACE_GEO_NODE_ID?.trim() || "tokyo";
const country = (
  process.env.VIEWTRACE_GEO_NODE_COUNTRY ||
  process.env.VIEWTRACE_GEO_NODE_REQUESTED_COUNTRY ||
  "JP"
)
  .trim()
  .toUpperCase();
const region = (process.env.VIEWTRACE_GEO_NODE_REGION || "").trim().toUpperCase() || null;
const city = (process.env.VIEWTRACE_GEO_NODE_CITY || "").trim() || null;
const ipType = process.env.VIEWTRACE_GEO_NODE_IP_TYPE?.trim() || "residential";
const secret = process.env.VIEWTRACE_GEO_NODE_SECRET?.trim() || "";
const pollBase = (process.env.VIEWTRACE_GEO_NODE_POLL_URL || "").replace(/\/$/, "");
const intervalMs = Number(process.env.VIEWTRACE_GEO_NODE_POLL_MS || 15_000);

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i < 0) return "";
  return process.argv[i + 1] ?? "";
}

function headers() {
  return {
    authorization: `Bearer ${secret}`,
    "content-type": "application/json",
  };
}

function isBlockedHost(url) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return (
      h === "localhost" ||
      h.endsWith(".localhost") ||
      h.endsWith(".local") ||
      h === "127.0.0.1" ||
      h === "0.0.0.0" ||
      h === "::1" ||
      h.endsWith(".internal") ||
      h === "metadata.google.internal"
    );
  } catch {
    return true;
  }
}

function resultBase(egress, extra) {
  return {
    node_id: nodeId,
    declared_country: country,
    declared_region: region,
    requested_country: country,
    observed_country: egress.observed_country,
    observed_region: null,
    ip_type: ipType,
    ip: egress.ip,
    ...extra,
  };
}

async function runCapture(url, fullPage) {
  const started = Date.now();
  const egress = await lookupEgress();
  if (isBlockedHost(url)) {
    return resultBase(egress, {
      http_status: null,
      final_url: null,
      duration_ms: Date.now() - started,
      status: "error",
      success: false,
      error_code: "blocked_host",
      png: Buffer.alloc(0),
    });
  }
  try {
    const shot = await captureUrl(url, fullPage);
    return resultBase(egress, {
      http_status: shot.http_status,
      final_url: shot.final_url,
      duration_ms: Date.now() - started,
      status: "success",
      success: true,
      error_code: null,
      png: shot.png,
    });
  } catch (err) {
    return resultBase(egress, {
      http_status: null,
      final_url: null,
      duration_ms: Date.now() - started,
      status: "error",
      success: false,
      error_code: err instanceof Error ? err.message.slice(0, 200) : "capture_failed",
      png: Buffer.alloc(0),
    });
  }
}

async function writeLocal(result, url, jobId) {
  const dir = path.join(import.meta.dirname, "out");
  await mkdir(dir, { recursive: true });
  const id = jobId || `${Date.now()}`;
  await writeFile(path.join(dir, `${id}.png`), result.png);
  const { png: _omit, ...meta } = result;
  void _omit;
  await writeFile(path.join(dir, `${id}.json`), `${JSON.stringify({ url, ...meta }, null, 2)}\n`);
  return id;
}

async function once() {
  const url = argValue("--url");
  if (!url) {
    console.error("node agent.mjs once --url https://example.com");
    process.exit(1);
  }
  const result = await runCapture(url, process.argv.includes("--full-page"));
  const id = await writeLocal(result, url, "once");
  console.log(JSON.stringify({ ...result, png: undefined, saved: `out/${id}.png` }, null, 2));
}

async function post(pathName, body) {
  const res = await fetch(`${pollBase}${pathName}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `${pathName}_${res.status}`);
  return json;
}

async function register() {
  const egress = await lookupEgress();
  const json = await post("/api/internal/geo-node/register", {
    node_id: nodeId,
    country,
    region,
    city,
    ip_type: ipType,
    ip: egress.ip,
    observed_country: egress.observed_country,
  });
  const node = json.node ?? {};
  console.log(
    `registered ${nodeId} declared=${country}${region ? `-${region}` : ""} observed=${node.observed_country ?? "?"}${node.observed_region ? `-${node.observed_region}` : ""}`,
  );
}

async function heartbeat() {
  const egress = await lookupEgress();
  await post("/api/internal/geo-node/heartbeat", {
    node_id: nodeId,
    ip: egress.ip,
    observed_country: egress.observed_country,
  });
}

async function claimJob() {
  const res = await fetch(`${pollBase}/api/internal/geo-node/next?node_id=${encodeURIComponent(nodeId)}`, {
    method: "POST",
    headers: headers(),
  });
  if (res.status === 204) return null;
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `claim_${res.status}`);
  return json.job ?? null;
}

async function completeJob(job, result) {
  const json = await post("/api/internal/geo-node/complete", {
    job_id: job.id,
    node_id: nodeId,
    observed_country: result.observed_country,
    ip_type: result.ip_type,
    ip: result.ip,
    http_status: result.http_status,
    final_url: result.final_url,
    duration_ms: result.duration_ms,
    status: result.status,
    success: result.success,
    error_code: result.error_code,
    screenshot_png_base64: result.png.length ? result.png.toString("base64") : undefined,
  });
  return json.observed ?? result.observed_country;
}

async function poll() {
  if (!pollBase || !secret) {
    console.error("VIEWTRACE_GEO_NODE_POLL_URL and VIEWTRACE_GEO_NODE_SECRET are required for poll");
    process.exit(1);
  }
  await register();
  console.log(`geo-node ${nodeId} polling ${pollBase}`);
  for (;;) {
    try {
      const job = await claimJob();
      if (!job) {
        await heartbeat();
        await new Promise((r) => setTimeout(r, intervalMs));
        continue;
      }
      console.log(`claimed ${job.id} ${job.url} requested=${job.requested_country ?? ""}${job.requested_region ? `-${job.requested_region}` : ""}`);
      const result = await runCapture(job.url, job.full_page === true);
      await writeLocal(result, job.url, job.id);
      const observed = await completeJob(job, result);
      console.log(`done ${job.id} observed=${observed} status=${result.http_status}`);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
}

const mode = process.argv[2];
if (mode === "once") await once();
else if (mode === "poll") await poll();
else {
  console.error("node agent.mjs once --url <url>  |  node agent.mjs poll");
  process.exit(1);
}
