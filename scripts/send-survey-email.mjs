#!/usr/bin/env node
/**
 * 既存登録ユーザーに「アンケート先行」メールを送る（Resend）。
 * 宛先は Supabase の auth ユーザー（メールアドレス）から取得します。
 *
 * ★安全設計: 既定は必ず「ドライラン（送信しない）」です。
 *   - 宛先一覧をコンソールに表示
 *   - 実際に届くのと同じ HTML / テキストを tmp/ に書き出し（ブラウザで確認可能）
 *   - `--send` を付けたときだけ実送信します
 *
 * 必要な環境変数（.env.local または環境）:
 *   RESEND_API_KEY                （必須・送信時）
 *   NEXT_PUBLIC_SUPABASE_URL      （宛先取得に必須）
 *   SUPABASE_SERVICE_ROLE_KEY     （宛先取得に必須）
 *   RESEND_FROM                   （任意・未設定なら onboarding@resend.dev）
 *   SURVEY_FROM_NAME              （任意・署名の名前。既定 "the Viewtrace team"）
 *   SURVEY_REPLY_TO               （任意・返信先。既定 RESEND_FROM のアドレス or info@viewtrace.net）
 *
 * 使い方:
 *   # 1) まず中身を確認（送信しない）。tmp/survey-preview-*.html を開いて確認
 *   node scripts/send-survey-email.mjs
 *   node scripts/send-survey-email.mjs --lang ja
 *
 *   # 2) OK なら送信（全宛先）
 *   node scripts/send-survey-email.mjs --send
 *   node scripts/send-survey-email.mjs --send --lang ja
 *
 * その他オプション:
 *   --lang en|ja        本文の言語（既定 en）
 *   --confirmed-only    確認済み(email_confirmed_at あり)のみ対象
 *   --only a@x,b@y      指定アドレスだけに絞る（テスト送信に便利）
 *   --limit N           先頭 N 件だけ対象
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderSurveyEmail, escapeHtml } from "./lib/survey-email-template.mjs";

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

// --- args ---
const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(name);
function getOpt(name, fallback) {
  const i = args.indexOf(name);
  if (i >= 0 && i + 1 < args.length) return args[i + 1];
  return fallback;
}

const SEND = hasFlag("--send");
const LANG = (getOpt("--lang", "en") || "en").toLowerCase() === "ja" ? "ja" : "en";
const CONFIRMED_ONLY = hasFlag("--confirmed-only");
const LIMIT = Number.parseInt(getOpt("--limit", ""), 10);
const ONLY = (getOpt("--only", "") || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const FROM = process.env.RESEND_FROM?.trim() || "Viewtrace team <info@viewtrace.net>";
const FROM_NAME = process.env.SURVEY_FROM_NAME?.trim() || "Viewtrace team";

function extractAddress(from) {
  const m = from.match(/<([^>]+)>/);
  return (m ? m[1] : from).trim();
}
const REPLY_TO =
  process.env.SURVEY_REPLY_TO?.trim() ||
  (process.env.RESEND_FROM?.trim() ? extractAddress(FROM) : "info@viewtrace.net");

function normalizeSupabaseUrl(raw) {
  let u = raw.trim().replace(/\/+$/, "");
  u = u.replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
  return u;
}

function pickName(u) {
  const md = u.user_metadata ?? {};
  const cand =
    md.full_name || md.name || md.display_name || md.first_name || md.company || "";
  return String(cand || "").trim();
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

function buildRecipients(users) {
  let list = users
    .filter((u) => u.email && String(u.email).includes("@"))
    .map((u) => ({
      email: String(u.email).trim(),
      name: pickName(u),
      created_at: u.created_at || "",
      confirmed: Boolean(u.email_confirmed_at || u.confirmed_at),
    }));

  if (CONFIRMED_ONLY) list = list.filter((r) => r.confirmed);
  if (ONLY.length) list = list.filter((r) => ONLY.includes(r.email.toLowerCase()));

  // 重複メール除去（後勝ちでなく先勝ち）
  const seen = new Set();
  list = list.filter((r) => {
    const key = r.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 登録が新しい順
  list.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  if (Number.isFinite(LIMIT) && LIMIT > 0) list = list.slice(0, LIMIT);
  return list;
}

function printTable(recipients) {
  console.log("\n宛先一覧 / Recipients:");
  console.log("─".repeat(72));
  recipients.forEach((r, i) => {
    const date = r.created_at ? r.created_at.slice(0, 10) : "—";
    const conf = r.confirmed ? "confirmed" : "UNCONFIRMED";
    const name = r.name || "(no name)";
    console.log(`${String(i + 1).padStart(2, " ")}. ${r.email.padEnd(34)} ${date}  ${conf.padEnd(11)} ${name}`);
  });
  console.log("─".repeat(72));
  console.log(`合計 / total: ${recipients.length} 名  |  言語 / lang: ${LANG}`);
}

function writePreview(recipients) {
  const tmp = join(root, "tmp");
  mkdirSync(tmp, { recursive: true });

  // プレビューは実際の1通目の宛先で描画（宛先が無ければサンプル）
  const sample = recipients[0] ?? { email: "sample@example.com", name: "Alex" };
  const { subject, html, text } = renderSurveyEmail({
    email: sample.email,
    name: sample.name,
    lang: LANG,
    fromName: FROM_NAME,
  });

  const htmlPath = join(tmp, `survey-preview-${LANG}.html`);
  const txtPath = join(tmp, `survey-preview-${LANG}.txt`);
  writeFileSync(htmlPath, html, "utf8");
  writeFileSync(
    txtPath,
    [
      `From:     ${FROM}`,
      `Reply-To: ${REPLY_TO}`,
      `Subject:  ${subject}`,
      `Sample recipient: ${sample.name || "(no name)"} <${sample.email}>`,
      "",
      "──────── TEXT VERSION ────────",
      "",
      text,
    ].join("\n"),
    "utf8",
  );

  return { htmlPath, txtPath, subject };
}

async function sendOne(apiKey, recipient) {
  const { subject, html, text } = renderSurveyEmail({
    email: recipient.email,
    name: recipient.name,
    lang: LANG,
    fromName: FROM_NAME,
  });
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [recipient.email],
      reply_to: REPLY_TO,
      subject,
      html,
      text,
      tags: [{ name: "campaign", value: "user-survey" }],
    }),
  });
  const body = await res.text();
  if (!res.ok) return { ok: false, error: `${res.status}: ${body.slice(0, 300)}` };
  let id = body;
  try {
    id = JSON.parse(body).id;
  } catch {}
  return { ok: true, id };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!rawUrl || !serviceKey) {
    console.error(
      "宛先取得に NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要です（.env.local）。",
    );
    process.exit(1);
  }

  const base = normalizeSupabaseUrl(rawUrl);
  const users = await fetchAllAuthUsers(base, serviceKey);
  const recipients = buildRecipients(users);

  if (!recipients.length) {
    console.error("対象の宛先がありません（フィルタ条件を確認してください）。");
    process.exit(1);
  }

  printTable(recipients);
  const { htmlPath, txtPath, subject } = writePreview(recipients);
  console.log(`\n件名 / Subject: ${subject}`);
  console.log(`差出人 / From:  ${FROM}`);
  console.log(`返信先 / Reply-To: ${REPLY_TO}`);
  console.log(`\nプレビュー / Preview:`);
  console.log(`  HTML: ${htmlPath}`);
  console.log(`  TEXT: ${txtPath}`);
  console.log(`  → ブラウザで開く: open "${htmlPath}"`);

  if (!SEND) {
    console.log(
      `\n[DRY RUN] 送信していません。内容を確認し、問題なければ次で送信してください:\n  node scripts/send-survey-email.mjs --send${LANG === "ja" ? " --lang ja" : ""}`,
    );
    return;
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.error("\n送信には RESEND_API_KEY が必要です（.env.local）。");
    process.exit(1);
  }

  console.log(`\n=== 送信開始 / Sending to ${recipients.length} recipients ===`);
  let ok = 0;
  let fail = 0;
  for (const r of recipients) {
    const result = await sendOne(apiKey, r);
    if (result.ok) {
      ok++;
      console.log(`  ✓ ${r.email}  (id: ${result.id})`);
    } else {
      fail++;
      console.error(`  ✗ ${r.email}  ${result.error}`);
    }
    await sleep(600); // レート制限に配慮して間隔を空ける
  }
  console.log(`\n完了 / Done. success: ${ok}, failed: ${fail}`);
  if (fail) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
