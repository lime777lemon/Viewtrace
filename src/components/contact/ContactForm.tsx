"use client";

import { useActionState } from "react";
import { contactFormAction } from "@/app/actions/contact";
import type { Locale } from "@/lib/i18n";
import { getContactPageCopy } from "@/lib/i18n/contact-page-copy";
import { contactEmail } from "@/lib/site";

const inputClassName =
  "mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none ring-accent/25 transition placeholder:text-ink-muted/60 focus:border-accent/40 focus:ring-2";

export function ContactForm({ locale }: { locale: Locale }) {
  const t = getContactPageCopy(locale);
  const [state, action, pending] = useActionState(contactFormAction, null);

  return (
    <div className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm sm:p-8">
      <h2 className="font-display text-xl font-semibold tracking-tight text-ink">{t.formTitle}</h2>
      <p className="mt-2 text-sm text-ink-muted">{t.mailtoHint}</p>

      <form action={action} className="mt-6 space-y-5">
        <input type="hidden" name="_locale" value={locale} />
        <div className="hidden" aria-hidden>
          <label htmlFor="company_website">Website</label>
          <input id="company_website" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <div>
          <label htmlFor="contact-name" className="block text-sm font-medium text-ink">
            {t.name}
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            maxLength={200}
            autoComplete="name"
            placeholder={t.namePlaceholder}
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="contact-email" className="block text-sm font-medium text-ink">
            {t.email}
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            maxLength={320}
            autoComplete="email"
            placeholder={t.emailPlaceholder}
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="contact-topic" className="block text-sm font-medium text-ink">
            {t.topic}
          </label>
          <select id="contact-topic" name="topic" defaultValue="general" className={inputClassName}>
            <option value="general">{t.topicGeneral}</option>
            <option value="billing">{t.topicBilling}</option>
            <option value="technical">{t.topicTechnical}</option>
          </select>
        </div>

        <div>
          <label htmlFor="contact-message" className="block text-sm font-medium text-ink">
            {t.message}
          </label>
          <textarea
            id="contact-message"
            name="message"
            required
            minLength={10}
            maxLength={5000}
            rows={6}
            placeholder={t.messagePlaceholder}
            className={`${inputClassName} resize-y`}
          />
        </div>

        {state?.error ? (
          <p
            role="alert"
            className="rounded-xl border border-red-200/80 bg-red-50 px-3 py-2.5 text-sm text-red-900"
          >
            {state.error}
          </p>
        ) : null}
        {state?.message ? (
          <p
            role="status"
            className="rounded-xl border border-emerald-200/80 bg-emerald-50 px-3 py-2.5 text-sm leading-relaxed text-emerald-900"
          >
            {state.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-accent py-3.5 text-sm font-semibold text-white shadow-md shadow-accent/20 transition hover:bg-accent-hover disabled:opacity-60 sm:w-auto sm:px-10"
        >
          {pending ? t.submitting : t.submit}
        </button>
      </form>

      <p className="mt-6 border-t border-border pt-6 text-sm text-ink-muted">
        {t.emailFallback}{" "}
        <a href={`mailto:${contactEmail}`} className="font-medium text-accent hover:text-accent-hover">
          {contactEmail}
        </a>
      </p>
    </div>
  );
}
