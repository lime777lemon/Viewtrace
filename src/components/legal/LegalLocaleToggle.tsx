"use client";

import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";
import { LOCALE_COOKIE } from "@/lib/i18n/locale-cookie";

export function LegalLocaleToggle({ locale }: { locale: Locale }) {
  const t = copy[locale].legalShell;

  function setLocale(next: Locale) {
    const maxAgeDays = 365;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${maxAgeDays * 24 * 60 * 60}`;
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5 text-[11px] font-semibold">
        <button
          type="button"
          onClick={() => setLocale("en")}
          className={`rounded-full px-2.5 py-1 transition ${
            locale === "en"
              ? "bg-[var(--color-ink)] text-white shadow-sm"
              : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          }`}
          aria-pressed={locale === "en"}
        >
          en
        </button>
        <button
          type="button"
          onClick={() => setLocale("ja")}
          className={`rounded-full px-2.5 py-1 transition ${
            locale === "ja"
              ? "bg-[var(--color-ink)] text-white shadow-sm"
              : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          }`}
          aria-pressed={locale === "ja"}
        >
          ja
        </button>
      </div>
      <span className="sr-only">
        {locale === "ja" ? t.langJa : t.langEn}
      </span>
    </div>
  );
}

