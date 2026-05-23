import Link from "next/link";
import { ViewtraceLogo } from "@/components/brand/ViewtraceLogo";
import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";
import { LegalLocaleToggle } from "@/components/legal/LegalLocaleToggle";

type LegalDocShellProps = {
  locale?: Locale;
  title: string;
  updated?: string;
  children: React.ReactNode;
};

export function LegalDocShell({ locale = "ja", title, updated, children }: LegalDocShellProps) {
  const t = copy[locale].legalShell;
  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="border-b border-border bg-surface-elevated">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="inline-flex items-center transition hover:opacity-90">
            <ViewtraceLogo className="h-8 w-auto sm:h-9" />
          </Link>
          <div className="flex items-center gap-3">
            <LegalLocaleToggle locale={locale} />
            <Link
              href="/"
              className="text-sm font-medium text-ink-muted transition hover:text-ink"
            >
              {t.backToHome}
            </Link>
          </div>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
        {updated ? (
          <p className="mt-2 text-sm text-ink-muted">
            {t.updatedPrefix}
            {updated}
          </p>
        ) : null}
        <div className="prose-custom mt-10 space-y-8 text-ink">{children}</div>
      </article>
    </div>
  );
}
