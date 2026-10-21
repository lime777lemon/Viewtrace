import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { JourneyEditor } from "@/components/dashboard/JourneyEditor";
import { getSession } from "@/lib/auth/session";
import { getPlan } from "@/lib/plans";
import { getRegionLabelForLocale, getRegionOptions } from "@/lib/regions";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { getJourney, listJourneyRuns } from "@/lib/journey-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Journey | Viewtrace", robots: { index: false, follow: false } };

export default async function JourneyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const locale = await getRequestLocale();
  const plan = getPlan(session.plan);
  const regions = getRegionOptions(session.plan).map((region) => ({
    value: region.value,
    label: getRegionLabelForLocale(region, locale),
  }));
  const supabase = await createSupabaseServerClient();
  const journey = await getJourney(supabase, session.userId, id).catch(() => null);
  if (!journey) notFound();
  const runs = await listJourneyRuns(supabase, session.userId, id).catch(() => []);
  return (
    <div className="mx-auto max-w-5xl">
      <JourneyEditor journey={journey} regions={regions} watchAllowed={plan.autoObservationWatch} runs={runs} locale={locale} />
    </div>
  );
}
