/**
 * Call the PoC worker for each URL and write a results table.
 * Production Browserless captures are not changed.
 *
 *   VIEWTRACE_GEO_WORKER_SECRET=... \
 *   VIEWTRACE_GEO_WORKER_URL=https://... \
 *   node compare.mjs urls.example.txt
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const workerUrl = (process.env.VIEWTRACE_GEO_WORKER_URL || "http://127.0.0.1:8787").replace(/\/$/, "");
const secret = process.env.VIEWTRACE_GEO_WORKER_SECRET?.trim() || "";
const listPath = process.argv[2] || path.join(import.meta.dirname, "urls.example.txt");

if (!secret) {
  console.error("VIEWTRACE_GEO_WORKER_SECRET is required");
  process.exit(1);
}

function slug(url) {
  return createHash("sha256").update(url).digest("hex").slice(0, 12);
}

function csvCell(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

const raw = await readFile(listPath, "utf8");
const urls = raw
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.join(import.meta.dirname, "out", stamp);
await mkdir(outDir, { recursive: true });

const rows = [
  [
    "url",
    "kind",
    "residential_success",
    "datacenter_success",
    "visual_diff",
    "http_diff",
    "http_status",
    "final_url",
    "requested_country",
    "observed_country",
    "ip_type",
    "duration_ms",
    "error_code",
    "judgment",
  ],
];

for (const url of urls) {
  const id = slug(url);
  let result;
  try {
    const res = await fetch(`${workerUrl}/screenshot`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${secret}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ url, fullPage: false }),
    });
    result = await res.json();
    if (result.screenshot_png_base64) {
      await writeFile(path.join(outDir, `${id}.png`), Buffer.from(result.screenshot_png_base64, "base64"));
      delete result.screenshot_png_base64;
    }
    await writeFile(path.join(outDir, `${id}.json`), `${JSON.stringify({ url, ...result }, null, 2)}\n`);
  } catch (err) {
    result = {
      success: false,
      error_code: "worker_unreachable",
      detail: err instanceof Error ? err.message : String(err),
    };
    await writeFile(path.join(outDir, `${id}.json`), `${JSON.stringify({ url, ...result }, null, 2)}\n`);
  }

  rows.push([
    url,
    "",
    "",
    result.success === true ? "yes" : "no",
    "",
    "",
    result.http_status ?? "",
    result.final_url ?? "",
    result.requested_country ?? "",
    result.observed_country ?? "",
    result.ip_type ?? "datacenter",
    result.duration_ms ?? "",
    result.error_code ?? "",
    "",
  ]);
}

const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
await writeFile(path.join(outDir, "results.csv"), csv);
console.log(`wrote ${urls.length} rows to ${outDir}/results.csv`);
console.log("Fill residential_success, visual_diff, http_diff, kind, judgment from the existing Observation.");
