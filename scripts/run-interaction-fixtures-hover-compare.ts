/**
 * Shared hover engine (mouseMove) vs legacy_active (page.hover runHoverKind) semantic parity.
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
  { region: "US-CA", kind: "hover", mode: "working" as const },
  { region: "US-CA", kind: "hover", mode: "broken" as const },
  { region: "US-CA", kind: "hover", mode: "absent" as const },
  { region: "US-CA", kind: "hover", mode: "unsafe" as const },
] as const;

type HoverSnap = {
  typeStatus: string;
  typeDetected: boolean;
  evidenceSelector: string | null;
  evidenceChanges: string[] | null;
  evidenceActions: string[] | null;
};

function snapHover(check: RegionalInteractionCheckV1): HoverSnap {
  const row = check.types.find((t) => t.type === "hover");
  const ev = row?.evidence;
  return {
    typeStatus: row?.status ?? "?",
    typeDetected: row?.detected ?? false,
    evidenceSelector: typeof ev?.selector === "string" ? ev.selector : null,
    evidenceChanges: Array.isArray(ev?.changes) ? [...ev.changes].sort() : null,
    evidenceActions: Array.isArray(ev?.actions) ? [...ev.actions].sort() : null,
  };
}

function diff(a: HoverSnap, b: HoverSnap): string[] {
  const out: string[] = [];
  for (const k of Object.keys(a) as (keyof HoverSnap)[]) {
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) {
      out.push(`${k}: shared=${JSON.stringify(a[k])} legacy=${JSON.stringify(b[k])}`);
    }
  }
  return out;
}

async function main() {
  const { runBrowserlessScrollWithProxyRetry } = await import(
    "../src/lib/browserless-scroll-interaction"
  );
  let failed = 0;
  const report: unknown[] = [];

  for (const job of JOBS) {
    const url = `https://viewtrace.net/tests/interactions/${job.kind}?mode=${job.mode}`;
    const fixtureHtml = interactionFixtureDocument(job.kind, job.mode);
    const label = `${job.region} ${job.kind}/${job.mode}`;
    console.error(`hover compare ${label} …`);

    const base = { url, region: job.region, fixtureHtml };
    const [shared, legacy] = await Promise.all([
      runBrowserlessScrollWithProxyRetry(base),
      runBrowserlessScrollWithProxyRetry({ ...base, hoverEngine: "legacy_active" }),
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

    const sharedSnap = snapHover(shared.check);
    const legacySnap = snapHover(legacy.check);
    const mismatches = diff(sharedSnap, legacySnap);
    if (mismatches.length) failed += 1;
    report.push({ job, ok: mismatches.length === 0, shared: sharedSnap, legacy: legacySnap, mismatches });
    console.error(mismatches.length ? `MISMATCH ${label}` : `match ${label} hover=${sharedSnap.typeStatus}`);
  }

  console.log(JSON.stringify(report, null, 2));
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
