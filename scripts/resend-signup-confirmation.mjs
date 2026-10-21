#!/usr/bin/env node
/**
 * 未確認の無料登録者へ、Supabase の Confirm signup メールを再送する。
 * 既定はドライラン。`--send` のときだけ実送信。
 *
 *   node scripts/resend-signup-confirmation.mjs
 *   node scripts/resend-signup-confirmation.mjs --send
 *
 * 必要な環境変数（.env.local）:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY（resend エンドポイント用）
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvLocal() {
  const path = join(root, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvLocal();

const args = process.argv.slice(2);
const SEND = args.includes("--send");
const LIMIT = Number.parseInt(
  (() => {
    const i = args.indexOf("--limit");
    return i >= 0 && i + 1 < args.length ? args[i + 1] : "";
  })(),
  10,
);

function normalizeSupabaseUrl(raw) {
  return raw.trim().replace(/\/+$/, "").replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
}

function maskEmail(email) {
  const [local, domain] = String(email).split("@");
  if (!domain) return "(invalid)";
  const head = local.slice(0, 1) || "?";
  return `${head}***@${domain}`;
}

async function fetchAllAuthUsers(base, serviceKey) {
  const out = [];
  for (let page = 1; page <= 50; page++) {
    const url = `${base}/auth/v1/admin/users?page=${page}&per_page=200`;
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`auth admin users failed (${r.status}): ${t.slice(0, 400)}`);
    }
    const j = await r.json();
    const users = j.users ?? [];
    for (const u of users) out.push(u);
    if (users.length < 200) break;
  }
  return out;
}

function isFreePlan(user) {
  const plan = String(user.user_metadata?.plan ?? "freeplan").toLowerCase();
  return plan !== "starter" && plan !== "pro";
}

function unconfirmedFree(users) {
  let list = users.filter((u) => {
    if (!u.email || !String(u.email).includes("@")) return false;
    if (u.email_confirmed_at || u.confirmed_at) return false;
    if (u.banned_until || u.deleted_at) return false;
    return isFreePlan(u);
  });
  list.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
  if (Number.isFinite(LIMIT) && LIMIT > 0) list = list.slice(0, LIMIT);
  return list;
}

async function resendSignup(base, anonKey, email, redirectTo) {
  const r = await fetch(`${base}/auth/v1/resend`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "signup",
      email,
      options: { email_redirect_to: redirectTo },
    }),
  });
  const body = await r.text();
  if (!r.ok) return { ok: false, error: `${r.status}: ${body.slice(0, 400)}` };
  return { ok: true };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!rawUrl || !serviceKey || !anonKey) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY が必要です。",
    );
    process.exit(1);
  }

  const base = normalizeSupabaseUrl(rawUrl);
  const redirectTo = "https://viewtrace.net/auth/callback";
  const users = await fetchAllAuthUsers(base, serviceKey);
  const targets = unconfirmedFree(users);

  console.log(`未確認の無料登録: ${targets.length} 件`);
  console.log(`redirect_to: ${redirectTo}`);
  for (const u of targets) {
    const created = String(u.created_at || "").slice(0, 10) || "—";
    console.log(`  ${maskEmail(u.email)}  ${created}`);
  }

  if (!targets.length) {
    console.log("対象がありません。");
    return;
  }

  if (!SEND) {
    console.log("\n[DRY RUN] 送信していません。送るときは:");
    console.log("  node scripts/resend-signup-confirmation.mjs --send");
    return;
  }

  console.log("\n=== 確認メール再送 ===");
  let ok = 0;
  let fail = 0;
  for (const u of targets) {
    const result = await resendSignup(base, anonKey, String(u.email).trim(), redirectTo);
    if (result.ok) {
      ok++;
      console.log(`  ok  ${maskEmail(u.email)}`);
    } else {
      fail++;
      console.error(`  fail ${maskEmail(u.email)}  ${result.error}`);
    }
    await sleep(800);
  }
  console.log(`\n完了 success: ${ok}, failed: ${fail}`);
  if (fail) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
