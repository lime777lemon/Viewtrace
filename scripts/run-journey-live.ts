import { readFileSync } from "node:fs";
import WebSocket from "ws";
import type { JourneyStepDefinition } from "../src/lib/journey-definition";
import { runDueJourneyWatches } from "../src/lib/journey-store";
import { countObservationsThisUtcMonth, utcMonthStartIso } from "../src/lib/observation-quota";
import { getPlan, parsePlanId } from "../src/lib/plans";
import { createSupabaseAdminClient } from "../src/lib/supabase/admin";

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = value;
  }
}

loadEnvLocal();
if (!globalThis.WebSocket) globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket;

const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body>
<form id="login-form">
  <input id="user" />
  <input id="pass" type="password" />
  <button id="login" type="button">Login</button>
</form>
<p id="account" hidden>Account</p>
<button id="add-cart" type="button" hidden>Add to cart</button>
<p id="cart" hidden>0</p>
<button id="place-order" type="button" hidden>Place order</button>
<script>
document.getElementById("login").addEventListener("click", function () {
  var user = document.getElementById("user").value;
  var pass = document.getElementById("pass").value;
  if (user === "agent" && pass === "secret-test") {
    document.getElementById("account").hidden = false;
    document.getElementById("add-cart").hidden = false;
    document.getElementById("place-order").hidden = false;
  }
});
document.getElementById("add-cart").addEventListener("click", function () {
  document.getElementById("cart").hidden = false;
  document.getElementById("cart").textContent = "1";
});
document.getElementById("place-order").addEventListener("click", function () {
  document.body.setAttribute("data-ordered", "yes");
});
</script>
</body></html>`;

const blank = { selector: "", value: "", url: "", wait_ms: 1000, permitted_side_effect: null, expect_selector: "", expect_text: "", expect_visible: false, expect_url: "" };

const steps: JourneyStepDefinition[] = [
  { ...blank, id: "open", kind: "open_url", url: "https://viewtrace.net/tests/journey" },
  { ...blank, id: "user", kind: "fill", selector: "#user", value: "{{username}}" },
  { ...blank, id: "pass", kind: "fill", selector: "#pass", value: "{{password}}" },
  { ...blank, id: "login", kind: "click", selector: "#login", expect_selector: "#account", expect_visible: true },
  { ...blank, id: "cart", kind: "click", selector: "#add-cart", expect_selector: "#cart", expect_text: "1" },
  { ...blank, id: "order", kind: "click", selector: "#place-order" },
];

async function main() {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    console.log(JSON.stringify({ saved: false, error: "admin_unavailable" }));
    process.exit(1);
  }
  const { data: owners } = await admin.from("users").select("id, plan").in("plan", ["pro", "starter"]);
  const ranked = (owners ?? []) as Array<{ id: string; plan: string }>;
  ranked.sort((a, b) => (a.plan === "pro" ? -1 : 1) - (b.plan === "pro" ? -1 : 1));
  let owner: { id: string; plan: string } | null = null;
  for (const candidate of ranked) {
    const observations = await countObservationsThisUtcMonth(admin, candidate.id);
    const { count } = await admin
      .from("journey_runs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", candidate.id)
      .gte("created_at", utcMonthStartIso());
    const limit = getPlan(parsePlanId(candidate.plan)).monthlyObservations;
    if (observations != null && observations + (count ?? 0) + 6 <= limit) {
      owner = candidate;
      break;
    }
  }
  if (!owner) {
    console.log(JSON.stringify({ saved: false, error: "quota" }));
    process.exit(1);
  }

  await admin.from("journey_definitions").delete().eq("user_id", owner.id).eq("name", "Fixture journey proof");
  const { data: created, error: createError } = await admin.from("journey_definitions").insert({
    user_id: owner.id,
    name: "Fixture journey proof",
    start_url: "https://viewtrace.net/tests/journey",
    steps,
    regions: ["US-CA", "US-FL", "JP-13"],
    device_classes: ["desktop", "mobile"],
    watch_enabled: true,
    watch_frequency: "daily",
    next_run_at: new Date().toISOString(),
    secret_credentials: { username: "agent", password: "secret-test" },
  }).select("id").single();
  if (createError || !created) {
    console.log(JSON.stringify({ saved: false, error: "create_failed" }));
    process.exit(1);
  }
  const journeyId = String((created as { id: string }).id);
  const watched = await runDueJourneyWatches(admin, async (userId) => {
    const { data } = await admin.from("users").select("plan").eq("id", userId).maybeSingle();
    return getPlan(parsePlanId(typeof (data as { plan?: unknown } | null)?.plan === "string" ? (data as { plan: string }).plan : null)).monthlyObservations;
  }, { fixtureHtml: html });
  await admin.from("journey_definitions").update({
    watch_enabled: false,
    next_run_at: null,
    secret_credentials: {},
  }).eq("id", journeyId);

  const { data: stored } = await admin
    .from("journey_runs")
    .select("id, region, device_class, status, duration_ms, environment, steps")
    .eq("journey_id", journeyId)
    .order("created_at", { ascending: true });
  const runs = (stored ?? []).map((row) => {
    const record = row as {
      id: string;
      region: string;
      device_class: string;
      status: string;
      duration_ms: number;
      environment: { viewport?: { width: number; height: number }; pointer?: string; touch?: boolean } | null;
      steps: Array<{ id: string; status: string; detail: string | null; before_text: string | null; after_text: string | null; before_visible: boolean | null; after_visible: boolean | null }>;
    };
    const byId = Object.fromEntries(record.steps.map((step) => [step.id, step]));
    return {
      id: record.id,
      region: record.region,
      device: record.device_class,
      status: record.status,
      duration_ms: record.duration_ms,
      viewport: record.environment?.viewport ?? null,
      pointer: record.environment?.pointer ?? null,
      touch: record.environment?.touch ?? null,
      login: byId.login ? { status: byId.login.status, visible: [byId.login.before_visible, byId.login.after_visible] } : null,
      cart: byId.cart ? { status: byId.cart.status, text: [byId.cart.before_text, byId.cart.after_text] } : null,
      order: byId.order ? { status: byId.order.status, detail: byId.order.detail } : null,
    };
  });
  console.log(JSON.stringify({ journey_id: journeyId, watch: watched, runs }, null, 2));
  if (watched.ran !== 6 || runs.length !== 6 || runs.some((run) => run.status !== "blocked")) process.exit(1);
}

main();
