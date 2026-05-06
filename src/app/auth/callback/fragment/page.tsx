"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Status = "working" | "error";

/**
 * `#access_token=...` などサーバーに届かない fragment のみここで処理する。
 * 通常の PKCE（?code=）は親の route.ts が処理する。
 */
export default function AuthCallbackFragmentPage() {
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
            if (!cancelled) window.location.replace(nextPath);
            return;
          }
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data?.session) throw new Error("missing_session_in_callback");

        try {
          const { data: userData } = await supabase.auth.getUser();
          const email = userData.user?.email ?? null;
          if (email) {
            const locale =
              typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("ja")
                ? "ja"
                : "en";
            const { error: insertError } = await supabase.from("trial_signups").insert({
              email,
              locale,
              source: "auth",
            });
            if (insertError && insertError.code !== "23505") {
              console.warn("[auth] trial_signups insert failed", insertError.code, insertError.message);
            }
          }
        } catch (e) {
          console.warn("[auth] trial_signups insert skipped", e);
        }

        if (!cancelled) window.location.replace(nextPath);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "unknown_error";
        setDetail(msg);
        setStatus("error");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [nextPath]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-16 text-center">
      <h1 className="font-display text-xl font-semibold text-ink">{title}</h1>
      {status === "working" ? (
        <p className="mt-3 text-sm text-ink-muted">この画面は自動的に遷移します。</p>
      ) : (
        <div className="mt-4 text-sm text-ink-muted">
          <p>リンクの有効期限切れ、または設定の不整合の可能性があります。</p>
          <p className="mt-3">
            <a
              href="/login"
              className="font-semibold text-accent hover:text-accent-hover"
            >
              ログイン画面
            </a>
            へ戻り、「確認メールを再送」をお試しください。
          </p>
          {detail ? (
            <p className="mt-4 break-all font-mono text-[11px] text-ink-muted/80">
              {detail}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
