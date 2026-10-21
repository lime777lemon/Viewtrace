import { readFileSync } from "node:fs";

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

const TARGETS = [
  {
    observationId: "a588486e-55d7-48e2-a9d5-5804c51cb006",
    url: "https://americanmedical.ai/",
    region: "US-CA",
    label: "US · California",
  },
  {
    observationId: "eb85ce4d-31c1-4319-a7ce-cc37f7a62631",
    url: "https://americanmedical.ai/",
    region: "US-FL",
    label: "US · Florida",
  },
] as const;

const USER_ID = "ea584da5-d7b3-4f90-b657-791c83544b75";

async function main() {
  const { runBrowserlessScrollWithProxyRetry } = await import(
    "../src/lib/browserless-scroll-interaction"
  );

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  const rows: Array<Record<string, unknown>> = [];
  for (const target of TARGETS) {
    console.error(`running ${target.label} ${target.region} …`);
    const started = Date.now();
    const result = await runBrowserlessScrollWithProxyRetry({
      url: target.url,
      region: target.region,
    });
    const elapsed = Date.now() - started;
    if (!result.ok) {
      console.error(`FAIL ${target.region}`, result.error, result.detail ?? "");
      rows.push({
        region: target.region,
        label: target.label,
        ok: false,
        error: result.error,
        duration_ms: result.durationMs,
        elapsed_ms: elapsed,
      });
      continue;
    }
    const check = result.check;
    if (supabaseUrl && serviceKey) {
      const saved = await fetch(`${supabaseUrl}/rest/v1/ai_analyses?on_conflict=user_id,observation_id,analysis_type`, {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({
          user_id: USER_ID,
          observation_id: target.observationId,
          analysis_type: "scroll_interaction",
          status: "completed",
          source: "record",
          summary: "Regional interaction check (not a screenshot)",
          notes: [{ kind: "scroll_interaction", result: check, run_times: [check.measured_at] }],
          model: null,
          prompt_version: "scroll-interaction-v1",
          updated_at: new Date().toISOString(),
        }),
      });
      if (!saved.ok) {
        console.error(`save failed ${target.region}`, saved.status, await saved.text());
      }
    }
    rows.push({
      region: target.region,
      label: target.label,
      ok: true,
      observationId: target.observationId,
      duration_ms: check.duration_ms,
      elapsed_ms: elapsed,
      proxy_bytes: check.proxy_bytes,
      types: check.types,
      scroll: check.scroll
        ? {
            status: check.scroll.status,
            reason: check.scroll.reason,
            scroll_start: check.scroll.scroll_start,
            scroll_end: check.scroll.scroll_end,
            checkpoints: check.scroll.checkpoints,
            changed_elements: check.scroll.changed_elements,
            changes: check.scroll.changes,
            reduced_motion: check.scroll.reduced_motion,
          }
        : null,
    });
  }
  console.log(JSON.stringify({ url: TARGETS[0]?.url, runs: rows }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
