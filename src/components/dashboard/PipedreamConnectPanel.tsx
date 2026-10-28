"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PipedreamClient } from "@pipedream/sdk/browser";
import type { ConnectedAccountView } from "@/lib/pipedream";

const APPS = [
  { slug: "slack", label: "Slack" },
  { slug: "gmail", label: "Gmail" },
  { slug: "notion", label: "Notion" },
] as const;

type Props = {
  externalUserId: string;
  configured: boolean;
  accounts: ConnectedAccountView[];
  locale: "ja" | "en";
};

export function PipedreamConnectPanel({ externalUserId, configured, accounts, locale }: Props) {
  const router = useRouter();
  const ja = locale === "ja";
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function connect(app: string) {
    if (pending) return;
    setPending(app);
    setMessage(null);
    setError(null);
    try {
      const client = new PipedreamClient({
        projectEnvironment: "production",
        externalUserId,
        tokenCallback: async () => {
          const res = await fetch("/api/connect-token", { method: "POST" });
          if (!res.ok) throw new Error("token");
          const body = (await res.json()) as { token: string; expiresAt: string; connectLinkUrl: string };
          return {
            token: body.token,
            expiresAt: new Date(body.expiresAt),
            connectLinkUrl: body.connectLinkUrl,
          };
        },
      });
      await client.connectAccount({
        app,
        onSuccess: () => {
          setMessage(ja ? "接続しました。" : "Connected.");
          router.refresh();
        },
        onError: () => {
          setError(ja ? "接続できませんでした。" : "Could not connect.");
        },
      });
    } catch {
      setError(
        ja
          ? "接続を開始できませんでした。PIPEDREAM_CLIENT_ID と PIPEDREAM_CLIENT_SECRET を確認してください。"
          : "Could not start Connect. Check PIPEDREAM_CLIENT_ID and PIPEDREAM_CLIENT_SECRET.",
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface-elevated px-5 py-4">
      <h2 className="font-display text-lg font-semibold text-ink">Pipedream Connect</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">
        {ja
          ? "本番プロジェクト proj_RMslV4y に、このログインユーザーのアカウントを接続します。"
          : "Connect this signed-in user in production project proj_RMslV4y."}
      </p>
      {configured ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {APPS.map((app) => (
            <button
              key={app.slug}
              type="button"
              disabled={pending !== null}
              onClick={() => connect(app.slug)}
              className="inline-flex rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink hover:border-accent/40 disabled:opacity-60"
            >
              {pending === app.slug ? (ja ? "接続中…" : "Connecting…") : app.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-ink">
          {ja
            ? "サーバーに PIPEDREAM_CLIENT_ID と PIPEDREAM_CLIENT_SECRET を設定すると、ここから接続できます。"
            : "Set PIPEDREAM_CLIENT_ID and PIPEDREAM_CLIENT_SECRET on the server to connect from here."}
        </p>
      )}
      {message ? <p className="mt-3 text-sm text-ink">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-ink">{error}</p> : null}
      <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {ja ? "接続済み" : "Connected"}
      </h3>
      {accounts.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">{ja ? "まだありません。" : "None yet."}</p>
      ) : (
        <ul className="mt-2 space-y-2 text-sm text-ink">
          {accounts.map((account) => (
            <li key={account.id}>
              {account.appName}
              {account.healthy === false ? (ja ? " · 要確認" : " · needs attention") : ""}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
