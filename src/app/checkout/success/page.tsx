import type { Metadata } from "next";
import Link from "next/link";
import { copy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { getPlan, parsePlanId } from "@/lib/plans";
import { getPlanLabels } from "@/lib/plans/labels";
import { getStripe } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncPublicUserPlanMirror } from "@/lib/supabase/sync-public-user-plan";

export const metadata: Metadata = {
  title: "ご注文ありがとうございます | Viewtrace",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ plan?: string; session_id?: string; locale?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const sp = await searchParams;
  const planId = parsePlanId(sp.plan);
  const plan = getPlan(planId);
  const sessionId = typeof sp.session_id === "string" ? sp.session_id.trim() : "";
  const isStripe = Boolean(sessionId);
  const localeFromQuery = sp.locale === "en" || sp.locale === "ja" ? sp.locale : null;
  const locale = localeFromQuery ?? (await getRequestLocale());
  const planLabels = getPlanLabels(planId, locale);
  const t = copy[locale].checkout;

  // Best-effort: reflect the purchased plan immediately.
  // Webhook will also update, but can lag for a short time.
  if (isStripe) {
    try {
      const stripe = getStripe();
      const supabase = await createSupabaseServerClient();
      const admin = createSupabaseAdminClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (stripe && admin && user?.id && user.email) {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        const metadataUserId = session.metadata?.user_id ?? "";
        const metadataPlanId = session.metadata?.plan_id ?? "";
        const customerEmail = session.customer_email ?? session.customer_details?.email ?? "";
        const isComplete = session.status === "complete";

        if (
          isComplete &&
          metadataUserId === user.id &&
          customerEmail &&
          customerEmail.toLowerCase() === user.email.toLowerCase() &&
          metadataPlanId
        ) {
          const subscriptionId = typeof session.subscription === "string" ? session.subscription : "";

          await admin.auth.admin.updateUserById(user.id, {
            user_metadata: {
              ...(user.user_metadata ?? {}),
              plan: metadataPlanId,
              trial_active: false,
              stripe_customer_id: session.customer ?? null,
              stripe_subscription_id: subscriptionId || null,
              stripe_checkout_session_id: session.id,
            },
          });
          await syncPublicUserPlanMirror(admin, user.id, metadataPlanId);
        }
      }
    } catch {
      // Ignore; dashboard will be updated by webhook eventually.
    }
  }

  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="border-b border-border bg-surface-elevated">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="font-display text-xl font-semibold tracking-tight text-[#276248] transition hover:opacity-90"
          >
            Viewtrace
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <p className="text-accent text-sm font-medium">
          {isStripe ? "Stripe" : "Demo checkout"}
        </p>
        <h1 className="font-display mt-2 text-2xl font-semibold tracking-tight">
          {isStripe ? t.stripeSuccessTitle : t.successTitle}
        </h1>
        <p className="text-ink-muted mt-4">
          {isStripe ? (
            <>
              <strong className="text-ink">{plan.name}</strong>（{planLabels.priceLabel}）
              {locale === "ja" ? " のお申し込みを受け付けました。" : " subscription received."}{" "}
              {t.stripeSuccessSubtitle}
            </>
          ) : (
            <>
              {locale === "ja" ? (
                <>
                  プラン <strong className="text-ink">{plan.name}</strong>（{planLabels.priceLabel}
                  ）のお申し込みフローをシミュレートしました。実際の課金や Stripe 連携はありません。
                </>
              ) : (
                <>
                  Simulated checkout for <strong className="text-ink">{plan.name}</strong> (
                  {planLabels.priceLabel}). No real charges.
                </>
              )}
            </>
          )}
        </p>
        {!isStripe ? (
          <p className="text-ink-muted mt-4 text-sm">{t.successSubtitle}</p>
        ) : null}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="bg-accent hover:bg-accent-hover inline-flex justify-center rounded-full px-6 py-3 text-sm font-semibold text-white"
          >
            {t.successCtaLogin}
          </Link>
          <Link
            href="/"
            className="border-border text-ink hover:border-ink-muted/40 inline-flex justify-center rounded-full border px-6 py-3 text-sm font-semibold"
          >
            {t.successCtaHome}
          </Link>
        </div>
        <p className="text-ink-muted mt-10 text-xs">
          <Link href="/tokushoho" className="text-accent underline underline-offset-2">
            {locale === "ja" ? "特定商取引法に基づく表記" : "Commercial disclosure (Japan)"}
          </Link>
        </p>
      </main>
    </div>
  );
}
