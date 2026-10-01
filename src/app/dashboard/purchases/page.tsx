import { redirect } from "next/navigation";
import { PurchaseHistoryTable } from "@/components/dashboard/PurchaseHistoryTable";
import { getSession } from "@/lib/auth/session";
import { copy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { listMonthlyInvoicesForCustomer } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPurchasesPage() {
  const locale = await getRequestLocale();
  const t = copy[locale].dashboard;
  const th = copy[locale].dashboardHome;

  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = await createSupabaseServerClient();
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .order("updated_at", { ascending: false })
    .limit(10);

  const customerId =
    session.stripeCustomerId ??
    subs?.map((row) => row.stripe_customer_id).find((id): id is string => Boolean(id?.trim())) ??
    null;

  const invoices = customerId ? await listMonthlyInvoicesForCustomer(customerId) : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{t.nav.purchases}</h1>
        <p className="mt-1 text-sm text-ink-muted">{th.purchaseIntro}</p>
      </div>
      <PurchaseHistoryTable invoices={invoices} locale={locale} emptyMessage={th.purchaseEmpty} />
    </div>
  );
}
