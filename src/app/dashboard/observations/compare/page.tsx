import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ObservationCompareView } from "@/components/dashboard/ObservationCompareView";
import { getSession } from "@/lib/auth/session";
import {
  getObservationMergedForPlan,
  listObservationsForUrlIdentity,
} from "@/lib/demo/user-observations";
import { copy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import {
  compareModeForPair,
  compareObservations,
  orderObservationsByCapturedAt,
  sameObservationUrlIdentity,
} from "@/lib/observation-compare";
import { sanitizeObservationRouteId } from "@/lib/observation-route-id";
import { getPlan } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Compare observations | Viewtrace",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ a?: string; b?: string }>;
};

export default async function ObservationComparePage({ searchParams }: Props) {
  const session = await getSession();
  const locale = await getRequestLocale();
  const t = copy[locale].observationCompare;
  const sp = await searchParams;

  if (!session) redirect("/login?next=/dashboard/observations/compare");

  const idA = sanitizeObservationRouteId(sp.a ?? "");
  const idB = sanitizeObservationRouteId(sp.b ?? "");

  if (!idA || !idB) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="text-sm text-ink-muted">{t.missing}</p>
        <Link href="/dashboard/observations" className="text-sm font-semibold text-accent hover:text-accent-hover">
          {t.backToRecord}
        </Link>
      </div>
    );
  }

  if (idA === idB) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="text-sm text-ink-muted">{t.sameRecord}</p>
        <Link
          href={`/dashboard/observations/${idA}`}
          className="text-sm font-semibold text-accent hover:text-accent-hover"
        >
          {t.backToRecord}
        </Link>
      </div>
    );
  }

  const leftRaw = await getObservationMergedForPlan(idA, session.plan);
  const rightRaw = await getObservationMergedForPlan(idB, session.plan);
  if (!leftRaw || !rightRaw) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="text-sm text-ink-muted">{t.notFound}</p>
        <Link href="/dashboard/observations" className="text-sm font-semibold text-accent hover:text-accent-hover">
          {t.backToRecord}
        </Link>
      </div>
    );
  }

  const mode = compareModeForPair(leftRaw, rightRaw);
  if (!mode) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="text-sm text-ink-muted">{t.mismatch}</p>
        <Link
          href={`/dashboard/observations/${leftRaw.id}`}
          className="text-sm font-semibold text-accent hover:text-accent-hover"
        >
          {t.backToRecord}
        </Link>
      </div>
    );
  }

  const [left, right] =
    mode === "time" ? orderObservationsByCapturedAt(leftRaw, rightRaw) : [leftRaw, rightRaw];
  const related = await listObservationsForUrlIdentity(left.url);
  const siblings =
    mode === "time"
      ? related.filter((row) => (row.regionValue ?? "") === (left.regionValue ?? ""))
      : related.filter((row) => sameObservationUrlIdentity(row.url, left.url));
  const fields = compareObservations(left, right);
  const plan = getPlan(session.plan);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href={`/dashboard/observations/${right.id}`}
        className="inline-flex text-sm font-medium text-accent hover:text-accent-hover"
      >
        {t.backToRecord}
      </Link>
      <ObservationCompareView
        left={left}
        right={right}
        siblings={siblings}
        fields={fields}
        locale={locale}
        retentionDays={plan.retentionDays}
        mode={mode}
      />
    </div>
  );
}
