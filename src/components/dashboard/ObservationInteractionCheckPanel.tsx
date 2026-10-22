"use client";

import { useRouter } from "next/navigation";
import { Fragment, useMemo, useState, useTransition } from "react";
import {
  prepareObservationScrollChecksAction,
  runObservationScrollInteractionAction,
} from "@/app/actions/observation-optional-metrics";
import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";
import {
  INTERACTION_CHECK_GROUPS,
  type InteractionCheckGroupId,
  type InteractionCheckType,
  type InteractionTypeRow,
  type RegionalInteractionCheckV1,
  typeRow,
} from "@/lib/observation-regional-interaction";
import { behaviorAlertTransitions, type BehaviorDiffV1, type BehaviorMapSection } from "@/lib/observation-behavior-diff";
import { addDiscoveryToJourneyAction } from "@/app/actions/journeys";
import { discoveryJourneyCandidates } from "@/lib/discovery-to-journey";
import { journeyStepHostAllowed } from "@/lib/journey-definition";
import { clientBlockedLabel } from "@/lib/measured-client-summary";
import { summarizeBehaviorScan } from "@/lib/observation-behavior-discovery";
import { presentInteractionHealth } from "@/lib/interaction-health-presentation";
import { InteractionHealthSummary } from "@/components/dashboard/InteractionHealthSummary";
import { interactionEvidenceCard } from "@/lib/interaction-evidence-card";
import { summarizeInteractionMeasurement } from "@/lib/observation-interaction-plan";
import { SCROLL_CHECK_MAX_REGIONS, type ScrollInteractionStatus } from "@/lib/observation-scroll-interaction";

export type InteractionRegionPeer = {
  observationId: string;
  regionLabel: string;
  check: RegionalInteractionCheckV1 | null;
};

type Props = {
  observationId: string;
  regionLabel: string;
  initialCheck: RegionalInteractionCheckV1 | null;
  regionPeers: InteractionRegionPeer[];
  locale: Locale;
  canRun: boolean;
  used: number;
  limit: number;
  behaviorDiff?: BehaviorDiffV1 | null;
  previousCheck?: RegionalInteractionCheckV1 | null;
  watchIncluded?: boolean;
  observationUrl?: string;
  journeyTargets?: Array<{ id: string; name: string; startUrl: string }>;
};

function shortSelector(selector: string): string {
  const parts = selector.split(">").map((part) => part.trim()).filter(Boolean);
  return parts.slice(-2).join(" › ") || selector;
}

function changeLabel(change: string, t: (typeof copy)[Locale]["observationDetail"]): string {
  if (change === "bounding_rect") return t.interactionChangeSize;
  if (change === "display" || change === "visibility" || change === "opacity") return t.interactionChangeVisibility;
  return change;
}

function blockedParts(text: string): { name: string; path: string | null } {
  const index = text.indexOf(" /");
  if (index > 0) {
    const path = text.slice(index + 1).trim();
    if (path.startsWith("/")) return { name: clientBlockedLabel(text), path };
  }
  return { name: text, path: null };
}

function mapSectionLabel(section: BehaviorMapSection, t: (typeof copy)[Locale]["observationDetail"]): string {
  if (section === "new") return t.interactionMapNew;
  if (section === "changed") return t.interactionMapChanged;
  if (section === "missing") return t.interactionMapMissing;
  return t.interactionMapUnchanged;
}

function BehaviorMapDiffList({
  diffs,
  t,
}: {
  diffs: BehaviorDiffV1["map_diffs"];
  t: (typeof copy)[Locale]["observationDetail"];
}) {
  const sections: BehaviorMapSection[] = ["new", "changed", "missing", "unchanged"];
  return (
    <div className="mt-3 space-y-3">
      {sections.map((section) => {
        const rows = diffs.filter((row) => row.section === section);
        if (!rows.length) return null;
        const body = (
          <ul className="mt-1 space-y-1 text-sm text-ink">
            {rows.map((row) => (
              <li key={`${section}:${row.type ?? row.selector}:${row.detail}`}>
                <span className="font-medium">{row.label}</span>
                <span className="mt-0.5 block text-xs text-ink-muted">{row.detail}</span>
              </li>
            ))}
          </ul>
        );
        if (section === "unchanged" && rows.length > 4) {
          return (
            <details key={section}>
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-ink-muted">
                {mapSectionLabel(section, t)} · {rows.length}
              </summary>
              {body}
            </details>
          );
        }
        return (
          <div key={section}>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{mapSectionLabel(section, t)}</p>
            {body}
          </div>
        );
      })}
    </div>
  );
}

function statusText(
  status: ScrollInteractionStatus,
  t: (typeof copy)[Locale]["observationDetail"],
): string {
  if (status === "working") return t.interactionWorking;
  if (status === "no_change_observed") return t.interactionNoChange;
  if (status === "failed") return t.interactionFailed;
  if (status === "not_detected") return t.interactionNotDetected;
  if (status === "blocked_for_safety") return t.interactionBlocked;
  if (status === "playback_not_verifiable") return t.interactionPlaybackUnverifiable;
  return t.interactionNotMeasured;
}

function statusClass(status: ScrollInteractionStatus): string {
  if (status === "working") return "font-semibold text-emerald-800 dark:text-emerald-200";
  if (status === "failed") return "font-semibold text-red-800 dark:text-red-200";
  if (status === "no_change_observed") return "font-semibold text-amber-800 dark:text-amber-200";
  if (status === "blocked_for_safety") return "font-semibold text-amber-800 dark:text-amber-200";
  return "text-ink-muted";
}

function typeLabel(
  type: InteractionCheckType,
  t: (typeof copy)[Locale]["observationDetail"],
): string {
  const labels: Record<InteractionCheckType, string> = {
    scroll: t.interactionScroll,
    hover: t.interactionHover,
    menu: t.interactionMenu,
    modal: t.interactionModal,
    accordion: t.interactionAccordion,
    tabs: t.interactionTabs,
    tooltip: t.interactionTooltip,
    form: t.interactionForm,
    drag: t.interactionDrag,
    swipe: t.interactionSwipe,
    cursor_follow: t.interactionCursorFollow,
    load_animation: t.interactionLoadAnimation,
    css_animation: t.interactionCssAnimation,
    js_animation: t.interactionJsAnimation,
    scroll_reveal: t.interactionScrollReveal,
    delayed: t.interactionDelayed,
    lazy_load: t.interactionLazyLoad,
    carousel: t.interactionCarousel,
    auto_carousel: t.interactionAutoCarousel,
    video: t.interactionVideo,
    embedded_video: t.interactionEmbeddedVideo,
    lottie: t.interactionLottie,
    svg_animation: t.interactionSvgAnimation,
    canvas: t.interactionCanvas,
    webgl: t.interactionWebgl,
  };
  return labels[type];
}

function evidenceLine(row: InteractionTypeRow): string | null {
  const ev = row.evidence;
  if (!ev) return null;
  const parts: string[] = [];
  if (ev.selector) parts.push(ev.selector);
  if (ev.actions?.length) parts.push(ev.actions.join(" + "));
  if (ev.changes?.length) parts.push(ev.changes.join(", "));
  if (ev.frame_hashes && ev.frame_hashes.length >= 2) {
    parts.push(ev.frame_hashes.map((h) => h.slice(0, 12)).join(" → "));
  }
  if (ev.t0?.currentTime != null || ev.t1?.currentTime != null) {
    parts.push(`currentTime ${ev.t0?.currentTime ?? "—"} → ${ev.t1?.currentTime ?? "—"}`);
  }
  if (ev.restore) parts.push(`restore ${ev.restore}`);
  if (ev.note) parts.push(ev.note);
  if (ev.t0 && ev.t1) {
    const t0 = [
      ev.t0.opacity != null ? `opacity ${ev.t0.opacity}` : null,
      ev.t0.transform ? `transform ${String(ev.t0.transform).slice(0, 40)}` : null,
      ev.t0.display ? `display ${ev.t0.display}` : null,
      ev.t0.expanded != null ? `aria-expanded ${ev.t0.expanded}` : null,
    ]
      .filter(Boolean)
      .join(", ");
    const t1 = [
      ev.t1.opacity != null ? `opacity ${ev.t1.opacity}` : null,
      ev.t1.transform ? `transform ${String(ev.t1.transform).slice(0, 40)}` : null,
      ev.t1.display ? `display ${ev.t1.display}` : null,
      ev.t1.expanded != null ? `aria-expanded ${ev.t1.expanded}` : null,
    ]
      .filter(Boolean)
      .join(", ");
    if (t0 || t1) parts.push(`T0 ${t0 || "—"} → T1 ${t1 || "—"}`);
  }
  return parts.length ? parts.join(" · ") : null;
}

function EvidenceCard({
  type,
  row,
  t,
  empty,
}: {
  type: InteractionCheckType;
  row: InteractionTypeRow;
  t: (typeof copy)[Locale]["observationDetail"];
  empty: string;
}) {
  const card = interactionEvidenceCard(type, row.evidence);
  if (!card) return <p className="mt-2 text-xs text-ink-muted">{empty}</p>;
  const beforeLines = card.facets.map((facet) => `${facet.label}  ${facet.before}`);
  const afterLines = card.facets.map((facet) => `${facet.label}  ${facet.after}`);
  return (
    <div className="mt-2 rounded-lg border border-border bg-surface px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{typeLabel(type, t)}</p>
      {card.target ? <p className="mt-1 font-mono text-[11px] text-ink">{card.target}</p> : null}
      {card.facets.length > 0 ? (
        <div className="mt-3 flex items-stretch gap-2">
          <div className="min-w-0 flex-1 rounded-md border border-border px-2 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{card.beforeLabel}</p>
            <div className="mt-2 space-y-1">
              {beforeLines.map((line) => (
                <p key={line} className="font-mono text-[11px] leading-relaxed text-ink">
                  {line}
                </p>
              ))}
            </div>
          </div>
          <p className="self-center text-xs text-ink-muted" aria-hidden="true">
            →
          </p>
          <div className="min-w-0 flex-1 rounded-md border border-border px-2 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{card.afterLabel}</p>
            <div className="mt-2 space-y-1">
              {afterLines.map((line) => (
                <p key={line} className="font-mono text-[11px] leading-relaxed text-ink">
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {card.frames ? (
        <p className="mt-2 font-mono text-[11px] text-ink-muted">
          frame {card.frames[0]} → {card.frames[1]}
        </p>
      ) : null}
      {card.action ? (
        <p className="mt-2 text-[11px] text-ink-muted">
          <span className="font-semibold uppercase tracking-wider">{t.interactionEvidenceTrigger}</span>
          <span className="ml-2 font-mono text-ink">{card.action}</span>
        </p>
      ) : null}
      {card.facets.length > 0 ? (
        <div className="mt-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            {t.interactionEvidenceObserved}
          </p>
          <ul className="mt-1 space-y-0.5">
            {card.facets.map((facet) => (
              <li key={facet.label} className="font-mono text-[11px] text-ink">
                {facet.label} {facet.before} → {facet.after}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {card.note ? <p className="mt-2 text-[11px] text-ink-muted">{card.note}</p> : null}
      {card.restore ? (
        <p className="mt-2 text-[11px] text-ink">
          {card.restore === "ok" ? t.interactionEvidenceRestoreOk : t.interactionEvidenceRestoreFailed}
        </p>
      ) : null}
    </div>
  );
}

function groupLabel(
  id: InteractionCheckGroupId,
  t: (typeof copy)[Locale]["observationDetail"],
): string {
  if (id === "user") return t.interactionGroupUser;
  if (id === "motion") return t.interactionGroupMotion;
  return t.interactionGroupMedia;
}

export function ObservationInteractionCheckPanel({
  observationId,
  regionLabel,
  initialCheck,
  regionPeers,
  locale,
  canRun,
  used,
  limit,
  behaviorDiff = null,
  previousCheck = null,
  watchIncluded = false,
  observationUrl = "",
  journeyTargets = [],
}: Props) {
  const t = copy[locale].observationDetail;
  const router = useRouter();
  const options = useMemo(() => {
    const seen = new Set<string>();
    const rows: InteractionRegionPeer[] = [];
    for (const row of [{ observationId, regionLabel, check: initialCheck }, ...regionPeers]) {
      if (seen.has(row.observationId)) continue;
      seen.add(row.observationId);
      rows.push(row);
      if (rows.length >= SCROLL_CHECK_MAX_REGIONS) break;
    }
    return rows;
  }, [observationId, regionLabel, initialCheck, regionPeers]);

  const [checkById, setCheckById] = useState<Record<string, RegionalInteractionCheckV1 | null>>(() => {
    const out: Record<string, RegionalInteractionCheckV1 | null> = {};
    for (const row of options) out[row.observationId] = row.check;
    return out;
  });
  const [selected, setSelected] = useState<string[]>([observationId]);
  const [usedCount, setUsedCount] = useState(used);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [journeyChoice, setJourneyChoice] = useState("");
  const [journeyPicked, setJourneyPicked] = useState<string[] | null>(null);
  const [journeyMessage, setJourneyMessage] = useState<string | null>(null);
  const [journeyPending, startJourney] = useTransition();

  const selectedIds = options.map((row) => row.observationId).filter((id) => selected.includes(id));
  const runCount = selectedIds.length;
  const quotaShort = runCount > 0 && usedCount + runCount > limit;

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((row) => row !== id) : [...prev, id]));
  }

  function runChecks() {
    setError(null);
    start(async () => {
      const prepared = await prepareObservationScrollChecksAction(selectedIds);
      if (!prepared.ok) {
        const map: Record<string, string> = {
          unauthorized: t.interactionErrAuth,
          invalid_id: t.interactionErrNotFound,
          not_found: t.interactionErrNotFound,
          quota: t.interactionQuotaNeed,
          failed: t.interactionErrFailed,
          browserless_not_configured: t.interactionErrCapture,
        };
        setError(map[prepared.error] ?? t.interactionErrFailed);
        if (prepared.used != null) setUsedCount(prepared.used);
        return;
      }
      for (const id of prepared.observationIds) {
        const result = await runObservationScrollInteractionAction(id);
        if (!result.ok) {
          const map: Record<string, string> = {
            unauthorized: t.interactionErrAuth,
            invalid_id: t.interactionErrNotFound,
            not_found: t.interactionErrNotFound,
            quota: t.interactionQuotaNeed,
            failed: t.interactionErrFailed,
            browserless_not_configured: t.interactionErrCapture,
          };
          setError(map[result.error] ?? t.interactionErrFailed);
          if (result.used != null) setUsedCount(result.used);
          break;
        }
        setCheckById((prev) => ({ ...prev, [id]: result.check }));
        setUsedCount(result.used);
      }
      router.refresh();
    });
  }

  const current = checkById[observationId] ?? initialCheck;
  const measurement = current ? summarizeInteractionMeasurement(current.types) : null;
  const scroll = current?.scroll ?? null;
  const scrollStatus = typeRow(current, "scroll").status;
  const distance = scroll ? Math.max(0, scroll.scroll_end - scroll.scroll_start) : 0;
  const runLabel =
    runCount <= 1
      ? current
        ? t.interactionRunAgain
        : t.interactionRun
      : t.interactionRunN.replace("{n}", String(runCount));
  const behaviorAlerts = behaviorAlertTransitions(behaviorDiff);
  const mapDiffs = behaviorDiff?.map_diffs ?? [];
  const scanSummary = current?.discovery
    ? summarizeBehaviorScan(current.discovery.map, current.types, current.discovery.safety.blocked.length)
    : null;
  const workingRows = (current?.types ?? []).filter((row) => row.status === "working");
  const attentionTypes = new Set(behaviorAlerts.map((row) => row.type));
  const notDetectedQuiet = (current?.types ?? []).filter(
    (row) => row.status === "not_detected" && !attentionTypes.has(row.type),
  ).length;
  const compareHref =
    behaviorDiff?.previous_observation_id
      ? `/dashboard/observations/compare?a=${behaviorDiff.previous_observation_id}&b=${observationId}`
      : null;
  const journeyCandidates = current?.discovery
    ? discoveryJourneyCandidates({
        transitions: current.discovery.transitions,
        blocked: current.discovery.safety.blocked,
      })
    : [];
  const journeyPickedIds = journeyPicked ?? journeyCandidates.filter((candidate) => !candidate.sideEffect).map((candidate) => candidate.id);
  const matchingJourneys = journeyTargets.filter((row) => observationUrl && journeyStepHostAllowed(row.startUrl, observationUrl));
  const presentation = presentInteractionHealth({ diff: behaviorDiff, check: current, previous: previousCheck });
  const blockedGroups = new Map<string, number>();
  for (const row of current?.discovery?.safety.blocked ?? []) {
    blockedGroups.set(row.text, (blockedGroups.get(row.text) ?? 0) + 1);
  }

  function addDiscoveredJourney() {
    if (!journeyPickedIds.length) {
      setJourneyMessage(t.interactionAddToJourneyEmpty);
      return;
    }
    setJourneyMessage(null);
    startJourney(async () => {
      const result = await addDiscoveryToJourneyAction({
        observationId,
        journeyId: journeyChoice || undefined,
        candidateIds: journeyPickedIds,
      });
      if (!result.ok) {
        setJourneyMessage(result.error);
        return;
      }
      router.push(`/dashboard/journeys/${result.id}`);
    });
  }

  return (
    <section
      id="observation-interaction-check"
      className="scroll-mt-28 rounded-xl border border-border bg-surface-elevated p-4 sm:p-5"
      aria-labelledby="observation-interaction-check-heading"
    >
      <h3 id="observation-interaction-check-heading" className="text-sm font-semibold text-ink">
        {t.interactionHealthTitle}
      </h3>
      <details className="mt-1">
        <summary className="cursor-pointer text-xs text-ink-muted">{t.interactionHow}</summary>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t.interactionHint}</p>
      </details>
      {watchIncluded ? <p className="mt-2 text-xs text-ink-muted">{t.interactionWatchNote}</p> : null}
      {presentation ? (
        <InteractionHealthSummary
          presentation={presentation}
          t={t}
          typeLabel={(type) => typeLabel(type, t)}
          renderProblem={(type) => (
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{t.interactionPrevious}</p>
                <EvidenceCard type={type} row={typeRow(previousCheck, type)} t={t} empty={t.interactionPreviousEvidenceUnavailable} />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{t.interactionCurrent}</p>
                <EvidenceCard type={type} row={typeRow(current, type)} t={t} empty={t.interactionCurrentEvidenceUnavailable} />
              </div>
            </div>
          )}
        />
      ) : null}
      <details className="mt-4" open={presentation ? undefined : true}>
        {presentation ? (
          <summary className="cursor-pointer text-xs font-semibold text-ink-muted">{t.interactionPresentTechnical}</summary>
        ) : null}
      {current?.discovery ? (
        <div className="mt-3 rounded-lg border border-border bg-surface px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t.interactionBehaviorScan}</p>
          {scanSummary && (current.discovery.map.length > 0 || Object.values(current.discovery.routes).some((route) => route.ran)) ? (
            <ul className="mt-3 grid gap-2 sm:grid-cols-3">
              <li className="rounded-lg border border-border px-3 py-2">
                <p className="text-lg font-semibold text-ink">{scanSummary.verified}</p>
                <p className="text-xs font-medium text-ink">{t.interactionScanVerifiedTitle}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t.interactionScanVerifiedNote}</p>
              </li>
              <li className="rounded-lg border border-border px-3 py-2">
                <p className="text-lg font-semibold text-ink">{scanSummary.unknown}</p>
                <p className="text-xs font-medium text-ink">{t.interactionScanUnknownTitle}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t.interactionScanUnknownNote}</p>
              </li>
              <li className="rounded-lg border border-border px-3 py-2">
                <p className="text-lg font-semibold text-ink">{scanSummary.blocked}</p>
                <p className="text-xs font-medium text-ink">{t.interactionNotClicked}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t.interactionScanBlockedNote}</p>
              </li>
            </ul>
          ) : (
            <p className="mt-1 text-sm text-ink">
              {t.interactionBehaviorScanLine
                .replace("{detected}", String(current.discovery.detected))
                .replace("{verified}", String(current.discovery.verified))
                .replace("{blocked}", String(current.discovery.blocked))
                .replace("{not_measured}", String(current.discovery.not_measured))}
            </p>
          )}
          {journeyCandidates.length > 0 ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-ink-muted">{t.interactionAddToJourneyHint}</p>
              <ul className="space-y-1">
                {journeyCandidates.map((candidate) => (
                  <li key={candidate.id}>
                    <label className="flex items-center gap-2 text-xs text-ink">
                      <input
                        type="checkbox"
                        checked={journeyPickedIds.includes(candidate.id)}
                        onChange={() => {
                          const next = journeyPickedIds.includes(candidate.id)
                            ? journeyPickedIds.filter((id) => id !== candidate.id)
                            : [...journeyPickedIds, candidate.id];
                          setJourneyPicked(next);
                        }}
                      />
                      <span>
                        {candidate.label}
                        {candidate.expect_visible ? " · visible" : ""}
                        {candidate.sideEffect ? ` · ${candidate.sideEffect}` : ""}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <select
                  value={journeyChoice}
                  onChange={(event) => setJourneyChoice(event.target.value)}
                  className="rounded-lg border border-border bg-surface-elevated px-2 py-2 text-xs text-ink"
                >
                  <option value="">{t.interactionAddToJourneyNew}</option>
                  {matchingJourneys.map((journey) => (
                    <option key={journey.id} value={journey.id}>{journey.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={journeyPending || journeyPickedIds.length === 0}
                  onClick={addDiscoveredJourney}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-ink hover:bg-surface-elevated disabled:opacity-50"
                >
                  {t.interactionAddToJourney}
                </button>
              </div>
              {journeyMessage ? <p className="text-xs text-ink-muted">{journeyMessage}</p> : null}
            </div>
          ) : null}
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-semibold text-ink-muted">{t.interactionScanRecord}</summary>
          {Object.values(current.discovery.routes).some((route) => route.ran) ? (
            <p className="mt-2 text-xs text-ink-muted">
              {t.interactionDiscoveryRoutes
                .replace("{dom}", current.discovery.routes.dom.ran ? String(current.discovery.routes.dom.hits) : "skipped")
                .replace("{style}", current.discovery.routes.style.ran ? String(current.discovery.routes.style.hits) : "skipped")
                .replace("{animation}", current.discovery.routes.animation.ran ? String(current.discovery.routes.animation.hits) : "skipped")
                .replace("{media}", current.discovery.routes.media.ran ? String(current.discovery.routes.media.hits) : "skipped")
                .replace("{frame}", current.discovery.routes.frame.ran ? String(current.discovery.routes.frame.hits) : "skipped")
                .replace("{scroll}", current.discovery.routes.scroll.ran ? String(current.discovery.routes.scroll.hits) : "skipped")
                .replace("{actionable}", current.discovery.routes.actionable.ran ? String(current.discovery.routes.actionable.hits) : "skipped")}
            </p>
          ) : null}
          {current.discovery.traversal ? (
            <p className="mt-1 text-xs text-ink-muted">
              {t.interactionShadowOpen.replace("{n}", String(current.discovery.traversal.shadow_open))}
              {current.discovery.traversal.shadow_closed
                ? ` · ${t.interactionShadowClosed.replace("{n}", String(current.discovery.traversal.shadow_closed))}`
                : ""}
              {" · "}
              {t.interactionSameOriginFrames.replace("{n}", String(current.discovery.traversal.same_origin_frames))}
              {current.discovery.traversal.cross_origin_frames
                ? ` · ${t.interactionCrossOriginFrames.replace("{n}", String(current.discovery.traversal.cross_origin_frames))}`
                : ""}
            </p>
          ) : null}
          {current.discovery.transitions && current.discovery.transitions.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {current.discovery.transitions.map((row) => (
                <li key={row.action_id} className="text-xs text-ink-muted">
                  <p className="font-medium text-ink">
                    {row.action} {row.selector}
                    {row.frame_path.length ? ` · frame ${row.frame_path.join(" > ")}` : ""}
                    {row.shadow_path.length ? ` · shadow ${row.shadow_path.join(" > ")}` : ""}
                  </p>
                  {row.rendered.length > 0 ? (
                    row.rendered.map((rendered) => (
                      <p key={`${row.action_id}:${rendered.selector}`}>
                        {rendered.selector}
                        {rendered.frame_path.length ? ` · frame ${rendered.frame_path.join(" > ")}` : ""}
                        {rendered.shadow_path.length ? ` · shadow ${rendered.shadow_path.join(" > ")}` : ""}
                        {rendered.changes.length ? ` · ${rendered.changes.join(", ")}` : ""}
                      </p>
                    ))
                  ) : (
                    <p>{t.interactionChainNoRendered}</p>
                  )}
                  {row.network.map((event) => (
                    <p key={`${row.action_id}:${event.method}:${event.path}:${event.status ?? "failed"}`}>
                      {event.method} {event.path} · {event.status ?? "failed"}
                      {event.duration_ms != null ? ` · ${event.duration_ms} ms` : ""}
                    </p>
                  ))}
                  <p>
                    {row.runtime.some((event) => event.kind === "console_error")
                      ? `console.error: ${row.runtime.filter((event) => event.kind === "console_error").map((event) => event.message).join("; ")}`
                      : t.interactionChainConsoleNone}
                    {" · "}
                    {row.runtime.some((event) => event.kind === "pageerror")
                      ? `pageerror: ${row.runtime.filter((event) => event.kind === "pageerror").map((event) => event.message).join("; ")}`
                      : t.interactionChainPageerrorNone}
                    {" · "}
                    {row.runtime.some((event) => event.kind === "requestfailed")
                      ? `requestfailed: ${row.runtime.filter((event) => event.kind === "requestfailed").map((event) => event.message).join("; ")}`
                      : t.interactionChainRequestFailedNone}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
          {current.discovery.exploration ? (
            <p className="mt-1 text-xs text-ink-muted">
              {current.discovery.exploration.ran
                ? t.interactionStateExploration
                    .replace("{steps}", String(current.discovery.exploration.steps))
                    .replace("{revealed}", String(current.discovery.exploration.revealed))
                : t.interactionStateExplorationSkipped}
            </p>
          ) : null}
          {current.discovery.region_track ? (
            <p className="mt-1 text-xs text-ink-muted">
              {current.discovery.region_track.ran
                ? t.interactionVisualRegions
                    .replace("{cells}", String(current.discovery.region_track.active_cells))
                    .replace("{samples}", String(current.discovery.region_track.samples))
                : t.interactionVisualRegionsSkipped}
            </p>
          ) : null}
          {current.discovery.coverage ? (
            <div className="mt-3 space-y-1 text-xs text-ink-muted">
              <p>
                {current.discovery.coverage.region ? `${current.discovery.coverage.region} · ` : ""}
                {current.discovery.coverage.environment
                  ? t.interactionCoverageEnvironment
                      .replace("{device}", current.discovery.coverage.environment.device_class === "mobile" ? "Mobile" : "Desktop")
                      .replace("{width}", String(current.discovery.coverage.environment.viewport.width))
                      .replace("{height}", String(current.discovery.coverage.environment.viewport.height))
                      .replace("{pointer}", current.discovery.coverage.environment.pointer)
                  : ""}
              </p>
              {current.discovery.coverage.temporal_window_ms != null ? (
                <p>
                  {t.interactionCoverageTemporal
                    .replace("{ms}", String(current.discovery.coverage.temporal_window_ms))
                    .replace("{reason}", current.discovery.coverage.temporal_reason)}
                </p>
              ) : null}
              <p>
                {current.discovery.coverage.exploration === "exhausted"
                  ? t.interactionCoverageExhausted
                  : current.discovery.coverage.exploration === "incomplete"
                    ? t.interactionCoverageIncomplete
                        .replace("{reason}", current.discovery.exhaustion?.reason ?? "incomplete")
                        .replace("{n}", String(current.discovery.coverage.boundaries.unexplored_candidates))
                    : t.interactionCoverageSkipped}
              </p>
              <p>
                {t.interactionCoverageClosed.replace("{n}", String(current.discovery.coverage.boundaries.closed_shadow))}
                {" · "}
                {t.interactionCoverageCross.replace("{n}", String(current.discovery.coverage.boundaries.cross_origin_frames))}
                {" · "}
                {t.interactionCoverageBlocked.replace("{n}", String(current.discovery.coverage.boundaries.blocked_for_safety))}
                {" · "}
                {t.interactionCoverageUnexplored.replace("{n}", String(current.discovery.coverage.boundaries.unexplored_candidates))}
              </p>
              {current.discovery.temporal && current.discovery.temporal.behaviors.length > 0 ? (
                <ul className="space-y-1">
                  {current.discovery.temporal.behaviors.map((behavior) => (
                    <li key={`${behavior.selector}:${behavior.kind}:${behavior.first_seen_at}`}>
                      {behavior.selector} · {behavior.kind} · {behavior.sampling_reason} · {behavior.first_seen_at}–{behavior.last_changed_at} ms
                    </li>
                  ))}
                </ul>
              ) : null}
              {current.discovery.coverage.exploration === "skipped" ? null : (
                <p>
                  {current.discovery.coverage.statement === "measured_within_scope"
                    ? t.interactionCoverageStatementMeasured
                    : t.interactionCoverageStatementRecorded}
                </p>
              )}
            </div>
          ) : null}
          </details>
          {current.discovery.unknown.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-semibold text-ink">{t.interactionScanUnknownTitle}</p>
              <ul className="mt-1 space-y-1 text-xs text-ink">
                {current.discovery.unknown.map((row) => (
                  <li key={`${row.selector}:${row.frame_path.join(">")}:${row.shadow_path.join(">")}:${row.changes.join(",")}`}>
                    <span className="font-medium">{shortSelector(row.selector)}</span>
                    {row.changes.length ? (
                      <span className="text-ink-muted"> · {[...new Set(row.changes.map((change) => changeLabel(change, t)))].join(", ")}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {blockedGroups.size > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-semibold text-ink">{t.interactionNotClicked}</p>
              <ul className="mt-1 space-y-1 text-xs text-ink">
                {[...blockedGroups.entries()].map(([text, count]) => {
                  const parts = blockedParts(text);
                  return (
                    <li key={text}>
                      <span className="font-medium">{parts.name}</span>
                      {parts.path ? <span className="text-ink-muted"> · {parts.path}</span> : null}
                      {count > 1 ? <span className="text-ink-muted"> · × {count}</span> : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
      {mapDiffs.length > 0 ? <BehaviorMapDiffList diffs={mapDiffs} t={t} /> : null}
      {measurement ? (
        <ul className="mt-3 grid gap-1 text-sm text-ink sm:grid-cols-2">
          <li>✓ {t.interactionHealthVerified.replace("{n}", String(workingRows.length))}</li>
          <li>⚠ {t.interactionHealthAttention.replace("{n}", String(behaviorAlerts.length + mapDiffs.filter((row) => row.section !== "unchanged" && row.type == null).length))}</li>
          <li className="text-ink-muted">— {t.interactionHealthNotDetected.replace("{n}", String(notDetectedQuiet))}</li>
          <li className="text-ink-muted">○ {t.interactionHealthNotMeasured.replace("{n}", String(measurement.notMeasured))}</li>
        </ul>
      ) : null}
      {measurement && measurement.notMeasured > 0 ? (
        <p className="mt-2 text-xs text-ink-muted">{t.interactionNotMeasuredNote}</p>
      ) : null}
      {behaviorAlerts.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {t.interactionHealthNeedsAttention}
          </p>
          <ul className="mt-2 space-y-3">
            {behaviorAlerts.map((alert) => {
              const currentRow = typeRow(current, alert.type);
              const previousRow = typeRow(previousCheck, alert.type);
              return (
                <li key={alert.type} className="rounded-lg border border-amber-200 bg-surface px-3 py-3">
                  <p className="text-sm font-semibold text-ink">
                    ⚠ {typeLabel(alert.type, t)}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">{regionLabel}</p>
                  <p className="mt-2 text-xs text-ink">
                    <span className={statusClass(alert.previous)}>{statusText(alert.previous, t)}</span>
                    <span className="mx-1 text-ink-muted">→</span>
                    <span className={statusClass(alert.current)}>{statusText(alert.current, t)}</span>
                  </p>
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{t.interactionPrevious}</p>
                      <EvidenceCard
                        type={alert.type}
                        row={previousRow}
                        t={t}
                        empty={t.interactionPreviousEvidenceUnavailable}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{t.interactionCurrent}</p>
                      <EvidenceCard
                        type={alert.type}
                        row={currentRow}
                        t={t}
                        empty={t.interactionCurrentEvidenceUnavailable}
                      />
                    </div>
                  </div>
                  {compareHref ? (
                    <a href={compareHref} className="mt-3 inline-flex text-xs font-semibold text-ink underline">
                      {t.interactionCompareObservations}
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {workingRows.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {t.interactionHealthVerifiedTitle}
          </p>
          <ul className="mt-1 divide-y divide-border">
            {workingRows.map((row) => (
              <li key={row.type} className="py-2">
                <details>
                  <summary className="cursor-pointer text-sm text-ink">
                    <span className="font-medium text-emerald-800">✓ {typeLabel(row.type, t)}</span>
                    <span className="ml-2 text-xs text-ink-muted">{t.interactionViewEvidence}</span>
                  </summary>
                  <EvidenceCard type={row.type} row={row} t={t} empty={t.interactionEvidenceUnavailable} />
                </details>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      </details>
      <p className="mt-2 text-xs text-ink-muted">
        {t.interactionQuota.replace("{used}", String(usedCount)).replace("{limit}", String(limit))}
      </p>
      <p className="mt-1 text-xs text-ink-muted">{t.interactionOnlyExisting}</p>

      <fieldset className="mt-4">
        <legend className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          {t.interactionRegions}
        </legend>
        <ul className="mt-2 space-y-1.5">
          {options.map((row) => (
            <li key={row.observationId}>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={selected.includes(row.observationId)}
                  onChange={() => toggle(row.observationId)}
                  disabled={pending || !canRun}
                />
                <span>{row.regionLabel}</span>
                <span className={`text-xs ${statusClass(typeRow(checkById[row.observationId] ?? row.check, "scroll").status)}`}>
                  {statusText(typeRow(checkById[row.observationId] ?? row.check, "scroll").status, t)}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <p className="mt-3 text-xs text-ink-muted">
        {t.interactionCost.replace("{n}", String(runCount)).replace("runs", runCount === 1 ? "run" : "runs")}
      </p>
      {quotaShort ? <p className="mt-1 text-xs text-amber-800">{t.interactionQuotaNeed}</p> : null}

      <div className="mt-3">
        {canRun ? (
          <button
            type="button"
            disabled={pending || runCount === 0 || quotaShort}
            onClick={runChecks}
            className="inline-flex rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink hover:border-accent/40 disabled:opacity-60"
          >
            {pending ? t.interactionRunning : runLabel}
          </button>
        ) : (
          <p className="text-xs text-ink-muted">{t.interactionCaptureOff}</p>
        )}
      </div>
      {error ? (
        <p className="mt-2 text-xs font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <details className="mt-4">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-ink-muted">
          {t.interactionHealthAllTypes}
        </summary>
      {INTERACTION_CHECK_GROUPS.map((group) => (
        <div key={group.id} className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {groupLabel(group.id, t)}
          </p>
          <ul className="mt-1 divide-y divide-border">
            {group.types.map((type) => {
              const row = typeRow(current, type);
              const evidence = evidenceLine(row);
              return (
                <li key={type} className="py-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-ink">{typeLabel(type, t)}</p>
                    <p className={`text-xs ${statusClass(row.status)}`}>{statusText(row.status, t)}</p>
                  </div>
                  {evidence ? (
                    <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
                      <span className="font-medium">{t.interactionEvidence}:</span> {evidence}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      </details>

      {scroll && scrollStatus === "working" ? (
        <dl className="mt-4 grid gap-2 text-xs text-ink sm:grid-cols-2">
          <div className="flex justify-between gap-2">
            <dt className="text-ink-muted">{t.interactionDistance}</dt>
            <dd>{t.interactionDistanceValue.replace("{n}", String(distance))}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink-muted">{t.interactionCheckpoints}</dt>
            <dd>{scroll.checkpoints}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink-muted">{t.interactionChangedElements}</dt>
            <dd>{scroll.changed_elements}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink-muted">{t.interactionProperties}</dt>
            <dd>{scroll.changes.join(", ") || "—"}</dd>
          </div>
        </dl>
      ) : null}
      {scroll?.reason === "no_rendered_change" ? (
        <p className="mt-3 text-xs leading-relaxed text-ink-muted">{t.interactionNoChangeHint}</p>
      ) : null}
      {scroll?.reason === "no_scroll_section" ? (
        <p className="mt-3 text-xs leading-relaxed text-ink-muted">{t.interactionNoSectionHint}</p>
      ) : null}

      {options.length > 1 ? (
        <div className="mt-5 overflow-x-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {t.interactionRegionCompare}
          </p>
          <table className="mt-2 w-full min-w-md text-left text-xs">
            <thead>
              <tr className="border-b border-border text-ink-muted">
                <th className="py-2 pr-3 font-semibold">{t.interactionTitle}</th>
                {options.map((col) => (
                  <th key={col.observationId} className="py-2 pr-3 font-semibold">
                    {col.regionLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {INTERACTION_CHECK_GROUPS.map((group) => (
                <Fragment key={group.id}>
                  <tr>
                    <td
                      className="pt-3 pb-1 pr-3 text-xs font-semibold uppercase tracking-wider text-ink-muted"
                      colSpan={options.length + 1}
                    >
                      {groupLabel(group.id, t)}
                    </td>
                  </tr>
                  {group.types.map((type) => (
                    <tr key={type} className="border-b border-border/70">
                      <td className="py-2 pr-3 text-ink">{typeLabel(type, t)}</td>
                      {options.map((col) => {
                        const status = typeRow(checkById[col.observationId] ?? col.check, type).status;
                        return (
                          <td key={col.observationId} className={`py-2 pr-3 ${statusClass(status)}`}>
                            {statusText(status, t)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
