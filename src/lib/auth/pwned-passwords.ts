import { createHash } from "node:crypto";

import type { LoginLocale } from "@/lib/auth/login-copy";

/**
 * HaveIBeenPwned「Pwned Passwords」API（k-anonymity モード）。
 *
 * - SHA-1 ハッシュの **先頭 5 文字** だけを送信し、応答（同じ prefix を持つ
 *   ハッシュ群と漏洩回数）をローカルで突合する → パスワード本体や完全な
 *   ハッシュは外部に送らない。
 * - Add-Padding ヘッダで応答にランダム長のパディングが付き、サイズから
 *   推測されにくくする。
 * - Supabase Free プランでは「Prevent use of leaked passwords」を有効化
 *   できないため、サインアップ時にこのチェックをアプリ側で実施する。
 */

const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range/";
const REQUEST_TIMEOUT_MS = 2500;

/**
 * 漏洩件数を返す（0 = 未漏洩）。タイムアウト・ネットワーク失敗時は 0 を返す
 * （= 通す。失敗で全ユーザーをブロックするのは UX 上避ける fail-open 設計）。
 */
export async function pwnedPasswordCount(password: string): Promise<number> {
  if (!password) return 0;
  const sha1Upper = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  const prefix = sha1Upper.slice(0, 5);
  const suffix = sha1Upper.slice(5);

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${HIBP_RANGE_URL}${prefix}`, {
      method: "GET",
      headers: {
        "Add-Padding": "true",
        "User-Agent": "Viewtrace-Auth-HIBP",
        Accept: "text/plain",
      },
      signal: ac.signal,
      cache: "no-store",
    });
    if (!res.ok) return 0;
    const text = await res.text();
    for (const line of text.split(/\r?\n/)) {
      const colonIdx = line.indexOf(":");
      if (colonIdx <= 0) continue;
      const hashSuffix = line.slice(0, colonIdx).trim().toUpperCase();
      if (hashSuffix !== suffix) continue;
      const n = Number.parseInt(line.slice(colonIdx + 1).trim(), 10);
      return Number.isFinite(n) && n > 0 ? n : 0;
    }
    return 0;
  } catch {
    return 0;
  } finally {
    clearTimeout(timer);
  }
}

export async function isPasswordPwned(password: string): Promise<boolean> {
  return (await pwnedPasswordCount(password)) >= 1;
}

export function pwnedPasswordErrorMessage(locale: LoginLocale, count?: number): string {
  if (locale === "ja") {
    const detail = count && count > 0 ? `（過去の漏洩で約 ${count.toLocaleString("ja-JP")} 件確認されています）` : "";
    return `このパスワードは既知の漏洩リストに含まれています${detail}。別のパスワードを設定してください。`;
  }
  const detail = count && count > 0 ? ` (seen ~${count.toLocaleString("en-US")} times in breaches)` : "";
  return `This password has appeared in known data breaches${detail}. Please choose a different one.`;
}
