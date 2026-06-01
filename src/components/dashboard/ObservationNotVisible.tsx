import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
import { copy } from "@/lib/i18n";
import type { LoginLocale } from "@/lib/auth/login-copy";

type Props = {
  /** ログイン中ユーザーのメールアドレス（誤アカウントログイン気付き用に表示） */
  signedInEmail: string;
  /** sanitize 済みの観測 ID（既に本人のメールへ届いている UUID なので表示してよい） */
  observationId: string;
  locale: LoginLocale;
};

/**
 * `getObservationMergedForPlan` が undefined を返したケース（= RLS で見えない / 行が無い）の表示。
 *
 * 自動観測メールを「届いた宛先ではないアカウント」で開いたときの「真っ白な 404」を
 * 親切な案内へ差し替える。リダイレクトや UUID 漏洩は無く、ID は元から本人のメールに届いている。
 */
export function ObservationNotVisible({ signedInEmail, observationId, locale }: Props) {
  const t = copy[locale].observationDetail;
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-12 sm:px-6">
      <div className="space-y-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          {t.notVisibleTitle}
        </h1>
        <p className="text-sm leading-relaxed text-ink-muted">{t.notVisibleBody}</p>
      </div>

      <dl className="rounded-xl border border-border bg-surface-elevated p-4 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {t.notVisibleAccountLabel}
          </dt>
          <dd className="mt-1 break-all font-mono text-ink">{signedInEmail}</dd>
        </div>
        <div className="mt-3">
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {t.notVisibleRecordIdLabel}
          </dt>
          <dd className="mt-1 break-all font-mono text-xs text-ink-muted">{observationId}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-3">
        <form action={logoutAction}>
          <PendingSubmitButton
            label={t.notVisibleSignOut}
            pendingLabel={locale === "ja" ? "処理中…" : "Processing…"}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover hover:shadow-md active:translate-y-px disabled:hover:shadow-sm"
            pendingClassName="hover:bg-accent"
          />
        </form>
        <Link
          href="/dashboard/observations"
          className="text-sm font-medium text-accent hover:text-accent-hover"
        >
          {t.notVisibleBackToList} →
        </Link>
      </div>
    </div>
  );
}
