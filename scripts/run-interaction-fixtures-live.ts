import { readFileSync } from "node:fs";
import { interactionFixtureDocument } from "../src/lib/interaction-test-fixtures";

function loadEnvLocal() {
  let text = "";
  try {
    text = readFileSync(".env.local", "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = value;
  }
}

loadEnvLocal();

const ALL_JOBS = [
  { region: "US-CA", kind: "all", mode: "working" as const },
  { region: "US-FL", kind: "all", mode: "working" as const },
  { region: "JP-13", kind: "all", mode: "working" as const },
  { region: "US-CA", kind: "all", mode: "broken" as const },
  { region: "US-CA", kind: "all", mode: "absent" as const },
  { region: "US-CA", kind: "modal", mode: "unsafe" as const },
] as const;

const filter = (process.env.FIXTURE_JOB ?? "").trim();
const JOBS = filter
  ? ALL_JOBS.filter((job) => `${job.region}:${job.mode}` === filter || `${job.region}:${job.kind}:${job.mode}` === filter)
  : ALL_JOBS;

async function main() {
  const { runBrowserlessScrollWithProxyRetry } = await import(
    "../src/lib/browserless-scroll-interaction"
  );
  const { INTERACTION_CHECK_TYPES } = await import("../src/lib/observation-regional-interaction");
  const out = [];
  for (const job of JOBS) {
    const url = `https://viewtrace.net/tests/interactions/${job.kind}?mode=${job.mode}`;
    console.error(`running ${job.region} ${job.kind}/${job.mode} …`);
    const result = await runBrowserlessScrollWithProxyRetry({
      url,
      region: job.region,
      fixtureHtml: interactionFixtureDocument(job.kind, job.mode),
    });
    if (!result.ok) {
      console.error(`FAIL ${job.region} ${job.mode}`, result.error, result.detail ?? "");
      out.push({ ...job, ok: false, error: result.error });
      continue;
    }
    const types = Object.fromEntries(result.check.types.map((row) => [row.type, row.status]));
    out.push({
      ...job,
      ok: true,
      duration_ms: result.durationMs,
      types,
      evidence: result.check.types
        .filter((row) => row.evidence)
        .map((row) => ({
          type: row.type,
          status: row.status,
          selector: row.evidence?.selector,
          changes: row.evidence?.changes,
          note: row.evidence?.note,
          t0: row.evidence?.t0 ?? undefined,
          t1: row.evidence?.t1 ?? undefined,
        })),
    });
    const line = INTERACTION_CHECK_TYPES.map((type) => `${type}:${types[type] ?? "?"}`).join(" ");
    console.error(line);
  }
  console.log(JSON.stringify(out, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
