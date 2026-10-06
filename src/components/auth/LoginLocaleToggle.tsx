"use client";

import { useRouter } from "next/navigation";
import type { LoginLocale } from "@/lib/auth/login-copy";
import { loginPageCopy } from "@/lib/auth/login-copy";
import { LOCALE_COOKIE } from "@/lib/i18n/locale-cookie";

export function LoginLocaleToggle({ locale }: { locale: LoginLocale }) {
  const t = loginPageCopy[locale];
  const router = useRouter();

  function setLocale(next: LoginLocale) {
    if (next === locale) return;
    const maxAgeDays = 365;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${maxAgeDays * 24 * 60 * 60}`;
    router.refresh();
  }

  return (
    <div
      className="flex items-center rounded-full border border-border bg-surface p-0.5 text-xs"
      role="group"
      aria-label={t.langAria}
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded-full px-3 py-1.5 font-medium transition ${
          locale === "en" ? "bg-accent text-white" : "text-ink-muted hover:text-ink"
        }`}
        aria-pressed={locale === "en"}
      >
        {t.english}
      </button>
      <button
        type="button"
        onClick={() => setLocale("ja")}
        className={`rounded-full px-3 py-1.5 font-medium transition ${
          locale === "ja" ? "bg-accent text-white" : "text-ink-muted hover:text-ink"
        }`}
        aria-pressed={locale === "ja"}
      >
        {t.japanese}
      </button>
    </div>
  );
}
