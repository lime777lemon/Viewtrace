import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { journeyPurposeLabel, type JourneyPurpose } from "@/lib/journey-definition";
import { listJourneys, type JourneyDefinitionPublic } from "@/lib/journey-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Journeys | Viewtrace", robots: { index: false, follow: false } };

function purposeBadgeClass(purpose: JourneyPurpose): string {
  if (purpose === "test") return "border-amber-300 bg-amber-50 text-amber-950";
  if (purpose === "fixture") return "border-border bg-surface text-ink-muted";
  return "border-border bg-surface text-ink";
}

function JourneyRow({ journey, locale }: { journey: JourneyDefinitionPublic; locale: Locale }) {
  return (
    <li>
      <Link href={`/dashboard/journeys/${journey.id}`} className="flex items-baseline justify-between gap-3 px-4 py-3 text-sm text-ink hover:bg-surface">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">{journey.name}</span>
          <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${purposeBadgeClass(journey.purpose)}`}>
            {journeyPurposeLabel(journey.purpose, locale)}
          </span>
        </span>
        <span className="shrink-0 text-xs text-ink-muted">
          {journey.regions.join(", ")} · {journey.device_classes.join(", ")}
          {journey.watch_enabled ? ` · Watch ${journey.watch_frequency}` : ""}
        </span>
      </Link>
    </li>
  );
}

export default async function JourneysPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const locale = await getRequestLocale();
  const ja = locale === "ja";
  const supabase = await createSupabaseServerClient();
  let journeys: JourneyDefinitionPublic[] = [];
  let loadError: string | null = null;
  try {
    journeys = await listJourneys(supabase, session.userId);
  } catch {
    loadError = "Journey storage is not available yet. Apply supabase/migrations/20261022040813_journey_purpose.sql.";
  }
  const production = journeys.filter((journey) => journey.purpose === "production");
  const development = journeys.filter((journey) => journey.purpose !== "production");

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <div>
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
            <ul className="divide-y divide-border rounded-xl border border-border bg-surface-elevated">
              {production.map((journey) => <JourneyRow key={journey.id} journey={journey} locale={locale} />)}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">{ja ? "本番の Journey はありません。" : "No production journeys."}</p>
          )}
          {development.length ? (
            <details className="rounded-xl border border-border bg-surface-elevated">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-ink">
                Development
                <span className="ml-2 text-xs font-normal text-ink-muted">{development.length}</span>
              </summary>
              <ul className="divide-y divide-border border-t border-border">
                {development.map((journey) => <JourneyRow key={journey.id} journey={journey} locale={locale} />)}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
