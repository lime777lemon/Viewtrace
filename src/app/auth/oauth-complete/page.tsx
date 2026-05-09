"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { POST_EMAIL_VERIFY_PATH } from "@/lib/auth/email-verified-copy";
import {
  absoluteUrlForNextPath,
  postAuthSideEffectsBeforeNavigate,
} from "@/lib/auth/post-auth-redirect";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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

    let cancelled = false;

    async function run() {
      const code = authCode;
      if (!code) return;
      try {
        const supabase = createSupabaseBrowserClient();
        const { error } = await withTimeout(
          supabase.auth.exchangeCodeForSession(code),
          25_000,
          "exchangeCodeForSession",
        );
        if (cancelled) return;
        if (error) {
          router.replace(
            `/auth/auth-code-error?reason=${encodeURIComponent(error.message ?? "exchange_failed")}`,
          );
          return;
        }

        const { data: sessionCheck } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!sessionCheck.session) {
          router.replace("/auth/auth-code-error?reason=no_session_after_exchange");
          return;
        }

        await postAuthSideEffectsBeforeNavigate();
        if (cancelled) return;
        window.location.replace(absoluteUrlForNextPath(nextPath));
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "unknown_error";
        setMessage("エラーが発生しました。ログインへ移動します…");
        router.replace(`/auth/auth-code-error?reason=${encodeURIComponent(msg)}`);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
    // useSearchParams のオブジェクト参照はレンダーごとに変わりうる。プリミティブだけに依存しないと
    // クリーンアップで exchange が毎回キャンセルされ、画面が止まったままになる。
  }, [authCode, nextRaw, router]);

  return (
    <div className="mx-auto flex min-h-[40vh] max-w-md flex-col justify-center px-4 py-16 text-center">
      <p className="text-sm text-[var(--color-ink-muted)]">{message}</p>
    </div>
  );
}

export default function OAuthCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[40vh] max-w-md flex-col justify-center px-4 py-16 text-center">
          <p className="text-sm text-[var(--color-ink-muted)]">読み込み中…</p>
        </div>
      }
    >
      <OAuthCompleteInner />
    </Suspense>
  );
}
