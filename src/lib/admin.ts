import type { SessionPayload } from "@/lib/auth/session";

function splitCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function adminEmailAllowlist(): string[] {
  return splitCsv(process.env.ADMIN_EMAILS);
}

export function activationExcludeEmailAllowlist(): string[] {
  return splitCsv(process.env.ACTIVATION_EXCLUDE_EMAILS);
}

/** 管理者判定（アプリ内ツールの保護用） */
export function isAdminSession(session: SessionPayload): boolean {
  const allowlist = adminEmailAllowlist();
  if (allowlist.length === 0) return false;
  return allowlist.includes(session.email);
}

/**
 * Activation の「外部ユーザー」から除外する。
 * ADMIN_EMAILS（管理権限あり）とは別に、既知のテスト／検証アドレスだけを
 * ACTIVATION_EXCLUDE_EMAILS に置く。管理画面は増やさない。
 */
export function isInternalActivationEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  if (!e) return false;
  if (e.endsWith("@viewtrace.net")) return true;
  const admins = adminEmailAllowlist().map((s) => s.toLowerCase());
  if (admins.includes(e)) return true;
  const tests = activationExcludeEmailAllowlist().map((s) => s.toLowerCase());
  return tests.includes(e);
}

