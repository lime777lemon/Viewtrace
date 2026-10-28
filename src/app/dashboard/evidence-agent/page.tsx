import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EvidenceAgentQuestion } from "@/components/dashboard/EvidenceAgentQuestion";
import { getSession } from "@/lib/auth/session";
import { getMergedObservationsForPlan } from "@/lib/demo/user-observations";
import {
  buildEvidenceHandoffQueue,
  buildEvidenceReview,
  evidenceHandoffCandidates,
  evidenceReviewDraft,
  evidenceReviewObservationIds,
  evidenceReviewSentence,
  type EvidenceReviewItem,
} from "@/lib/evidence-agent";
import { loadInteractionChecks } from "@/lib/evidence-agent-load";
import { formatJaDateTime, formatUtcLabel } from "@/lib/format";
import { copy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import type { AiAuditEvidenceId } from "@/lib/observation-ai-audit";
import { getPlan } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const EVIDENCE_IDS: AiAuditEvidenceId[] = [
  "screenshot",
  "detected_facts",
  "title",
  "description",
  "canonical",
  "noindex",
  "robots",
  "og",
  "http_status",
  "html_lang",
  "geo",
  "final_url",
  "interaction",
];

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    title: `${copy[locale].evidenceAgent.title} | Viewtrace`,
    robots: { index: false, follow: false },
  };
}

export default async function EvidenceAgentPage() {
  const locale = await getRequestLocale();
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/evidence-agent");

  const t = copy[locale].evidenceAgent;
  const shot = copy[locale].observationCompare;
  const canAsk = getPlan(session.plan).watchChangeAuditMonthly > 0;
  const now = new Date();
  const observations = await getMergedObservationsForPlan(session.plan);
  const pairs = evidenceHandoffCandidates({ now, observations });
  const supabase = await createSupabaseServerClient();
  const checks = await loadInteractionChecks(supabase, session.userId, [
    ...evidenceReviewObservationIds(observations),
    ...pairs.flatMap((pair) => [pair.current.id, pair.previous.id]),
  ]);
  const review = buildEvidenceReview({ now, observations, checks });
  const openIds = new Set(review.open.map((item) => item.observationId));
  const queue = buildEvidenceHandoffQueue({ now, observations, checks }).filter(
    (item) => !openIds.has(item.observationId),
  );

  const verifyById = new Map<string, string>();
  const ids = [...review.open, ...review.matched, ...queue].map((item) => item.observationId);
  if (ids.length > 0) {
    const { data } = await supabase
      .from("observations")
      .select("id,verify_token")
      .eq("user_id", session.userId)
      .in("id", ids);
    for (const row of data ?? []) {
      const id = typeof row.id === "string" ? row.id : "";
      const token = typeof row.verify_token === "string" ? row.verify_token.trim() : "";
      if (id && token) verifyById.set(id, token);
    }
  }

  const screenshotLabel = {
    same: shot.same,
    changed: shot.changed,
    not_comparable: shot.notComparable,
  };
  const evidenceNames = Object.fromEntries(EVIDENCE_IDS.map((id) => [id, t.evidence[id]])) as Record<
    AiAuditEvidenceId,
    string
  >;

  function card(item: EvidenceReviewItem | (typeof queue)[number], showDraft: boolean) {
    const verify = verifyById.get(item.observationId);
    const reviewItem = "checks" in item ? item : null;
    return (
      <div className="rounded-2xl border border-border bg-surface-elevated px-5 py-4">
        <p className="font-display text-lg font-semibold text-ink">{item.host}</p>
        <p className="mt-1 break-all font-mono text-xs text-ink-muted">{item.url}</p>
        <p className="mt-2 text-sm text-ink">
          {item.regionLabel}
          {" · "}
          {formatJaDateTime(item.capturedAt, locale)} · {formatUtcLabel(item.capturedAt)}
        </p>
        <dl className="mt-4 space-y-2 text-sm text-ink">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{t.screenshot}</dt>
            <dd className="mt-1">{screenshotLabel[item.screenshot]}</dd>
          </div>
          {item.behaviors.length > 0 ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{t.behavior}</dt>
              <dd className="mt-1 space-y-1">
                {item.behaviors.map((row, index) => (
                  <p key={`${item.observationId}-${index}`}>
                    {row.previous ? `${row.label}: ${row.previous} → ${row.current}` : `${row.label}: ${row.current}`}
                  </p>
                ))}
              </dd>
            </div>
          ) : null}
          {item.signalChanges.length > 0 ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{t.signals}</dt>
              <dd className="mt-1">{item.signalChanges.map((key) => t.signal[key]).join(" · ")}</dd>
            </div>
          ) : null}
          {reviewItem ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {reviewItem.state === "open" ? t.checkHeading : t.matchedHeading}
              </dt>
              <dd className="mt-1 space-y-1">
                {reviewItem.checks.map((check) => (
                  <p key={`${check.kind}-${check.label}`}>{evidenceReviewSentence(check, locale)}</p>
                ))}
              </dd>
            </div>
          ) : null}
        </dl>
        {showDraft && reviewItem ? (
          <div className="mt-4 rounded-xl border border-border bg-surface px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{t.draftHeading}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{evidenceReviewDraft(reviewItem, locale)}</p>
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
          <Link href={`/dashboard/observations/${item.observationId}`} className="text-accent hover:text-accent-hover">
            {t.openRecord}
          </Link>
          <Link
            href={`/dashboard/observations/compare?a=${item.previousObservationId}&b=${item.observationId}`}
            className="text-accent hover:text-accent-hover"
          >
            {t.openCompare}
          </Link>
          {verify ? (
            <Link href={`/verify/${verify}`} className="text-accent hover:text-accent-hover">
              {t.openHandoff}
            </Link>
          ) : null}
        </div>
        {canAsk ? (
          <EvidenceAgentQuestion
            observationId={item.observationId}
            locale={locale}
            askLabel={t.ask}
            askingLabel={t.asking}
            placeholder={t.placeholder}
            inferenceLabel={t.inference}
            recordLabel={t.record}
            evidenceLabel={t.evidenceBack}
            evidenceNames={evidenceNames}
            errors={t.errors}
          />
        ) : (
          <p className="mt-4 text-xs leading-relaxed text-ink-muted">{t.proQuestions}</p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{t.title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-muted">{t.subtitle}</p>
      </div>

      <h2 className="font-display text-lg font-semibold text-ink">{t.openTitle}</h2>
      {review.open.length === 0 ? <p className="text-sm text-ink-muted">{t.openEmpty}</p> : null}
      <ol className="space-y-4">
        {review.open.map((item) => (
          <li key={`${item.observationId}-${item.checks[0]?.kind}-${item.checks[0]?.label}`}>{card(item, true)}</li>
        ))}
      </ol>

      <h2 className="font-display text-lg font-semibold text-ink">{t.queueTitle}</h2>
      {queue.length === 0 ? <p className="text-sm text-ink-muted">{t.empty}</p> : null}
      <ol className="space-y-4">
        {queue.map((item) => (
          <li key={item.observationId}>{card(item, false)}</li>
        ))}
      </ol>

      <h2 className="font-display text-lg font-semibold text-ink">{t.matchedTitle}</h2>
      {review.matched.length === 0 ? <p className="text-sm text-ink-muted">{t.matchedEmpty}</p> : null}
      <ol className="space-y-4">
        {review.matched.map((item) => (
          <li key={`${item.observationId}-matched-${item.checks[0]?.label}`}>{card(item, false)}</li>
        ))}
      </ol>
    </div>
  );
}
