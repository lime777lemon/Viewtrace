"use client";

import { useMemo, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { POST_EMAIL_VERIFY_PATH } from "@/lib/auth/email-verified-copy";
import {
  absoluteUrlForNextPath,
  postAuthSideEffectsBeforeNavigate,
} from "@/lib/auth/post-auth-redirect";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { sanitizeDashboardObservationHrefPath } from "@/lib/observation-route-id";

type Status = "working" | "error";

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
 * `#access_token=...` などサーバーに届かない fragment のみここで処理する。
 * 通常の PKCE（?code=）は親の route.ts が処理する。
 */
export default function AuthCallbackFragmentPage() {
  const sp = useSearchParams();
  const nextPath = useMemo(() => {
    const nextRaw = sp?.get("next")?.trim() ?? POST_EMAIL_VERIFY_PATH;
    const base =
      nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : POST_EMAIL_VERIFY_PATH;
    return sanitizeDashboardObservationHrefPath(base);
  }, [sp]);
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
            const { error } = await withTimeout(
              supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              }),
              25_000,
              "setSession",
            );
            if (error) throw error;
            if (!cancelled) {
              const { data: sessionCheck } = await supabase.auth.getSession();
              if (cancelled) return;
              if (!sessionCheck.session) throw new Error("missing_session_after_setSession");
              await postAuthSideEffectsBeforeNavigate();
              if (cancelled) return;
              window.location.replace(absoluteUrlForNextPath(nextPath));
            }
            return;
          }
        }

        const { data, error } = await withTimeout(supabase.auth.getSession(), 25_000, "getSession");
        if (error) throw error;
        if (!data?.session) throw new Error("missing_session_in_callback");

        if (!cancelled) {
          await postAuthSideEffectsBeforeNavigate();
          if (cancelled) return;
          window.location.replace(absoluteUrlForNextPath(nextPath));
        }
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
            へ戻り、必要に応じて同じメールアドレスで「無料で始める」から登録し直すか、
            <a href="/contact" className="font-semibold text-accent hover:text-accent-hover">
              お問い合わせ
            </a>
            ください。
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
