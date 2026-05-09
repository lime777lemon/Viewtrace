"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { POST_EMAIL_VERIFY_PATH } from "@/lib/auth/email-verified-copy";

/**
 * Supabase の Site URL が `/` のとき、確認メールのリダイレクト先がトップ＋`#access_token=…` になることがある。
 * そのままではランディングが表示されたままなので、既存の fragment ハンドラへ渡す。
 */
export function SupabaseHomeAuthCapture() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined" || pathname !== "/") return;

    const hash = window.location.hash;
    if (hash.length > 1) {
      const hp = new URLSearchParams(hash.slice(1));
      if (hp.get("access_token") && hp.get("refresh_token")) {
        const next = encodeURIComponent(POST_EMAIL_VERIFY_PATH);
        window.location.replace(
          `${window.location.origin}/auth/callback/fragment?next=${next}${hash}`,
        );
        return;
      }
    }

    const sp = new URLSearchParams(window.location.search);
    const code = sp.get("code");
    const type = sp.get("type");
    if (code && (type === "signup" || type === "email")) {
      const next = encodeURIComponent(POST_EMAIL_VERIFY_PATH);
      window.location.replace(
        `${window.location.origin}/auth/oauth-complete?code=${encodeURIComponent(code)}&next=${next}`,
      );
    }
  }, [pathname]);

  return null;
}
