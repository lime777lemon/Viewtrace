#!/usr/bin/env node
/**
 * 定期自動観測 Cron と同じ体裁のテストメールを 1 通送る（Resend）。
 *
 * 事前: .env.local に RESEND_API_KEY（必須）。本番ドメイン送信なら RESEND_FROM も。
 * 本物の記録 ID で試す場合:
 *   - 第3引数に UUID を指定するか、
 *   - `--latest` で「送信先メールアドレスのユーザー」の最新 observations を 1 件取得する
 *     （要 NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY）
 *
 * 使用例:
 *   npm run test:scheduled-obs-email -- you@example.com
 *   npm run test:scheduled-obs-email -- you@example.com --latest
 *   npm run test:scheduled-obs-email -- you@example.com 6a9c46f8-d66f-45cc-8da1-a1d7ddd4ca0e
 *
 * 注意: 「icoud.com」は多くの場合「icloud.com」の誤記です。届かないときはドメインを確認してください。
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

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

function normalizeSupabaseUrl(raw) {
  let u = raw.trim().replace(/\/+$/, "");
  u = u.replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
  return u;
}

/** @param {string} base */
async function findUserIdByEmail(base, serviceKey, email) {
  const want = email.trim().toLowerCase();
  for (let page = 1; page <= 50; page++) {
    const url = `${base}/auth/v1/admin/users?page=${page}&per_page=200`;
    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`auth admin users failed (${r.status}): ${t.slice(0, 400)}`);
    }
    const j = await r.json();
    const users = j.users ?? [];
    const u = users.find((x) => (x.email ?? "").toLowerCase() === want);
    if (u?.id) return u.id;
    if (users.length < 200) break;
  }
  return null;
}

/** @param {string} base */
async function fetchLatestObservationForUser(base, serviceKey, userId) {
  const q = new URLSearchParams({
    user_id: `eq.${userId}`,
    select: "id,url,region,captured_at",
    order: "captured_at.desc",
    limit: "1",
  });
  const url = `${base}/rest/v1/observations?${q.toString()}`;
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      Accept: "application/json",
    },
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`observations select failed (${r.status}): ${t.slice(0, 400)}`);
  }
  const rows = await r.json();
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

function normalizeOrigin(input) {
  const t = (input || "").trim();
  if (!t) return "https://viewtrace.net";
  try {
    const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t.replace(/^\/+/, "")}`;
    return new URL(withScheme).origin;
  } catch {
    return "https://viewtrace.net";
  }
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Cron と同様: 主リンクは短い open URL、併記でフル URL */
function observationRecordLinkHtml(openUrl, detailUrl) {
  const primary = escapeHtml(openUrl);
  const full = escapeHtml(detailUrl);
  return [
    '<p style="margin:12px 0;line-height:1.5;word-break:break-all;overflow-wrap:anywhere;-webkit-hyphens:none;hyphens:none;">',
    `<a href="${primary}" style="color:#2563eb;text-decoration:underline;word-break:break-all;overflow-wrap:anywhere;">Open record / 記録を開く</a>`,
    "</p>",
    '<p style="margin:8px 0 0;font-size:13px;color:#444;line-height:1.45;word-break:break-all;overflow-wrap:anywhere;-webkit-hyphens:none;hyphens:none;">',
    primary,
    "</p>",
    '<p style="margin:10px 0 0;font-size:12px;color:#666;line-height:1.45;word-break:break-all;overflow-wrap:anywhere;-webkit-hyphens:none;hyphens:none;">',
    "Alternate (long URL) / 別形式のURL:<br/>",
    full,
    "</p>",
  ].join("");
}

const apiKey = process.env.RESEND_API_KEY?.trim();
const toRaw = process.argv[2]?.trim();
const modeArg = process.argv[3]?.trim();
if (!apiKey) {
  console.error("Missing RESEND_API_KEY in .env.local (or environment).");
  process.exit(1);
}
if (!toRaw) {
  console.error(
    "Usage:\n  npm run test:scheduled-obs-email -- <email>\n  npm run test:scheduled-obs-email -- <email> --latest\n  npm run test:scheduled-obs-email -- <email> <observation-uuid>",
  );
  process.exit(1);
}

/** 第3引数あり＝実在 ID（--latest または UUID 明示） */
const usesRealObsId = Boolean(modeArg);

const originOverride = process.env.VIEWTRACE_PUBLIC_APP_ORIGIN?.trim();
const rawSite = process.env.NEXT_PUBLIC_SITE_URL?.trim();
/** メール内リンク: ローカルの Site URL のままだと届いたメールから開けないので viewtrace に寄せる */
let origin = originOverride ? normalizeOrigin(originOverride) : normalizeOrigin(rawSite);
if (/localhost|127\.0\.0\.1/i.test(origin) && !originOverride) {
  origin = "https://viewtrace.net";
}

let obsId;
let demoUrl = "https://example.com/";
let demoRegion = "US-CA";
let demoSnapshot = "https://example.com/snapshot-placeholder.png";
let realRecordNote = "";

if (modeArg === "--latest") {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!rawUrl || !serviceKey) {
    console.error("For --latest, set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.");
    process.exit(1);
  }
  const base = normalizeSupabaseUrl(rawUrl);
  const userId = await findUserIdByEmail(base, serviceKey, toRaw);
  if (!userId) {
    console.error(`No Supabase auth user found for email: ${toRaw}`);
    process.exit(1);
  }
  const row = await fetchLatestObservationForUser(base, serviceKey, userId);
  if (!row?.id) {
    console.error("No observations row found for this user (dashboard に記録が無い可能性があります).");
    process.exit(1);
  }
  obsId = row.id;
  demoUrl = row.url || demoUrl;
  demoRegion = row.region || demoRegion;
  demoSnapshot = "https://example.com/snapshot-placeholder.png";
  realRecordNote =
    localeNoteRealRecord(row);
} else if (modeArg && modeArg !== "--latest") {
  obsId = modeArg.replace(/^["']|["']$/g, "").trim();
  realRecordNote =
    "指定した記録 ID で送っています（DB に無いと 404）。Using the id you passed (404 if not in DB).";
} else {
  obsId = randomUUID();
  realRecordNote =
    "ランダム UUID のため、開くと 404 になります。Random UUID — opening the link will 404.";
}

function localeNoteRealRecord(row) {
  const when = row.captured_at ?? "不明";
  return `記録日時（UTC）: ${when}`;
}

const detailUrl = `${origin}/dashboard/observations/${obsId}`;
const openUrl = `${origin}/api/open/observation?id=${encodeURIComponent(obsId)}`;

const from = process.env.RESEND_FROM?.trim() || "Viewtrace <onboarding@resend.dev>";
const subject = usesRealObsId
  ? "Viewtrace: テスト送信（実レコードのリンク）/ test · real observation link"
  : "Viewtrace: テスト送信（体裁サンプル）/ test · layout sample";

const textIntro = usesRealObsId
  ? [
      "【テスト送信】定期自動観測メールと同じ体裁です。リンクは実データの記録 ID です。",
      "[Test] Same layout as scheduled auto-observation; links point to a real observation id.",
    ].join("\n")
  : [
      "【テスト送信】定期自動観測メールと同じ体裁のサンプルです（記録 ID はダミー）。",
      "[Test] Sample mail — same layout as scheduled auto-observation (dummy observation id).",
    ].join("\n");

const text = [
  textIntro,
  "",
  `URL: ${demoUrl}`,
  `Region / 地域: ${demoRegion}`,
  usesRealObsId
    ? "スナップショット: テストのため本文には添付していません（記録ページで確認できます）。"
    : `Snapshot / スナップショット: ${demoSnapshot} (example — not a real capture)`,
  "",
  `Open record / 記録を開く (short URL / 短いURL): ${openUrl}`,
  "",
  `Full URL / 従来のURL: ${detailUrl}`,
  "",
  realRecordNote,
].join("\n");

const htmlIntro = usesRealObsId
  ? "<p><strong>【テスト送信】</strong>定期自動観測メールと同じ体裁です。リンクは<strong>実際の記録 ID</strong>です。<br/><span style=\"font-size:13px;color:#555\">[Test] Same layout as production; links use a real observation id.</span></p>"
  : "<p><strong>【テスト送信】</strong>定期自動観測メールと同じ体裁のサンプルです（記録 ID はダミー）。<br/><span style=\"font-size:13px;color:#555\">[Test] Layout sample — dummy observation id.</span></p>";

const html = [
  htmlIntro,
  `<p><strong>URL</strong><br/>${escapeHtml(demoUrl)}</p>`,
  `<p><strong>Region</strong> / 地域<br/>${escapeHtml(demoRegion)}</p>`,
  usesRealObsId
    ? "<p>スナップショットはテストのため本文では省略しています。記録ページからご確認ください。<br/><span style=\"font-size:12px;color:#666\">Snapshot omitted in this test — see the record page.</span></p>"
    : `<p><a href="${escapeHtml(demoSnapshot)}">Snapshot link</a> (example)</p>`,
  observationRecordLinkHtml(openUrl, detailUrl),
  `<p style="font-size:12px;color:#666">${escapeHtml(realRecordNote)}</p>`,
].join("");

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ from, to: [toRaw], subject, text, html }),
});

const bodyText = await res.text();
if (!res.ok) {
  console.error(`Resend API error (${res.status}):`, bodyText);
  process.exit(1);
}

let id;
try {
  id = JSON.parse(bodyText).id;
} catch {
  id = bodyText;
}
console.log("OK: test email sent to", toRaw);
console.log("  Resend id:", id);
console.log("  Short open URL (primary in email):", openUrl);
console.log("  Full dashboard URL:", detailUrl);
