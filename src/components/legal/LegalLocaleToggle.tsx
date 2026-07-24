"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";
import { LOCALE_COOKIE } from "@/lib/i18n/locale-cookie";

export function LegalLocaleToggle({ locale }: { locale: Locale }) {
  const t = copy[locale].legalShell;
  const router = useRouter();

  function setLocale(next: Locale) {
    if (next === locale) return;
    const maxAgeDays = 365;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${maxAgeDays * 24 * 60 * 60}`;
    // フルリロードせずサーバーコンポーネントだけ再取得（INP 改善）
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex rounded-full border border-border bg-surface p-0.5 text-[11px] font-semibold">
        <button
          type="button"
          onClick={() => setLocale("en")}
          className={`cursor-pointer rounded-full px-2.5 py-1 transition ${
            locale === "en"
              ? "bg-ink text-white shadow-sm hover:bg-ink/90 hover:shadow"
              : "text-ink-muted hover:bg-border/45 hover:text-ink"
          }`}
          aria-pressed={locale === "en"}
        >
          en
        </button>
        <button
          type="button"
          onClick={() => setLocale("ja")}
          className={`cursor-pointer rounded-full px-2.5 py-1 transition ${
            locale === "ja"
              ? "bg-ink text-white shadow-sm hover:bg-ink/90 hover:shadow"
              : "text-ink-muted hover:bg-border/45 hover:text-ink"
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

