import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "認証エラー | Viewtrace",
  robots: { index: false, follow: false },
};

export default function AuthCodeErrorPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-16 text-center">
      <h1 className="font-display text-xl font-semibold text-[var(--color-ink)]">認証を完了できませんでした</h1>
      <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
        リンクの有効期限切れ、または設定の不整合の可能性があります。もう一度ログインまたは登録をお試しください。
      </p>
      <Link
        href="/login"
        className="mt-8 inline-flex justify-center rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
      >
        ログインへ
      </Link>
    </div>
  );
}
