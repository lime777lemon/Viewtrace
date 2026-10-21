import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { listJourneys } from "@/lib/journey-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Journeys | Viewtrace", robots: { index: false, follow: false } };

export default async function JourneysPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const locale = await getRequestLocale();
  const supabase = await createSupabaseServerClient();
  let journeys: Awaited<ReturnType<typeof listJourneys>> = [];
  let loadError: string | null = null;
  try {
    journeys = await listJourneys(supabase, session.userId);
  } catch {
    loadError = "Journey storage is not available yet. Apply supabase/migrations/20261021120000_journey_definitions.sql.";
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">Journey</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {locale === "ja"
            ? "手順ごとの結果はここに残ります。"
            : "Step results stay here."}
        </p>
        <Link href="/dashboard/region-search" className="mt-3 inline-flex text-sm font-semibold text-ink underline">
          {locale === "ja" ? "地域で試す" : "Try by region"}
        </Link>
      </div>
      {loadError ? <p className="text-sm text-red-700">{loadError}</p> : null}
      {journeys.length ? (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface-elevated">
          {journeys.map((journey) => (
            <li key={journey.id}>
              <Link href={`/dashboard/journeys/${journey.id}`} className="flex items-baseline justify-between gap-3 px-4 py-3 text-sm text-ink hover:bg-surface">
                <span>{journey.name}</span>
                <span className="text-xs text-ink-muted">
                  {journey.regions.join(", ")} · {journey.device_classes.join(", ")}
                  {journey.watch_enabled ? ` · Watch ${journey.watch_frequency}` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
