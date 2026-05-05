import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "認証エラー | Viewtrace",
  robots: { index: false, follow: false },
};

function getOriginFromHeaders(h: Headers): string | null {
  const origin = h.get("origin");
  if (origin) return origin;
  const forwardedProto = h.get("x-forwarded-proto");
  const forwardedHost = h.get("x-forwarded-host");
  if (forwardedProto && forwardedHost) return `${forwardedProto}://${forwardedHost}`;
  const host = h.get("host");
  if (host) return `http://${host}`;
  return null;
}

export default async function AuthCodeErrorPage() {
  const h = await headers();
  const origin = getOriginFromHeaders(h);
  const callbackUrl = origin ? `${origin.replace(/\/+$/, "")}/auth/callback` : null;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-16 text-center">
      <h1 className="font-display text-xl font-semibold text-[var(--color-ink)]">認証を完了できませんでした</h1>
      <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
        リンクの有効期限切れ、または設定の不整合の可能性があります。もう一度ログインまたは登録をお試しください。
      </p>
      <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 text-left text-xs leading-relaxed text-[var(--color-ink-muted)]">
        <p className="font-medium text-[var(--color-ink)]">よくある原因</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>確認メールのリンクの期限が切れている</li>
          <li>
            Supabase の Redirect URLs に <span className="font-mono">/auth/callback</span>{" "}
            が登録されていない（ローカルはポート番号も含めて一致が必要）
          </li>
          <li>別のドメイン/別ポートで開いた（例: 3000 と 3001 の違い）</li>
        </ul>
        {callbackUrl ? (
          <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <p className="font-medium text-[var(--color-ink)]">この環境で登録すべき Redirect URL（目安）</p>
            <p className="mt-2 break-all font-mono text-[11px] text-[var(--color-ink)]">{callbackUrl}</p>
          </div>
        ) : null}
        <p className="mt-3">
          確認メールが届かない・リンクが無効な場合は、ログイン画面下部の「確認メールを再送」をお試しください。
        </p>
      </div>
      <Link
        href="/login"
        className="mt-8 inline-flex justify-center rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
      >
        ログインへ
      </Link>
    </div>
  );
}
