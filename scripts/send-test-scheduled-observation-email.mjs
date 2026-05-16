#!/usr/bin/env node
/**
 * 定期自動観測 Cron と同じ体裁のテストメールを 1 通送る（Resend）。
 *
 * 事前: .env.local に RESEND_API_KEY（必須）。本番ドメイン送信なら RESEND_FROM も。
 *
 * 使用例:
 *   npm run test:scheduled-obs-email -- u421ki@icloud.com
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

const apiKey = process.env.RESEND_API_KEY?.trim();
const toRaw = process.argv[2]?.trim();
if (!apiKey) {
  console.error("Missing RESEND_API_KEY in .env.local (or environment).");
  process.exit(1);
}
if (!toRaw) {
  console.error("Usage: npm run test:scheduled-obs-email -- <email>\nExample: npm run test:scheduled-obs-email -- u421ki@icloud.com");
  process.exit(1);
}

const originOverride = process.env.VIEWTRACE_PUBLIC_APP_ORIGIN?.trim();
const rawSite = process.env.NEXT_PUBLIC_SITE_URL?.trim();
/** メール内リンク: ローカルの Site URL のままだと届いたメールから開けないので viewtrace に寄せる */
let origin = originOverride ? normalizeOrigin(originOverride) : normalizeOrigin(rawSite);
if (/localhost|127\.0\.0\.1/i.test(origin) && !originOverride) {
  origin = "https://viewtrace.net";
}
const obsId = randomUUID();
const detailUrl = `${origin}/dashboard/observations/${obsId}`;
const demoUrl = "https://example.com/";
const demoRegion = "US-CA";
const demoSnapshot = "https://example.com/snapshot-placeholder.png";

const from = process.env.RESEND_FROM?.trim() || "Viewtrace <onboarding@resend.dev>";
const subject = "Viewtrace: scheduled observation / 定期自動観測 [TEST]";

const text = [
  "This is a TEST email (same layout as scheduled auto-observation).",
  "これは定期自動観測メールと同じ体裁のテストです。",
  "",
  `URL: ${demoUrl}`,
  `Region / 地域: ${demoRegion}`,
  `Snapshot / スナップショット: ${demoSnapshot} (example — not a real capture)`,
  "",
  `Open record / 記録を開く (sample ID): ${detailUrl}`,
  "",
  "Note: The link uses a random UUID; open your real record from the dashboard unless you match this ID in DB.",
].join("\n");

const html = [
  "<p><strong>TEST</strong> — same layout as scheduled auto-observation.</p>",
  "<p>テストです（定期自動観測メールと同じ体裁）。</p>",
  `<p><strong>URL</strong><br/>${escapeHtml(demoUrl)}</p>`,
  `<p><strong>Region</strong> / 地域<br/>${escapeHtml(demoRegion)}</p>`,
  `<p><a href="${escapeHtml(demoSnapshot)}">Snapshot link</a> (example)</p>`,
  `<p><a href="${escapeHtml(detailUrl)}">Open record / 記録を開く</a></p>`,
  "<p style=\"font-size:12px;color:#666\">Sample observation ID in URL is random; use Dashboard for a real record.</p>",
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
console.log("  Sample open-record URL:", detailUrl);
