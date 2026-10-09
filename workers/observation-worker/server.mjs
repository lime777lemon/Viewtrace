/**
 * HTTP front for the Observation Worker.
 * Does not write to public.observations. Does not sell SOCKS to customers.
 *
 *   VIEWTRACE_OBSERVATION_WORKER_SECRET=...
 *   VIEWTRACE_RESIDENTIAL_PROXY_URL_TEMPLATE=http://user{countryTag}{stateTag}:pass@host:port
 *   node server.mjs
 *
 * POST /capture  { url, region, full_page }
 * Authorization: Bearer <secret>
 */
import http from "node:http";
import { captureObservation } from "./capture.mjs";

const PORT = Number(process.env.PORT || 8788);
const SECRET = process.env.VIEWTRACE_OBSERVATION_WORKER_SECRET?.trim() || "";

let queue = Promise.resolve();
function enqueue(fn) {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

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

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, { ok: true, engine: "playwright_worker" });
    return;
  }

  if (req.method !== "POST" || url.pathname !== "/capture") {
    sendJson(res, 404, { ok: false, error: "not_found" });
    return;
  }

  if (!authorize(req)) {
    sendJson(res, 401, { ok: false, error: "unauthorized" });
    return;
  }

  let body;
  try {
    body = await readJson(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "invalid_json" });
    return;
  }

  const target = typeof body.url === "string" ? body.url.trim() : "";
  const region = typeof body.region === "string" ? body.region.trim() : "";
  const fullPage = body.full_page !== false;
  if (!target || !/^https?:\/\//i.test(target)) {
    sendJson(res, 400, { ok: false, error: "invalid_url" });
    return;
  }

  try {
    const result = await enqueue(() =>
      captureObservation({ url: target, region, fullPage }),
    );
    if (!result.ok) {
      sendJson(res, 422, {
        ok: false,
        error: result.error,
        requested: result.requested,
        observed: result.observed,
        via_residential_proxy: result.via_residential_proxy,
        duration_ms: result.duration_ms,
      });
      return;
    }
    sendJson(res, 200, {
      ok: true,
      png_base64: Buffer.from(result.png).toString("base64"),
      requested: result.requested,
      observed: result.observed,
      html_signals: result.html_signals,
      http_status: result.http_status,
      final_url: result.final_url,
      via_residential_proxy: result.via_residential_proxy,
      viewport: result.viewport,
      duration_ms: result.duration_ms,
      proxy_bytes: result.proxy_bytes,
      engine: "playwright_worker",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 300) : "capture_failed";
    sendJson(res, 500, { ok: false, error: "capture_failed", detail: message });
  }
});

server.listen(PORT, () => {
  console.log(`observation-worker listening on ${PORT}`);
});
