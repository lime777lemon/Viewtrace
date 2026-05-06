import { redirect } from "next/navigation";
import { PurchaseHistoryTable } from "@/components/dashboard/PurchaseHistoryTable";
import { getSession } from "@/lib/auth/session";
import { copy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPurchasesPage() {
  const locale = await getRequestLocale();
  const t = copy[locale].dashboard;
  const th = copy[locale].dashboardHome;

  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id,plan_id,status,mode,created_at,updated_at")
    .order("created_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{t.nav.purchases}</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{th.purchaseTitle}</p>
      </div>
      <PurchaseHistoryTable rows={data ?? []} locale={locale} emptyMessage={th.purchaseEmpty} />
    </div>
  );
}

