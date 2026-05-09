import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { ResendConfirmationForm } from "@/components/auth/ResendConfirmationForm";
import { getAuthEmailRedirectTo } from "@/lib/auth/callback-url";
import { getSession } from "@/lib/auth/session";
import { siteDomain } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sign in | Viewtrace",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string; verified?: string }>;
}) {
  const sp = await searchParams;
  const nextParam = sp.next?.trim() ?? "";
  const nextPath = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : undefined;
  const modeParam = sp.mode?.trim().toLowerCase();
  const verified = sp.verified === "1";
  const initialMode = verified || modeParam === "signin" ? ("signin" as const) : ("signup" as const);

  const session = await getSession();
  if (session) {
    if (nextPath) redirect(nextPath);
    redirect("/dashboard");
  }

  const callbackUrl = await getAuthEmailRedirectTo();
  const productionCallbackUrl = `https://${siteDomain}/auth/callback`;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--color-surface)] text-[var(--color-ink)]">
      <div
        className="pointer-events-none absolute -left-32 top-20 h-80 w-80 rounded-full bg-[var(--color-accent-soft)] opacity-70 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-[var(--color-accent-soft)] opacity-50 blur-3xl"
        aria-hidden
      />

      <header className="relative z-10 border-b border-[var(--color-border)]/80 bg-[var(--color-surface-elevated)]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="font-display text-lg font-semibold tracking-tight">
            Viewtrace
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/contact"
              className="hidden font-medium text-[var(--color-ink-muted)] transition hover:text-[var(--color-ink)] sm:inline"
            >
              Contact
            </Link>
            <Link
              href="/"
              className="font-medium text-[var(--color-accent)] transition hover:text-[var(--color-accent-hover)]"
            >
              Back to site
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-4.25rem)] max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-16">
        <section className="order-2 lg:order-1">
          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1 text-xs font-medium text-[var(--color-ink-muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
            Product
          </p>
          <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Sign in to the dashboard
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-[var(--color-ink-muted)]">
            After you sign in, you can capture, list, and configure observations in the dashboard. Records
            reflect what we observed at capture time; we do not guarantee completeness or accuracy.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-[var(--color-ink-muted)]">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
              Manage timestamped visual records
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
              Review observation history with regional targeting
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
              View plan and usage (expanded as we ship more)
            </li>
          </ul>
        </section>

        <section className="order-1 lg:order-2">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 shadow-lg shadow-[var(--color-ink)]/5 sm:p-8">
            <div className="text-center">
              <p className="font-display text-lg font-semibold">Viewtrace</p>
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                Sign up or sign in with email and password
              </p>
            </div>

            <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left text-sm text-[var(--color-ink-muted)]">
              <p className="font-medium text-[var(--color-ink)]">Email sign-in</p>
              <p className="mt-2 leading-relaxed">
                Use <strong className="font-semibold text-[var(--color-ink)]">Get started</strong> to create
                an account or <strong className="font-semibold text-[var(--color-ink)]">Sign in</strong> for an
                existing one.
                <strong className="font-semibold text-[var(--color-ink)]">
                  {" "}
                  After sign-up, you cannot sign in until you confirm your email via the link we send.
                </strong>{" "}
                Open the link in the message, then sign in with your password.
              </p>
              {verified ? (
                <p className="mt-3 rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-xs leading-relaxed text-emerald-950">
                  Your email is confirmed. Enter your password on this page to sign in.
                </p>
              ) : null}
              <p className="mt-2 rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs leading-relaxed text-amber-950">
                If the browser says the site cannot be reached, the confirmation link often still points at{" "}
                <span className="font-mono">localhost</span> or a dev URL. Open the link in the same browser
                where you signed up, or ensure production{" "}
                <span className="font-mono break-all">{productionCallbackUrl}</span> is listed under Supabase
                Site URL and Redirect URLs.
              </p>
              <p className="mt-2">
                Need help?{" "}
                <Link href="/contact" className="font-medium text-[var(--color-accent)] underline underline-offset-2">
                  Contact us
                </Link>
                .
              </p>
              <details className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs">
                <summary className="cursor-pointer select-none font-medium text-[var(--color-ink)]">
                  For operators &amp; developers (auth backend)
                </summary>
                <div className="mt-3 space-y-2 leading-relaxed">
                  <p>
                    In Supabase, enable Email under Authentication → Providers. Under Authentication → URL
                    configuration, set <strong className="font-medium text-[var(--color-ink)]">Site URL</strong>{" "}
                    to the production origin users actually open (e.g.{" "}
                    <span className="font-mono text-[11px]">https://viewtrace.net</span>), and add the callback
                    below to Redirect URLs. If Site URL stays{" "}
                    <span className="font-mono text-[11px]">localhost</span>, confirmation emails in
                    production may point at dev, which mobile cannot open.
                  </p>
                  <p className="text-[var(--color-ink)]">Callback for this environment (reference)</p>
                  <p className="break-all font-mono text-[11px] text-[var(--color-ink)]">{callbackUrl}</p>
                  <p className="text-[var(--color-ink)]">Production example</p>
                  <p className="break-all font-mono text-[11px] text-[var(--color-ink)]">{productionCallbackUrl}</p>
                  <p>
                    Locally, set <span className="font-mono text-[11px]">NEXT_PUBLIC_SITE_URL</span> to your
                    real origin (e.g.{" "}
                    <span className="whitespace-nowrap font-mono text-[11px]">http://localhost:3001</span>),
                    and register that same origin’s{" "}
                    <span className="font-mono text-[11px]">/auth/callback</span> in Redirect URLs.
                  </p>
                  <p>
                    If confirmation mail does not arrive, configure custom SMTP under Project Settings → Auth
                    → SMTP (e.g. Resend). Default sending is often filtered as spam.
                  </p>
                  <p>
                    For quick local testing, turn off “Confirm email” under Authentication so you can sign in
                    without a confirmation message.
                  </p>
                </div>
              </details>
            </div>

            <LoginForm
              nextPath={nextPath}
              initialMode={initialMode}
              authCallbackUrl={callbackUrl}
            />

            <ResendConfirmationForm authCallbackUrl={callbackUrl} />

            <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1 border-t border-[var(--color-border)] pt-6 text-center text-xs text-[var(--color-ink-muted)]">
              <Link href="/terms" className="hover:text-[var(--color-ink)]">
                Terms
              </Link>
              <span aria-hidden className="text-[var(--color-border)]">
                ·
              </span>
              <Link href="/privacy" className="hover:text-[var(--color-ink)]">
                Privacy
              </Link>
              <span aria-hidden className="text-[var(--color-border)]">
                ·
              </span>
              <Link href="/acceptable-use" className="hover:text-[var(--color-ink)]">
                Acceptable use
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
