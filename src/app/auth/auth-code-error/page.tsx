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

export default async function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const h = await headers();
  const origin = getOriginFromHeaders(h);
  const callbackUrl = origin ? `${origin.replace(/\/+$/, "")}/auth/callback` : null;
  const sp = (await searchParams) ?? {};
  const reasonRaw = sp.reason;
  const reason = typeof reasonRaw === "string" ? reasonRaw : null;
  const errorCodeRaw = sp.error_code ?? sp.errorCode;
  const errorCode = typeof errorCodeRaw === "string" ? errorCodeRaw : null;
  const errorDescRaw = sp.error_description ?? sp.errorDescription;
  const errorDescription = typeof errorDescRaw === "string" ? errorDescRaw : null;

  const reasonLower = reason?.toLowerCase() ?? "";
  const isPkceVerifierMissing = reasonLower.includes("code verifier not found");

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-16 text-center">
      <h1 className="font-display text-xl font-semibold text-ink">認証を完了できませんでした</h1>
      <p className="mt-3 text-sm text-ink-muted">
        リンクの有効期限切れ、または設定の不整合の可能性があります。もう一度ログインまたは登録をお試しください。
      </p>
      {reason?.includes("exchangeCodeForSession_timeout") ? (
        <p className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-left text-xs leading-relaxed text-amber-950">
          <strong className="font-semibold">タイムアウト:</strong>{" "}
          サーバーまたは回線の混雑で、認証コードの確認が間に合わなかった可能性があります。Wi‑Fi
          とモバイルデータを切り替えるか、しばらく時間をおいて{" "}
          <strong>同じメールのリンクでもう一度</strong>お試しください。繰り返す場合はお問い合わせください。
        </p>
      ) : null}
      {isPkceVerifierMissing ? (
        <p className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-left text-xs leading-relaxed text-amber-950">
          <strong className="font-semibold">PKCE（確認コード）:</strong>{" "}
          登録したブラウザと違う環境でリンクを開いた、Cookie が消えた、
          <span className="font-mono">localhost</span> と本番でホストが違う、などで起きます。
          Viewtrace は確認メールを{" "}
          <span className="font-mono">token_hash</span> 方式にすれば同じブラウザでなくても確認できます。管理者は{" "}
          <span className="font-mono">supabase/templates/confirmation.html</span> の本文を Supabase の Confirm
          signup に反映し、必要なら「確認メールを再送」してください。
        </p>
      ) : null}
      {reason || errorCode || errorDescription ? (
        <div className="mt-4 rounded-2xl border border-border bg-surface p-4 text-left text-xs leading-relaxed text-ink-muted">
          <p className="font-medium text-ink">エラー詳細</p>
          {errorCode ? (
            <p className="mt-2">
              <span className="font-mono text-[11px] text-ink">{errorCode}</span>
            </p>
          ) : null}
          {errorDescription ? (
            <p className="mt-2 wrap-break-word font-mono text-[11px] text-ink">{errorDescription}</p>
          ) : null}
          {reason ? (
            <p className="mt-2 wrap-break-word font-mono text-[11px] text-ink">{reason}</p>
          ) : null}
        </div>
      ) : null}
      <div className="mt-6 rounded-2xl border border-border bg-surface-elevated p-4 text-left text-xs leading-relaxed text-ink-muted">
        <p className="font-medium text-ink">よくある原因</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>確認メールのリンクの期限が切れている</li>
          <li>
            ブラウザが「このサイトにアクセスできません」と表示する（メール内の続き先が{" "}
            <span className="font-mono">localhost</span> や届かないURLになっている。スマホで開くと特に起きやすい。Supabase の Site
            URL を本番にし、本番の <span className="font-mono">/auth/callback</span> を Redirect URLs に入れる）
          </li>
          <li>
            Supabase の Redirect URLs に <span className="font-mono">/auth/callback</span>{" "}
            が登録されていない（ローカルはポート番号も含めて一致が必要）
          </li>
          <li>別のドメイン/別ポートで開いた（例: 3000 と 3001 の違い）</li>
          <li>
            古い確認メール（<span className="font-mono">ConfirmationURL</span> / PKCE）を別ブラウザで開いた →{" "}
            <span className="font-mono">token_hash</span> リンクのテンプレに更新するか、登録と同じブラウザで開く
          </li>
        </ul>
        {callbackUrl ? (
          <div className="mt-4 rounded-xl border border-border bg-surface p-3">
            <p className="font-medium text-ink">この環境で登録すべき Redirect URL（目安）</p>
            <p className="mt-2 break-all font-mono text-[11px] text-ink">{callbackUrl}</p>
          </div>
        ) : null}
        <p className="mt-3">
          確認メールが届かない・リンクが無効な場合は、迷惑メールフォルダを確認するか、ログイン画面から同じメールで「無料で始める」を再度お試しください。解決しない場合は
          <Link href="/contact" className="font-semibold text-accent underline underline-offset-2">
            お問い合わせ
          </Link>
          ください。
        </p>
      </div>
      <Link
        href="/login?mode=signin"
        className="mt-8 inline-flex justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
      >
        ログインへ
      </Link>
    </div>
  );
}
