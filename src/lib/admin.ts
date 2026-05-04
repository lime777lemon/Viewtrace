import type { SessionPayload } from "@/lib/auth/session";

function splitCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 管理者判定（アプリ内ツールの保護用） */
export function isAdminSession(session: SessionPayload): boolean {
  const allowlist = splitCsv(process.env.ADMIN_EMAILS);
  if (allowlist.length === 0) return false;
  return allowlist.includes(session.email);
}

