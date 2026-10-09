/**
 * Local one-shot capture. Does not write Observations.
 *
 *   node cli.mjs --url https://example.com --region US-CA --out shot.png
 */
import { writeFile } from "node:fs/promises";
import { captureObservation } from "./capture.mjs";

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i < 0) return "";
  return process.argv[i + 1] ?? "";
}

const url = argValue("--url");
const region = argValue("--region") || "US-CA";
const out = argValue("--out") || "";
const fullPage = !process.argv.includes("--viewport-only");

if (!url) {
  console.error("usage: node cli.mjs --url https://example.com [--region US-CA] [--out shot.png]");
  process.exit(1);
}

const result = await captureObservation({ url, region, fullPage });
const publicResult = { ...result };
delete publicResult.png;
console.log(JSON.stringify(publicResult, null, 2));

if (result.ok && out) {
  await writeFile(out, result.png);
  console.error(`wrote ${out}`);
}

if (!result.ok) process.exit(1);
