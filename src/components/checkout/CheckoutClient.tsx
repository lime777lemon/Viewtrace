"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useState } from "react";
import { demoCheckoutAction } from "@/app/actions/checkout";
import { copy, type Locale } from "@/lib/i18n";
import type { PlanId } from "@/lib/plans";
import { getPlan } from "@/lib/plans";
import type { StripeMode } from "@/lib/stripe";

export function CheckoutClient({
  planId,
  stripeMode,
  trialBlockReason,
}: {
  planId: PlanId;
  stripeMode: StripeMode;
  /** 無料トライアル終了・枠切れからのリダイレクト時のみ */
  trialBlockReason?: "trial_expired" | "trial_observation_limit";
}) {
  const [locale, setLocale] = useState<Locale>("ja");
  const t = copy[locale].checkout;
  const plan = getPlan(planId);
  const [state, formAction, pending] = useActionState(demoCheckoutAction, null);
  const emailId = useId();

  const [email, setEmail] = useState("");
  const [stripePending, setStripePending] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);

  useEffect(() => {
    const lang = document.documentElement.lang;
    if (lang === "en") setLocale("en");
  }, []);

  const errorMessage =
    state?.error === "email"
      ? t.errorEmail
      : state?.error === "card"
        ? t.errorCard
        : state?.error === "expiry"
          ? t.errorExpiry
          : state?.error === "cvc"
            ? t.errorCvc
            : null;

  async function startStripeCheckout() {
    setStripeError(null);
    setStripePending(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: planId, locale }),
      });
      const json = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !json.ok || !json.url) {
        if (json.error === "login_required") {
          setStripeError(
            locale === "ja"
              ? "Stripe 決済を開始するにはログインが必要です。"
              : "Please log in to start Stripe checkout.",
          );
        } else {
          setStripeError(json.error ?? t.stripeCheckoutError);
        }
        return;
      }
      window.location.href = json.url;
    } catch {
      setStripeError(t.stripeCheckoutError);
    } finally {
      setStripePending(false);
    }
  }

  const trialNotice =
    trialBlockReason === "trial_expired"
      ? t.trialRedirectExpired
      : trialBlockReason === "trial_observation_limit"
        ? t.trialRedirectObservationLimit
        : null;

  return (
    <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-ink)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/" className="font-display text-lg font-semibold">
            Viewtrace
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLocale("ja")}
                className={`rounded-full px-2.5 py-1 ${locale === "ja" ? "bg-[var(--color-ink)] text-white" : "text-[var(--color-ink-muted)]"}`}
              >
                {t.langJa}
              </button>
              <button
                type="button"
                onClick={() => setLocale("en")}
                className={`rounded-full px-2.5 py-1 ${locale === "en" ? "bg-[var(--color-ink)] text-white" : "text-[var(--color-ink-muted)]"}`}
              >
                {t.langEn}
              </button>
            </div>
            <Link
              href="/#pricing"
              className="text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
            >
              {t.back}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        {stripeMode === "none" ? (
          <div className="mb-8 rounded-xl border border-[var(--color-warn)]/35 bg-[var(--color-warn)]/10 px-4 py-3 text-sm text-[var(--color-ink)]">
            {t.demoBanner}
          </div>
        ) : (
          <>
            {stripeMode === "test" ? (
              <div className="mb-8 rounded-xl border border-emerald-300/60 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
                {locale === "ja" ? "Stripe（テストモード）が接続されています。" : "Stripe (test mode) is connected."}
              </div>
            ) : t.stripeLiveBanner ? (
              <div className="mb-8 rounded-xl border border-emerald-300/60 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
                {t.stripeLiveBanner}
              </div>
            ) : null}
          </>
        )}

        {trialNotice ? (
          <div className="mb-8 rounded-xl border border-sky-300/80 bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-950">
            {trialNotice}
          </div>
        ) : null}

        <h1 className="font-display text-3xl font-semibold tracking-tight">{t.title}</h1>
        <p className="mt-2 max-w-2xl text-[var(--color-ink-muted)]">{t.subtitle}</p>

        <div className="mt-8 flex flex-wrap gap-2">
          {(["starter", "pro"] as const).map((id) => {
            const p = getPlan(id);
            const active = planId === id;
            return (
              <Link
                key={id}
                href={`/checkout?plan=${id}${trialBlockReason ? `&reason=${trialBlockReason}` : ""}`}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-[var(--color-ink)] text-white"
                    : "border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-ink-muted)] hover:border-[var(--color-ink-muted)]/40"
                }`}
              >
                {p.name} · {p.priceLabel}
              </Link>
            );
          })}
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 sm:p-8">
            <h2 className="font-display text-lg font-semibold">{t.orderSummary}</h2>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{t.planLabel}</p>
            <p className="mt-2 font-display text-xl font-semibold">
              {plan.name}{" "}
              <span className="text-base font-normal text-[var(--color-ink-muted)]">
                {plan.priceLabel}
              </span>
            </p>
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">{plan.audienceLabel}</p>
            <ul className="mt-6 space-y-2 text-sm text-[var(--color-ink-muted)]">
              <li>
                {t.monthly}: {plan.monthlyObservations}{" "}
                {locale === "ja" ? "オブザベーション" : "observations"}
              </li>
              <li>
                {locale === "ja" ? "保存" : "Retention"}: {plan.retentionDays}{" "}
                {locale === "ja" ? "日" : "days"}
              </li>
              <li>{plan.coverageLabel}</li>
              {plan.csvExport ? (
                <li>{locale === "ja" ? "CSVエクスポート" : "CSV export"}</li>
              ) : null}
            </ul>
            <p className="mt-6 text-xs text-[var(--color-ink-muted)]">{t.billedMonthly}</p>
            <p className="mt-2 text-xs text-[var(--color-ink-muted)]">{t.taxNote}</p>
          </section>

          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 sm:p-8">
            <h2 className="font-display text-lg font-semibold">{t.payment}</h2>
            {t.stripeNote ? (
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{t.stripeNote}</p>
            ) : null}

            {stripeMode !== "none" ? (
              <div className="mt-6 space-y-4">
                <p className="text-sm text-[var(--color-ink-muted)]">
                  {locale === "ja"
                    ? "請求先メールはログイン中のアカウントのメールアドレスが使われます。"
                    : "Billing email will use your signed-in account email."}
                </p>

                {stripeError ? (
                  <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                    {stripeError}
                  </p>
                ) : null}

                <button
                  type="button"
                  onClick={startStripeCheckout}
                  disabled={stripePending}
                  className="w-full rounded-full bg-[var(--color-accent)] py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
                >
                  {stripePending ? t.stripePayPending : t.payWithStripe}
                </button>

                <p className="text-center text-xs text-[var(--color-ink-muted)]">
                  {t.termsAgree}
                  <Link href="/terms" className="font-medium text-[var(--color-accent)] underline underline-offset-2">
                    {t.termsLink}
                  </Link>
                  {t.termsAgreeEnd}
                </p>
              </div>
            ) : (
              <form action={formAction} className="mt-6 space-y-4">
                <input type="hidden" name="plan" value={planId} />

                <div>
                  <label htmlFor={emailId} className="block text-sm font-medium">
                    {t.email}
                  </label>
                  <input
                    id={emailId}
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm outline-none ring-[var(--color-accent)]/25 focus:ring-2"
                  />
                </div>
                <div>
                  <label htmlFor="cardholder" className="block text-sm font-medium">
                    {t.cardholder}
                  </label>
                  <input
                    id="cardholder"
                    name="cardholder"
                    type="text"
                    autoComplete="cc-name"
                    className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm outline-none ring-[var(--color-accent)]/25 focus:ring-2"
                  />
                </div>
                <div>
                  <label htmlFor="cardNumber" className="block text-sm font-medium">
                    {t.cardNumber}
                  </label>
                  <input
                    id="cardNumber"
                    name="cardNumber"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder={t.cardPlaceholder}
                    className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 font-mono text-sm outline-none ring-[var(--color-accent)]/25 focus:ring-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="expiry" className="block text-sm font-medium">
                      {t.expiry}
                    </label>
                    <input
                      id="expiry"
                      name="expiry"
                      placeholder={t.expiryPlaceholder}
                      autoComplete="cc-exp"
                      className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 font-mono text-sm outline-none ring-[var(--color-accent)]/25 focus:ring-2"
                    />
                  </div>
                  <div>
                    <label htmlFor="cvc" className="block text-sm font-medium">
                      {t.cvc}
                    </label>
                    <input
                      id="cvc"
                      name="cvc"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 font-mono text-sm outline-none ring-[var(--color-accent)]/25 focus:ring-2"
                    />
                  </div>
                </div>

                {errorMessage ? (
                  <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                    {errorMessage}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={pending}
                  className="w-full rounded-full bg-[var(--color-accent)] py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
                >
                  {pending ? t.payPending : t.payButton}
                </button>

                <p className="text-center text-xs text-[var(--color-ink-muted)]">
                  {t.termsAgree}
                  <Link href="/terms" className="font-medium text-[var(--color-accent)] underline underline-offset-2">
                    {t.termsLink}
                  </Link>
                  {t.termsAgreeEnd}
                </p>
              </form>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
