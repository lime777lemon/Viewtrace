"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function OAuthCompleteInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState("認証を完了しています…");

  useEffect(() => {
    const authCode = sp.get("code");
    const nextRaw = sp.get("next")?.trim() ?? "";
    const nextPath =
      nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";

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
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          router.replace(
            `/auth/auth-code-error?reason=${encodeURIComponent(error.message ?? "exchange_failed")}`,
          );
          return;
        }

        await fetch("/api/auth/after-exchange", {
          method: "POST",
          credentials: "include",
        });

        if (cancelled) return;
        window.location.replace(nextPath);
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
  }, [sp, router]);

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
