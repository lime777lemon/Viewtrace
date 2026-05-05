import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getSession } from "@/lib/auth/session";
import { readUserObservations } from "@/lib/demo/user-observations";
import { getPlan, TRIAL_CONFIG } from "@/lib/plans";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { getPlanLabels, getTrialPlanUi } from "@/lib/plans/labels";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();
  const session = await getSession();
  if (!session) redirect("/login");

  const plan = getPlan(session.plan);
  const userObservations = await readUserObservations();
  const trialUsed = userObservations.length;
  const trialLimitReached =
    session.trialEligible && trialUsed >= TRIAL_CONFIG.freeObservations;
  const trialExpired = session.trialEligible && session.trialExpired;
  const trialUi = getTrialPlanUi(locale);
  const labels = getPlanLabels(session.plan, locale);
  const uiPlanName = session.trialEligible ? trialUi.name : plan.name;
  const uiPlanPriceLabel = session.trialEligible ? trialUi.priceLabel : labels.priceLabel;

  return (
    <DashboardShell
      email={session.email}
      planId={session.plan}
      planName={uiPlanName}
      planPriceLabel={uiPlanPriceLabel}
      locale={locale}
      trialExpired={trialExpired}
      trialEndsAt={session.trialEndsAt}
      trialLimitReached={trialLimitReached}
      trialObservationsUsed={trialUsed}
      trialObservationsLimit={TRIAL_CONFIG.freeObservations}
    >
      {children}
    </DashboardShell>
  );
}
