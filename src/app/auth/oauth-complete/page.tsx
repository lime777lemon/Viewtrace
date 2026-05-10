"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { POST_EMAIL_VERIFY_PATH } from "@/lib/auth/email-verified-copy";
import {
  absoluteUrlForNextPath,
  postAuthSideEffectsBeforeNavigate,
} from "@/lib/auth/post-auth-redirect";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * React Strict Mode（開発）で useEffect が即リマウントされ、同じ PKCE code で exchange が
 * 二重起動して競合・タイムアウトしやすい。同一 code の同時実行を抑止する。
 */
const pkceExchangeInFlight = new Set<string>();

function OAuthCompleteInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const [phase, setPhase] = useState<"loading" | "success">("loading");
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
        // 人為の短いタイムアウトで切ると、実際は PKCE 失敗・別ブラウザ等なのに
        // exchangeCodeForSession_timeout だけが出て原因が隠れる。Supabase のエラーをそのまま返す。
        const { error } = await supabase.auth.exchangeCodeForSession(code);
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
        setPhase("success");
        await new Promise<void>((r) => setTimeout(r, 1200));
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
      {phase === "success" ? (
        <>
          <p className="font-display text-2xl font-semibold tracking-tight text-emerald-800 dark:text-emerald-200">
            認証成功
          </p>
          <p className="mt-3 text-sm text-ink-muted">まもなく次の画面へ移動します…</p>
        </>
      ) : (
        <>
          <p className="text-sm text-ink-muted">{message}</p>
          <p className="mt-5 text-xs leading-relaxed text-ink-muted">
            メールのリンクは「パスワード登録時と同じブラウザ」で開いてください。
            別の端末やアプリ内ブラウザだけだと、確認コード（PKCE）と組み合わせられず失敗することがあります（Supabase
            のユーザー一覧に載っていることとは別の問題です）。
          </p>
        </>
      )}
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
