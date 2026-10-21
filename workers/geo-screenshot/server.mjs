/**
 * US Cloud Run PoC only. Does not replace Browserless production captures.
 *
 * Observed fields are facts we confirmed (egress lookup / page response).
 * State and city are never inferred.
 */
import http from "node:http";
import { chromium } from "playwright";

const PORT = Number(process.env.PORT || 8787);
const SECRET = process.env.VIEWTRACE_GEO_WORKER_SECRET?.trim() || "";
const REQUESTED_COUNTRY = (process.env.VIEWTRACE_GEO_WORKER_REGION?.trim() || "US").toUpperCase();
const PROVIDER = process.env.VIEWTRACE_GEO_WORKER_PROVIDER?.trim() || "gcp";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";
const ACCEPT_LANGUAGE = "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7";

function sendJson(res, status, body) {
  const raw = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(raw),
  });
  res.end(raw);
}

function authorize(req) {
  if (!SECRET) return false;
  const h = req.headers.authorization?.trim() ?? "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return Boolean(m && m[1] === SECRET);
}

function isBlockedHost(hostname) {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h.endsWith(".local") ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h === "::1" ||
    h.endsWith(".internal") ||
    h === "metadata.google.internal"
  );
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

async function lookupEgress() {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 4000);
  try {
    const res = await fetch("https://cloudflare.com/cdn-cgi/trace", {
      signal: ac.signal,
      headers: { "user-agent": USER_AGENT },
    });
    const text = await res.text();
    const ip = text.match(/^ip=(.+)$/m)?.[1]?.trim() || null;
    const loc = text.match(/^loc=([A-Z]{2})$/m)?.[1] || null;
    return { ip, observed_country: loc };
  } catch {
    return { ip: null, observed_country: null };
  } finally {
    clearTimeout(t);
  }
}

async function takeScreenshot(url, fullPage) {
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
      userAgent: USER_AGENT,
      extraHTTPHeaders: { "Accept-Language": ACCEPT_LANGUAGE },
    });
    const response = await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
    const png = await page.screenshot({ type: "png", fullPage });
    return {
      png,
      http_status: response?.status() ?? null,
      final_url: page.url(),
    };
  } finally {
    await browser.close();
  }
}

function baseResult(started, extra) {
  return {
    requested_country: REQUESTED_COUNTRY,
    observed_country: extra.observed_country ?? null,
    ip_type: "datacenter",
    provider: PROVIDER,
    ip: extra.ip ?? null,
    http_status: extra.http_status ?? null,
    final_url: extra.final_url ?? null,
    duration_ms: Date.now() - started,
    status: extra.status,
    success: extra.status === "success",
    error_code: extra.error_code ?? null,
    production_default: false,
  };
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);

  if (req.method === "GET" && reqUrl.pathname === "/health") {
    sendJson(res, 200, {
      ok: true,
      requested_country: REQUESTED_COUNTRY,
      ip_type: "datacenter",
      provider: PROVIDER,
      production_default: false,
    });
    return;
  }

  if (req.method !== "POST" || reqUrl.pathname !== "/screenshot") {
    sendJson(res, 404, baseResult(Date.now(), { status: "error", error_code: "not_found" }));
    return;
  }

  if (!authorize(req)) {
    sendJson(res, 401, baseResult(Date.now(), { status: "error", error_code: "unauthorized" }));
    return;
  }

  let body;
  try {
    body = await readJson(req);
  } catch {
    sendJson(res, 400, baseResult(Date.now(), { status: "error", error_code: "invalid_json" }));
    return;
  }

  const rawUrl = typeof body.url === "string" ? body.url.trim() : "";
  let target;
  try {
    target = new URL(rawUrl);
  } catch {
    sendJson(res, 400, baseResult(Date.now(), { status: "error", error_code: "invalid_url" }));
    return;
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    sendJson(res, 400, baseResult(Date.now(), { status: "error", error_code: "invalid_url" }));
    return;
  }
  if (isBlockedHost(target.hostname)) {
    sendJson(res, 403, baseResult(Date.now(), { status: "error", error_code: "forbidden_host" }));
    return;
  }

  const fullPage = body.fullPage === true;
  const wantPng = (req.headers.accept || "").includes("image/png") || reqUrl.searchParams.get("raw") === "1";
  const started = Date.now();
  const egress = await lookupEgress();

  try {
    const shot = await takeScreenshot(target.href, fullPage);
    const result = baseResult(started, {
      status: "success",
      observed_country: egress.observed_country,
      ip: egress.ip,
      http_status: shot.http_status,
      final_url: shot.final_url,
    });

    if (wantPng) {
      res.writeHead(200, {
        "content-type": "image/png",
        "content-length": shot.png.length,
        "x-viewtrace-requested-country": result.requested_country,
        "x-viewtrace-observed-country": result.observed_country ?? "",
        "x-viewtrace-ip-type": result.ip_type,
        "x-viewtrace-http-status": String(result.http_status ?? ""),
        "x-viewtrace-final-url": result.final_url ?? "",
        "x-viewtrace-duration-ms": String(result.duration_ms),
      });
      res.end(shot.png);
      return;
    }

    sendJson(res, 200, {
      ...result,
      screenshot_png_base64: shot.png.toString("base64"),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "screenshot_failed";
    sendJson(res, 502, {
      ...baseResult(started, {
        status: "error",
        error_code: "screenshot_failed",
        observed_country: egress.observed_country,
        ip: egress.ip,
      }),
      detail: message.slice(0, 500),
    });
  }
});

if (!SECRET) {
  console.error("VIEWTRACE_GEO_WORKER_SECRET is required");
  process.exit(1);
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `geo-screenshot PoC :${PORT} requested=${REQUESTED_COUNTRY} ip_type=datacenter provider=${PROVIDER}`,
  );
});
