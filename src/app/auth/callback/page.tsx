"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Status = "working" | "error";

export default function AuthCallbackPage() {
  const sp = useSearchParams();
  const nextRaw = sp?.get("next")?.trim() ?? "/dashboard";
  const nextPath = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";
  const [status, setStatus] = useState<Status>("working");
  const [detail, setDetail] = useState<string | null>(null);

  const title = useMemo(() => {
    return status === "working" ? "認証を完了しています…" : "認証を完了できませんでした";
  }, [status]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const supabase = createSupabaseBrowserClient();
        if (!sp) throw new Error("missing_search_params");

        // 0) token_hash flow (email links often use this)
        const tokenHash = sp.get("token_hash");
        const type = sp.get("type");
        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as "signup" | "recovery" | "invite" | "magiclink" | "email_change",
          });
          if (error) throw error;
          if (!cancelled) window.location.assign(nextPath);
          return;
        }

        // 1) PKCE code flow (query param)
        const code = sp.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (!cancelled) window.location.assign(nextPath);
          return;
        }

        // 2) Implicit flow (hash fragment: #access_token=...&refresh_token=...)
        // supabase-js はブラウザ環境では detectSessionInUrl により URL からセッションを検出して保存する。
        // Route Handler では hash を読めないため、ここでセッションが入ったことを確認する。
        const hash = typeof window !== "undefined" ? window.location.hash : "";
        if (hash.startsWith("#")) {
          const hp = new URLSearchParams(hash.slice(1));
          const accessToken = hp.get("access_token");
          const refreshToken = hp.get("refresh_token");
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) throw error;
            if (!cancelled) window.location.assign(nextPath);
            return;
          }
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data?.session) throw new Error("missing_session_in_callback");

        if (!cancelled) window.location.assign(nextPath);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "unknown_error";
        setDetail(msg);
        setStatus("error");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [sp, nextPath]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-16 text-center">
      <h1 className="font-display text-xl font-semibold text-[var(--color-ink)]">{title}</h1>
      {status === "working" ? (
        <p className="mt-3 text-sm text-[var(--color-ink-muted)]">この画面は自動的に遷移します。</p>
      ) : (
        <div className="mt-4 text-sm text-[var(--color-ink-muted)]">
          <p>リンクの有効期限切れ、または設定の不整合の可能性があります。</p>
          <p className="mt-3">
            <a
              href="/login"
              className="font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
            >
              ログイン画面
            </a>
            へ戻り、「確認メールを再送」をお試しください。
          </p>
          {detail ? (
            <p className="mt-4 break-all font-mono text-[11px] text-[var(--color-ink-muted)]/80">
              {detail}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

