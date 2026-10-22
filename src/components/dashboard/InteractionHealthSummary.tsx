import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";
import type { HealthAreaId, HealthMarker, HealthPresentation } from "@/lib/interaction-health-presentation";
import type { InteractionCheckType } from "@/lib/observation-regional-interaction";
import type { ScrollInteractionStatus } from "@/lib/observation-scroll-interaction";
import type { ReactNode } from "react";

type DetailCopy = (typeof copy)[Locale]["observationDetail"];

type Props = {
  presentation: HealthPresentation;
  t: DetailCopy;
  typeLabel: (type: InteractionCheckType) => string;
  renderProblem?: (type: InteractionCheckType) => ReactNode;
};

function signalSentence(signal: HealthPresentation["signal"], t: DetailCopy): string {
  if (signal === "problem") return t.interactionPresentProblemHeadline;
  if (signal === "check") return t.interactionPresentCheckHeadline;
  return t.interactionPresentGoodHeadline;
}

function signalDot(signal: HealthPresentation["signal"]): string {
  if (signal === "problem") return "bg-red-600";
  if (signal === "check") return "bg-amber-500";
  return "bg-emerald-600";
}

function areaName(id: HealthAreaId, t: DetailCopy): string {
  if (id === "Header") return t.interactionAreaHeader;
  if (id === "Navigation") return t.interactionAreaNavigation;
  if (id === "Main") return t.interactionAreaMain;
  if (id === "Form") return t.interactionAreaForm;
  if (id === "Sidebar") return t.interactionAreaSidebar;
  if (id === "Footer") return t.interactionAreaFooter;
  if (id === "Motion") return t.interactionAreaMotion;
  return t.interactionAreaPage;
}

function areaSentence(tone: "new" | "missing" | "mixed", t: DetailCopy): string {
  if (tone === "new") return t.interactionPresentAreaNew;
  if (tone === "missing") return t.interactionPresentAreaMissing;
  return t.interactionPresentAreaMixed;
}

function countLine(n: number, many: string, one: string): string {
  return n === 1 ? one : many.replace("{n}", String(n));
}

function friendlyEvidence(label: string, t: DetailCopy): string {
  if (label.startsWith("Unknown style")) return t.interactionPresentVisual;
  if (label.startsWith("Unknown DOM")) return t.interactionPresentStructure;
  if (label.startsWith("Unknown visual")) return t.interactionPresentMotion;
  if (label.startsWith("Unknown media")) return t.interactionPresentMedia;
  return label;
}

function currentSentence(status: ScrollInteractionStatus, t: DetailCopy): string {
  if (status === "not_detected") return t.interactionPresentNotDetectedNow;
  if (status === "failed") return t.interactionPresentFailedNow;
  return t.interactionPresentNoResponse;
}

function PageSketch({
  markers,
  areas,
  t,
}: {
  markers: HealthMarker[];
  areas: HealthPresentation["areas"];
  t: DetailCopy;
}) {
  if (markers.length < 2) return null;
  const maxX = Math.max(...markers.map((marker) => marker.x + marker.w), 1);
  const maxY = Math.max(...markers.map((marker) => marker.y + marker.h), 1);
  return (
    <div className="mt-4">
      <div className="relative h-36 overflow-hidden rounded-xl border border-border bg-surface">
        <div className="absolute inset-x-0 top-0 h-8 border-b border-border/80 bg-surface-elevated" />
        {markers.map((marker) => (
          <a
            key={marker.n}
            href={`#interaction-health-${marker.anchor}`}
            className={`absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[11px] font-semibold text-white ${marker.kind === "problem" ? "bg-red-600" : "bg-amber-600"}`}
            style={{
              left: `${((marker.x + marker.w / 2) / maxX) * 100}%`,
              top: `${((marker.y + marker.h / 2) / maxY) * 100}%`,
            }}
          >
            {marker.n}
          </a>
        ))}
      </div>
      <ul className="mt-2 space-y-1 text-xs text-ink-muted">
        {markers.map((marker) => {
          const area = areas.find((row) => `area-${row.id}` === marker.anchor);
          return (
            <li key={marker.n}>
              {marker.n} {area ? areaName(area.id, t) : marker.anchor}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function InteractionHealthSummary({ presentation, t, typeLabel, renderProblem }: Props) {
  const { signal, problems, areas, working, skipped, markers } = presentation;
  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-start gap-2">
        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${signalDot(signal)}`} aria-hidden />
        <p className="text-sm font-semibold text-ink">{signalSentence(signal, t)}</p>
      </div>
      <ul className="grid gap-2 text-sm text-ink sm:grid-cols-2">
        {problems.length > 0 ? (
          <li>{countLine(problems.length, t.interactionPresentProblemCount, t.interactionPresentProblemCountOne)}</li>
        ) : null}
        {areas.length > 0 ? (
          <li>{countLine(areas.length, t.interactionPresentAreaCount, t.interactionPresentAreaCountOne)}</li>
        ) : null}
        {working.length > 0 ? (
          <li>{countLine(working.length, t.interactionPresentWorkingCount, t.interactionPresentWorkingCountOne)}</li>
        ) : null}
        {skipped.length > 0 ? (
          <li>{countLine(skipped.length, t.interactionPresentSkippedCount, t.interactionPresentSkippedCountOne)}</li>
        ) : null}
      </ul>
      <PageSketch markers={markers} areas={areas} t={t} />

      {problems.length > 0 ? (
        <section aria-label={t.interactionPresentPossibleProblem}>
          <p className="text-xs font-semibold uppercase tracking-wider text-red-800 dark:text-red-200">
            {t.interactionPresentPossibleProblem}
          </p>
          <ul className="mt-2 space-y-2">
            {problems.map((problem) => (
              <li key={problem.type} className="rounded-lg border border-red-200 bg-surface px-3 py-3 dark:border-red-900/60">
                <p className="text-sm font-semibold text-ink">{typeLabel(problem.type)}</p>
                <p className="mt-1 text-xs text-ink">
                  {t.interactionPresentWorkedBefore}
                  <span className="mx-1 text-ink-muted">→</span>
                  {currentSentence(problem.current, t)}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                  {problem.kind === "alert_candidate" ? t.interactionPresentMissingBody : t.interactionPresentRegressionBody}
                </p>
                {renderProblem ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-semibold text-ink">{t.interactionPresentReview}</summary>
                    {renderProblem(problem.type)}
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {areas.length > 0 ? (
        <section aria-label={t.interactionPresentChangedAreas}>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-200">
            {t.interactionPresentChangedAreas}
          </p>
          <p className="mt-1 text-xs text-ink-muted">{t.interactionPresentNotAFailure}</p>
          <ul className="mt-2 space-y-2">
            {areas.map((area) => (
              <li id={`interaction-health-area-${area.id}`} key={area.id} className="rounded-lg border border-amber-200 bg-surface px-3 py-3 dark:border-amber-900/60">
                <p className="text-sm font-semibold text-ink">{areaName(area.id, t)}</p>
                <p className="mt-1 text-xs text-ink">{areaSentence(area.tone, t)}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {countLine(area.count, t.interactionPresentRelated, t.interactionPresentRelatedOne)}
                </p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-semibold text-ink">{t.interactionPresentSeeChanges}</summary>
                  <ul className="mt-2 space-y-2">
                    {area.evidence.map((row) => (
                      <li key={`${area.id}:${row.section}:${row.selector}:${row.detail}`} className="text-xs text-ink">
                        <p>{friendlyEvidence(row.label, t)}</p>
                        <p className="mt-0.5 break-all text-ink-muted">{row.selector}</p>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {working.length > 0 ? (
        <section aria-label={t.interactionPresentWorkingTitle}>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-200">
            {t.interactionPresentWorkingTitle}
          </p>
          <p className="mt-1 text-sm text-ink">{working.map((type) => typeLabel(type)).join(" · ")}</p>
        </section>
      ) : null}

      {skipped.length > 0 ? (
        <section aria-label={t.interactionPresentNotTested}>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t.interactionPresentNotTested}</p>
          <ul className="mt-2 space-y-1 text-sm text-ink">
            {skipped.map((row) => (
              <li key={row.label}>
                <span className="font-medium">{row.label}</span>
                {row.path ? <span className="text-ink-muted"> · {row.path}</span> : null}
                {row.count > 1 ? <span className="text-ink-muted"> · × {row.count}</span> : null}
                <p className="text-xs text-ink-muted">{t.interactionPresentNotTestedWhy}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
