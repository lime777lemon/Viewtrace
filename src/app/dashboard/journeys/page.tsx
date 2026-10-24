import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { JourneyStatusBadge } from "@/components/dashboard/JourneyRunsTable";
import { formatJaDateTime, formatUtcLabel } from "@/lib/format";
import { copy, type Locale } from "@/lib/i18n";
import { getSession } from "@/lib/auth/session";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { journeyPurposeLabel, type JourneyPurpose } from "@/lib/journey-definition";
import { latestJourneyStatuses, listJourneys, type JourneyDefinitionPublic } from "@/lib/journey-store";
import { getRegionLabelForLocale, getRegionOptions } from "@/lib/regions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Journeys | Viewtrace", robots: { index: false, follow: false } };

function purposeBadgeClass(purpose: JourneyPurpose): string {
  if (purpose === "test") return "border-amber-300 bg-amber-50 text-amber-950";
  if (purpose === "fixture") return "border-border bg-surface text-ink-muted";
  return "border-border bg-surface text-ink";
}

function JourneyListTable({
  journeys,
  statuses,
  locale,
  framed = true,
}: {
  journeys: JourneyDefinitionPublic[];
  statuses: Map<string, "passed" | "failed" | "blocked" | "incomplete">;
  locale: Locale;
  framed?: boolean;
}) {
  const tb = copy[locale].observationsTable;
  const regionLabel = new Map(getRegionOptions("pro").map((region) => [region.value, getRegionLabelForLocale(region, locale)]));
  return (
    <div className={framed ? "overflow-hidden rounded-xl border border-border bg-surface-elevated" : "overflow-hidden"}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-160 text-left text-sm">
          <thead className="border-b border-border bg-surface text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3">{tb.colCaptured}</th>
              <th className="px-4 py-3">{tb.colUrl}</th>
              <th className="px-4 py-3">{tb.colRegion}</th>
              <th className="px-4 py-3">{tb.colStatus}</th>
              <th className="px-4 py-3 text-right">{tb.colActions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {journeys.map((journey) => {
              const href = `/dashboard/journeys/${journey.id}`;
              const status = statuses.get(journey.id) ?? null;
              return (
                <tr key={journey.id} className="align-top hover:bg-surface/80">
                  <td className="px-4 py-3 text-ink-muted">
                    {journey.last_run_at ? (
                      <>
                        <span className="text-ink">{formatJaDateTime(journey.last_run_at, locale)}</span>
                        <span className="mt-0.5 block text-[11px] text-ink-muted">{formatUtcLabel(journey.last_run_at)}</span>
                      </>
                    ) : (
                      <span>—</span>
                    )}
                  </td>
                  <td className="max-w-55 px-4 py-3">
                    <span className="block truncate font-mono text-xs text-ink">{journey.start_url}</span>
                    <span className="mt-0.5 flex min-w-0 items-center gap-2">
                      <span className="truncate text-xs text-ink-muted">{journey.name}</span>
                      <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${purposeBadgeClass(journey.purpose)}`}>
                        {journeyPurposeLabel(journey.purpose, locale)}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {journey.regions.map((value) => (
                      <span key={value} className="block">{regionLabel.get(value) ?? value}</span>
                    ))}
                  </td>
                  <td className="px-4 py-3">
                    {status ? <JourneyStatusBadge status={status} locale={locale} /> : <span className="text-ink-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={href} className="font-medium text-accent hover:text-accent-hover">
                      {tb.actionDetail}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function JourneysPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const locale = await getRequestLocale();
  const ja = locale === "ja";
  const supabase = await createSupabaseServerClient();
  let journeys: JourneyDefinitionPublic[] = [];
  let statuses = new Map<string, "passed" | "failed" | "blocked" | "incomplete">();
  let loadError: string | null = null;
  try {
    journeys = await listJourneys(supabase, session.userId);
    statuses = await latestJourneyStatuses(supabase, session.userId);
  } catch {
    loadError = "Journey storage is not available yet. Apply supabase/migrations/20261022040813_journey_purpose.sql.";
  }
  const production = journeys.filter((journey) => journey.purpose === "production");
  const development = journeys.filter((journey) => journey.purpose !== "production");

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <div data-tour="journeys">
        <h1 className="text-lg font-semibold text-ink">Journey</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {ja ? "本番の Journey だけを表示しています。" : "Showing production journeys."}
        </p>
        <Link href="/dashboard/region-search" className="mt-3 inline-flex text-sm font-semibold text-ink underline">
          {ja ? "地域で試す" : "Try by region"}
        </Link>
      </div>
      {loadError ? <p className="text-sm text-red-700">{loadError}</p> : null}
      {journeys.length ? (
        <div className="grid gap-4">
          {production.length ? (
            <JourneyListTable journeys={production} statuses={statuses} locale={locale} />
          ) : (
            <p className="text-sm text-ink-muted">{ja ? "本番の Journey はありません。" : "No production journeys."}</p>
          )}
          {development.length ? (
            <details className="rounded-xl border border-border bg-surface-elevated">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-ink">
                Development
                <span className="ml-2 text-xs font-normal text-ink-muted">{development.length}</span>
              </summary>
              <div className="border-t border-border">
                <JourneyListTable journeys={development} statuses={statuses} locale={locale} framed={false} />
              </div>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
