#!/usr/bin/env node
/**
 * Push Confirm signup email template (token_hash + verifyOtp) to hosted Supabase via Management API.
 *
 * Requires:
 *   SUPABASE_ACCESS_TOKEN — https://supabase.com/dashboard/account/tokens
 *   SUPABASE_PROJECT_REF  — project ref (Dashboard URL) or infer from NEXT_PUBLIC_SUPABASE_URL
 *
 * Usage:
 *   npm run sync:supabase-confirmation-email
 *
 * Alternative (linked CLI):
 *   supabase login && supabase link --project-ref YOUR_REF && supabase config push
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

/** Load .env.local into process.env (only keys not already set). */
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

function projectRefFromSupabaseUrl(url) {
  if (!url) return null;
  const m = String(url).trim().match(/https?:\/\/([a-z0-9-]+)\.supabase\.co/i);
  return m?.[1] ?? null;
}

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const ref =
  process.env.SUPABASE_PROJECT_REF?.trim() ||
  projectRefFromSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);

if (!token) {
  console.error(
    "Missing SUPABASE_ACCESS_TOKEN.\n" +
      "  1. https://supabase.com/dashboard/account/tokens で Personal Access Token を作成\n" +
      "  2. .env.local に追加: SUPABASE_ACCESS_TOKEN=sbp_...\n" +
      "     （anon / service_role キーとは別物です）\n" +
      "  3. 再度: npm run sync:supabase-confirmation-email",
  );
  process.exit(1);
}
if (!ref) {
  console.error(
    "Missing SUPABASE_PROJECT_REF (or NEXT_PUBLIC_SUPABASE_URL like https://xxxx.supabase.co)",
  );
  process.exit(1);
}

const bodyPath = join(root, "supabase/templates/confirmation-body.html");
const content = readFileSync(bodyPath, "utf8").trim();

if (content.includes("{{ .ConfirmationURL }}") && !content.includes("token_hash")) {
  console.error("confirmation-body.html still uses ConfirmationURL only — aborting.");
  process.exit(1);
}
if (!content.includes("token_hash") || !content.includes("type=signup")) {
  console.error("confirmation-body.html must include token_hash and type=signup.");
  process.exit(1);
}

const subject =
  process.env.SUPABASE_CONFIRMATION_EMAIL_SUBJECT?.trim() ||
  "Viewtrace: メールアドレスの確認 / Confirm your signup";

const url = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
const res = await fetch(url, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    mailer_subjects_confirmation: subject,
    mailer_templates_confirmation_content: content,
  }),
});

const text = await res.text();
if (!res.ok) {
  console.error(`PATCH ${url} failed (${res.status}):`, text);
  process.exit(1);
}

console.log(`OK: Confirm signup template updated on project ${ref}`);
console.log("  - Uses {{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup");
console.log("  - Matches src/app/auth/callback/route.ts verifyOtp branch");
console.log("\nSend a new signup test email and confirm the link has token_hash= (not ?code= only).");
