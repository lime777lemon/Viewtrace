import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getSession } from "@/lib/auth/session";
import { readUserObservations } from "@/lib/demo/user-observations";
import { getPlan, TRIAL_CONFIG } from "@/lib/plans";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  if (!session) redirect("/login");

  const plan = getPlan(session.plan);
  const userObservations = await readUserObservations();
  const trialUsed = userObservations.length;
  const trialLimitReached =
    session.trialEligible && trialUsed >= TRIAL_CONFIG.freeObservations;

  return (
    <DashboardShell
      email={session.email}
      planId={session.plan}
      planName={plan.name}
      planPriceLabel={plan.priceLabel}
      trialLimitReached={trialLimitReached}
      trialObservationsUsed={trialUsed}
      trialObservationsLimit={TRIAL_CONFIG.freeObservations}
    >
      {children}
    </DashboardShell>
  );
}
