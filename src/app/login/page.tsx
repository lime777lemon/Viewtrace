import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { getSession } from "@/lib/auth/session";
import { siteDomain, siteOrigin } from "@/lib/site";

export const metadata: Metadata = {
  title: "ログイン | Viewtrace",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const nextParam = sp.next?.trim() ?? "";
  const nextPath = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : undefined;

  const session = await getSession();
  if (session) {
    if (nextPath) redirect(nextPath);
    redirect("/dashboard");
  }

  const callbackUrl = `${siteOrigin}/auth/callback`;
  const productionCallbackUrl = `https://${siteDomain}/auth/callback`;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--color-surface)] text-[var(--color-ink)]">
      <div
        className="pointer-events-none absolute -left-32 top-20 h-80 w-80 rounded-full bg-[var(--color-accent-soft)] opacity-70 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-[var(--color-accent-soft)] opacity-50 blur-3xl"
        aria-hidden
      />

      <header className="relative z-10 border-b border-[var(--color-border)]/80 bg-[var(--color-surface-elevated)]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="font-display text-lg font-semibold tracking-tight">
            Viewtrace
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/contact"
              className="hidden font-medium text-[var(--color-ink-muted)] transition hover:text-[var(--color-ink)] sm:inline"
            >
              お問い合わせ
            </Link>
            <Link
              href="/"
              className="font-medium text-[var(--color-accent)] transition hover:text-[var(--color-accent-hover)]"
            >
              サイトへ戻る
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-4.25rem)] max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-16">
        <section className="order-2 lg:order-1">
          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1 text-xs font-medium text-[var(--color-ink-muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
            プロダクト
          </p>
          <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            ダッシュボードにログイン
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-[var(--color-ink-muted)]">
            オブザベーションの取得・一覧・設定はログイン後のダッシュボードで行います。記録は取得時点の観測であり、保証や法的証拠性を主張するものではありません。
          </p>
          <ul className="mt-8 space-y-3 text-sm text-[var(--color-ink-muted)]">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
              タイムスタンプ付きのビジュアル記録を管理
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
              地域条件に基づく観測の履歴を確認
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
              プラン・利用状況の参照（実装に応じて拡張）
            </li>
          </ul>
        </section>

        <section className="order-1 lg:order-2">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 shadow-lg shadow-[var(--color-ink)]/5 sm:p-8">
            <div className="text-center">
              <p className="font-display text-lg font-semibold">Viewtrace</p>
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                メールとパスワードで登録またはログイン
              </p>
            </div>

            <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left text-sm text-[var(--color-ink-muted)]">
              <p className="font-medium text-[var(--color-ink)]">メールアドレスでサインイン</p>
              <p className="mt-2 leading-relaxed">
                「無料で始める」でアカウントを作成するか、「ログイン」で既存のアカウントに入れます。メール確認をオンにしている場合は、登録後に届くメールのリンクから有効化してからログインしてください。
              </p>
              <p className="mt-2">
                うまくいかない場合は
                <Link href="/contact" className="font-medium text-[var(--color-accent)] underline underline-offset-2">
                  お問い合わせ
                </Link>
                ください。
              </p>
              <details className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs">
                <summary className="cursor-pointer select-none font-medium text-[var(--color-ink)]">
                  サイト運用・開発向け（認証バックエンドの設定）
                </summary>
                <div className="mt-3 space-y-2 leading-relaxed">
                  <p>
                    Supabase ダッシュボードの Authentication → Providers で Email を有効にし、Redirect
                    URLs にコールバック URL を追加してください。
                  </p>
                  <p className="text-[var(--color-ink)]">この環境（NEXT_PUBLIC_SITE_URL ベース）</p>
                  <p className="break-all font-mono text-[11px] text-[var(--color-ink)]">{callbackUrl}</p>
                  <p className="text-[var(--color-ink)]">本番の例</p>
                  <p className="break-all font-mono text-[11px] text-[var(--color-ink)]">{productionCallbackUrl}</p>
                  <p>
                    ローカルでは、ブラウザで実際に開いているオリジンも登録します（例:{" "}
                    <span className="whitespace-nowrap font-mono text-[11px] text-[var(--color-ink)]">
                      http://localhost:3000/auth/callback
                    </span>
                    。別ポートの場合はその URL）。
                  </p>
                  <p>
                    ローカルですぐ試す場合は、Authentication の「Confirm email」をオフにすると確認メールなしでログインできます。
                  </p>
                </div>
              </details>
            </div>

            <LoginForm nextPath={nextPath} />

            <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1 border-t border-[var(--color-border)] pt-6 text-center text-xs text-[var(--color-ink-muted)]">
              <Link href="/terms" className="hover:text-[var(--color-ink)]">
                利用規約
              </Link>
              <span aria-hidden className="text-[var(--color-border)]">
                ·
              </span>
              <Link href="/privacy" className="hover:text-[var(--color-ink)]">
                プライバシー
              </Link>
              <span aria-hidden className="text-[var(--color-border)]">
                ·
              </span>
              <Link href="/acceptable-use" className="hover:text-[var(--color-ink)]">
                利用方針
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
