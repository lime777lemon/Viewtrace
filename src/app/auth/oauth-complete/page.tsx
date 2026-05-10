"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { POST_EMAIL_VERIFY_PATH } from "@/lib/auth/email-verified-copy";

/**
 * 互換用。PKCE の code 交換は `/auth/callback` の Route Handler で行う（Cookie から verifier を読む）。
 * 旧リンク・ブックマークでこの URL に来た場合は callback へ回す。
 */
function OAuthCompleteRedirectInner() {
  const sp = useSearchParams();

  useEffect(() => {
    const code = sp.get("code");
    const nextRaw = sp.get("next")?.trim() ?? "";
    const next =
      nextRaw.startsWith("/") && !nextRaw.startsWith("//")
        ? nextRaw
        : POST_EMAIL_VERIFY_PATH;

    if (!code) {
      window.location.replace(
        `${window.location.origin}/auth/auth-code-error?reason=${encodeURIComponent("missing_code")}`,
      );
      return;
    }

    const u = new URL("/auth/callback", window.location.origin);
    u.searchParams.set("code", code);
    u.searchParams.set("next", next);
    window.location.replace(u.href);
  }, [sp]);

  return (
    <div className="mx-auto flex min-h-[40vh] max-w-md flex-col justify-center px-4 py-16 text-center">
      <p className="text-sm text-ink-muted">認証を完了しています…</p>
    </div>
  );
}

export default function OAuthCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[40vh] max-w-md flex-col justify-center px-4 py-16 text-center">
          <p className="text-sm text-ink-muted">読み込み中…</p>
        </div>
      }
    >
      <OAuthCompleteRedirectInner />
    </Suspense>
  );
}
