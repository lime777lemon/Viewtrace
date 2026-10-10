"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OnboardingLanguageSelect } from "@/components/dashboard/OnboardingLanguageSelect";
import { useOnboardingCopy } from "@/components/dashboard/useOnboardingCopy";
import {
  consumeOnboardingForce,
  ONBOARDING_QUERY,
  ONBOARDING_STEP_IDS,
  writeOnboardingWelcomeSeen,
} from "@/lib/onboarding";

export function DashboardOnboardingWelcome({
  userId,
  observationCount,
}: {
  userId: string;
  observationCount: number;
}) {
  const { lang, t, setLang } = useOnboardingCopy();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forced = params.get(ONBOARDING_QUERY) === "1" || consumeOnboardingForce();
    if (params.get(ONBOARDING_QUERY) === "1") {
      params.delete(ONBOARDING_QUERY);
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
      );
    }
    if (forced) setOpen(true);
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        writeOnboardingWelcomeSeen(userId);
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, userId]);

  function close() {
    writeOnboardingWelcomeSeen(userId);
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-end justify-center bg-ink/45 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.dialogAria}
        aria-labelledby="onboarding-title"
        dir={lang === "ar" ? "rtl" : "ltr"}
        className="w-full max-w-lg rounded-2xl border border-border bg-surface p-5 shadow-xl sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            {t.kicker}
          </p>
          <OnboardingLanguageSelect lang={lang} label={t.languageLabel} onChange={setLang} />
        </div>
        <h2 id="onboarding-title" className="mt-1 font-display text-xl font-semibold text-ink">
          {t.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t.intro}</p>
        <ol className="mt-4 space-y-3">
          {ONBOARDING_STEP_IDS.map((id, index) => {
            const step = t.steps[id];
            return (
              <li key={id} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-ink">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{step.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{step.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-xs leading-relaxed text-ink-muted">{t.costNote}</p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={close}
            className="text-sm font-semibold text-ink-muted hover:text-ink"
          >
            {t.skip}
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/help"
              onClick={close}
              className="text-sm font-semibold text-accent hover:text-accent-hover"
            >
              {t.helpLink}
            </Link>
            <Link
              href="/dashboard/region-search"
              onClick={close}
              className="inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              {t.primaryCta}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
