"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { POST_EMAIL_VERIFY_PATH } from "@/lib/auth/email-verified-copy";
import {
  absoluteUrlForNextPath,
  postAuthSideEffectsBeforeNavigate,
} from "@/lib/auth/post-auth-redirect";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** メール確認・モバイル回線などで exchange が遅いことがあるため余裕を持つ */
const EXCHANGE_CODE_FOR_SESSION_MS = 90_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label}_timeout`)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/**
 * React Strict Mode（開発）で useEffect が即リマウントされ、同じ PKCE code で exchange が
 * 二重起動して競合・タイムアウトしやすい。同一 code の同時実行を抑止する。
 */
const pkceExchangeInFlight = new Set<string>();

function OAuthCompleteInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState("認証を完了しています…");
  const authCode = sp.get("code");
  const nextRaw = sp.get("next")?.trim() ?? "";

  useEffect(() => {
    const nextPath =
      nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : POST_EMAIL_VERIFY_PATH;

    if (!authCode) {
      router.replace("/auth/auth-code-error?reason=missing_code");
      return;
    }

    if (pkceExchangeInFlight.has(authCode)) {
      return;
    }
    pkceExchangeInFlight.add(authCode);

    async function run() {
      const code = authCode;
      if (!code) return;
      try {
        const supabase = createSupabaseBrowserClient();
        const { error } = await withTimeout(
          supabase.auth.exchangeCodeForSession(code),
          EXCHANGE_CODE_FOR_SESSION_MS,
          "exchangeCodeForSession",
        );
        if (error) {
          router.replace(
            `/auth/auth-code-error?reason=${encodeURIComponent(error.message ?? "exchange_failed")}`,
          );
          return;
        }

        const { data: sessionCheck } = await supabase.auth.getSession();
        if (!sessionCheck.session) {
          router.replace("/auth/auth-code-error?reason=no_session_after_exchange");
          return;
        }

        await postAuthSideEffectsBeforeNavigate();
        window.location.replace(absoluteUrlForNextPath(nextPath));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "unknown_error";
        setMessage("エラーが発生しました。ログインへ移動します…");
        router.replace(`/auth/auth-code-error?reason=${encodeURIComponent(msg)}`);
      } finally {
        pkceExchangeInFlight.delete(authCode);
      }
    }

    void run();
  }, [authCode, nextRaw, router]);

  return (
    <div className="mx-auto flex min-h-[40vh] max-w-md flex-col justify-center px-4 py-16 text-center">
      <p className="text-sm text-ink-muted">{message}</p>
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
      <OAuthCompleteInner />
    </Suspense>
  );
}
