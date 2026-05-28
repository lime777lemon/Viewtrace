import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ViewtraceLogo } from "@/components/brand/ViewtraceLogo";
import { LegalDocShell } from "@/components/legal/LegalDocShell";
import { copy } from "@/lib/i18n";
import { legalPageMetadata } from "@/lib/i18n/legal-page-metadata";
import { getRequestLocale } from "@/lib/i18n/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return legalPageMetadata("/about", "about", locale);
}

export default async function AboutPage() {
  const locale = await getRequestLocale();
  const t = copy[locale].aboutPage;

  return (
    <LegalDocShell locale={locale} title={t.pageTitle} wide>
      <div className="space-y-8 sm:space-y-10 lg:space-y-12">
        <section className="relative overflow-hidden rounded-2xl border border-border bg-linear-to-br from-surface-elevated via-surface-elevated to-accent/5 p-5 shadow-sm sm:p-7 md:p-8 lg:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 flex w-[55%] items-center justify-center sm:w-1/2"
          >
            <ViewtraceLogo
              alt=""
              priority={false}
              className="h-44 w-auto max-w-none opacity-20 select-none sm:h-56 md:h-72 lg:h-80 xl:h-96"
            />
          </div>
          <div className="relative z-10 md:max-w-[58%] lg:max-w-[55%]">
            <p className="font-display text-[1.35rem] leading-snug font-semibold tracking-tight text-ink sm:text-2xl md:text-[1.75rem] lg:text-3xl">
              {t.leadBeforeOperator}
              <span className="text-accent">{t.operatorName}</span>
              {t.leadAfterOperator}
            </p>
            <div className="mt-5 space-y-3 border-t border-border/60 pt-5 sm:mt-6 sm:space-y-4 sm:pt-6">
              {t.paragraphs.map((p) => (
                <p
                  key={p.slice(0, 48)}
                  className="max-w-none text-[15px] leading-relaxed text-ink-muted sm:text-base"
                >
                  {p}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface-elevated p-5 shadow-sm sm:p-6 md:p-8">
          <div className="md:flex md:items-start md:gap-8 lg:gap-10">
            <p className="shrink-0 text-xs font-semibold tracking-[0.14em] text-accent uppercase md:w-28 lg:w-32">
              {t.missionTitle}
            </p>
            <p className="mt-3 font-display text-base leading-relaxed font-medium text-ink sm:text-lg md:mt-0 md:flex-1">
              {t.missionBody}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface-elevated p-5 shadow-sm sm:p-6 md:p-8">
          <p className="text-xs font-semibold tracking-[0.14em] text-accent uppercase">
            {t.focusTitle}
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {t.focusItems.map((item) => (
              <li
                key={item.label}
                className="flex h-full items-start gap-3 rounded-xl border border-border/80 bg-surface p-3.5 sm:gap-3.5 sm:p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft sm:h-11 sm:w-11">
                  <Image
                    src={item.iconSrc}
                    alt=""
                    aria-hidden="true"
                    width={44}
                    height={44}
                    className="h-7 w-7 object-contain sm:h-8 sm:w-8"
                  />
                </div>
                <p className="min-w-0 flex-1 pt-0.5 text-sm leading-relaxed text-ink sm:pt-1.5">
                  {item.label}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-5 rounded-2xl border border-dashed border-border bg-surface px-5 py-5 sm:px-6 sm:py-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <p className="min-w-0 text-sm leading-relaxed text-ink-muted">
            {t.operatorNote}{" "}
            {t.legalLinkPrefix}
            <Link href="/tokushoho" className="font-medium text-accent underline underline-offset-2">
              {t.legalLinkLabel}
            </Link>
            {t.legalLinkSuffix}
          </p>
          <Link
            href="/contact"
            className="inline-flex w-full shrink-0 items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white! no-underline shadow-sm transition hover:bg-accent-hover hover:text-white! sm:w-auto sm:py-2.5"
          >
            {t.contactCtaLinkLabel}
          </Link>
        </section>
      </div>
    </LegalDocShell>
  );
}
