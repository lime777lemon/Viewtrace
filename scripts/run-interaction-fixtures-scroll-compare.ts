/**
 * Live: shared scroll engine vs context.scroll_engine=legacy on the same fixture jobs.
 * Compares scroll type row + ScrollInteractionV1 fields (not full JSON byte match).
 */
import { readFileSync } from "node:fs";
import { interactionFixtureDocument } from "../src/lib/interaction-test-fixtures";
import type { RegionalInteractionCheckV1 } from "../src/lib/observation-regional-interaction";

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

const JOBS = [
  { region: "US-CA", kind: "all", mode: "working" as const },
  { region: "US-FL", kind: "all", mode: "working" as const },
  { region: "JP-13", kind: "all", mode: "working" as const },
  { region: "US-CA", kind: "all", mode: "broken" as const },
  { region: "US-CA", kind: "all", mode: "absent" as const },
  { region: "US-CA", kind: "modal", mode: "unsafe" as const },
] as const;

type ScrollSnapshot = {
  typeStatus: string;
  typeDetected: boolean;
  evidenceStatus: string | null;
  evidenceSelector: string | null;
  evidenceChanges: string[] | null;
  scrollV1Status: string | null;
  scrollV1Reason: string | null;
  sectionFound: boolean | null;
  checkpointCount: number;
  scrollStart: number | null;
  scrollEnd: number | null;
  changedElements: number | null;
};

function snapScroll(check: RegionalInteractionCheckV1): ScrollSnapshot {
  const row = check.types.find((t) => t.type === "scroll");
  const ev = row?.evidence;
  const s = check.scroll;
  return {
    typeStatus: row?.status ?? "?",
    typeDetected: row?.detected ?? false,
    evidenceStatus: row?.status ?? null,
    evidenceSelector: typeof ev?.selector === "string" ? ev.selector : null,
    evidenceChanges: Array.isArray(ev?.changes) ? [...ev.changes].sort() : null,
    scrollV1Status: s?.status ?? null,
    scrollV1Reason: s?.reason ?? null,
    sectionFound: s ? s.reason !== "no_scroll_section" : null,
    checkpointCount: s?.checkpoints ?? 0,
    scrollStart: s?.scroll_start ?? null,
    scrollEnd: s?.scroll_end ?? null,
    changedElements: s?.changed_elements ?? null,
  };
}

function diffScroll(a: ScrollSnapshot, b: ScrollSnapshot): string[] {
  const keys = Object.keys(a) as (keyof ScrollSnapshot)[];
  const mismatches: string[] = [];
  for (const k of keys) {
    const va = a[k];
    const vb = b[k];
    if (JSON.stringify(va) !== JSON.stringify(vb)) {
      mismatches.push(`${k}: shared=${JSON.stringify(va)} legacy=${JSON.stringify(vb)}`);
    }
  }
  return mismatches;
}

async function main() {
  const { runBrowserlessScrollWithProxyRetry } = await import(
    "../src/lib/browserless-scroll-interaction"
  );
  const report: unknown[] = [];
  let failed = 0;

  for (const job of JOBS) {
    const url = `https://viewtrace.net/tests/interactions/${job.kind}?mode=${job.mode}`;
    const fixtureHtml = interactionFixtureDocument(job.kind, job.mode);
    const label = `${job.region} ${job.kind}/${job.mode}`;
    console.error(`compare ${label} …`);

    const base = {
      url,
      region: job.region,
      fixtureHtml,
    };

    const [shared, legacy] = await Promise.all([
      runBrowserlessScrollWithProxyRetry(base),
      runBrowserlessScrollWithProxyRetry({ ...base, scrollEngine: "legacy" }),
    ]);

    if (!shared.ok || !legacy.ok) {
      failed += 1;
      report.push({
        job,
        ok: false,
        sharedError: shared.ok ? null : shared.error,
        legacyError: legacy.ok ? null : legacy.error,
      });
      continue;
    }

    const sharedSnap = snapScroll(shared.check);
    const legacySnap = snapScroll(legacy.check);
    const mismatches = diffScroll(sharedSnap, legacySnap);
    if (mismatches.length) failed += 1;

    report.push({
      job,
      ok: mismatches.length === 0,
      shared: sharedSnap,
      legacy: legacySnap,
      mismatches,
    });
    console.error(
      mismatches.length ? `MISMATCH ${label}` : `match ${label} scroll=${sharedSnap.typeStatus}`,
    );
  }

  console.log(JSON.stringify(report, null, 2));
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
