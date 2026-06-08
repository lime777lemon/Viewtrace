import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ViewtraceLogo } from "@/components/brand/ViewtraceLogo";
import { ObservationCaptureConditionsPanel } from "@/components/dashboard/ObservationCaptureConditionsPanel";
import { ObservationNotVisible } from "@/components/dashboard/ObservationNotVisible";
import { PrintReportButton } from "@/components/dashboard/PrintReportButton";
import { getSession } from "@/lib/auth/session";
import { getObservationMergedForPlan } from "@/lib/demo/user-observations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { reconcileObservationContentHashIfNeeded } from "@/lib/observation-content-hash-repair";
import { formatJaDateTime, formatUtcLabel } from "@/lib/format";
import { copy } from "@/lib/i18n";
import { localizeObservationNote } from "@/lib/i18n/observation-persisted-copy";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { sanitizeObservationRouteId } from "@/lib/observation-route-id";
import { contentHashVersionForObservation } from "@/lib/observation-content-hash";
import { resolveObservationCaptureTier } from "@/lib/observation-capture-tier";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: idRaw } = await params;
  const id = sanitizeObservationRouteId(idRaw);
  const locale = await getRequestLocale();
  const t = copy[locale].observationReport;
  if (!id) {
    return { title: t.title, robots: { index: false, follow: false } };
  }
  const session = await getSession();
  const obs = session ? await getObservationMergedForPlan(id, session.plan) : undefined;
  return {
    title: obs ? `${t.title} · ${obs.id}` : t.title,
    robots: { index: false, follow: false },
  };
}

export default async function ObservationReportPage({ params }: Props) {
  const { id: idRaw } = await params;
  const id = sanitizeObservationRouteId(idRaw);
  if (!id) notFound();
  const locale = await getRequestLocale();
  const t = copy[locale].observationReport;
  const td = copy[locale].observationDetail;

  const session = await getSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/dashboard/observations/${id}/report`)}`);
  }
  let obs = await getObservationMergedForPlan(id, session.plan);
  if (!obs) {
    return (
      <ObservationNotVisible
        signedInEmail={session.email}
        observationId={id}
        locale={locale}
      />
    );
  }

  const supabase = await createSupabaseServerClient();
  const reconciled = await reconcileObservationContentHashIfNeeded(supabase, obs);
  obs = reconciled.obs;
  const integrity = reconciled.integrity;
  const captureTier = resolveObservationCaptureTier(obs);
  const ct = copy[locale].observationCaptureTier;
  const captureTierBadge =
    captureTier === "failed"
      ? null
      : (
          {
            geo_saved: ct.badgeGeoSaved,
            preview_fallback: ct.badgePreviewFallback,
            form_image: ct.badgeFormImage,
            none: ct.badgeNoImage,
          } as const
        )[captureTier];
  const captureTierHint =
    captureTier === "failed"
      ? null
      : (
          {
            geo_saved: ct.hintGeoSaved,
            preview_fallback: ct.hintPreviewFallback,
            form_image: ct.hintFormImage,
            none: ct.hintNoImage,
          } as const
        )[captureTier];
  const contentHashVersion = contentHashVersionForObservation(obs);

  const captureConditionsCopy = {
    title: td.captureConditionsTitle,
    legacyMissing: td.captureConditionsLegacy,
    browser: td.captureBrowser,
    userAgent: td.captureUserAgent,
    country: td.captureCountry,
    state: td.captureState,
    viewport: td.captureViewport,
    captureScope: td.captureScope,
    captureScopeFullPage: td.captureScopeFullPage,
    captureScopeViewport: td.captureScopeViewport,
    proxyMode: td.captureProxyMode,
    proxyProvider: td.captureProxyProvider,
    engine: td.captureEngine,
    engineBrowserless: td.captureEngineBrowserless,
    engineMicrolink: td.captureEngineMicrolink,
    engineDirectFetch: td.captureEngineDirectFetch,
    engineFormUpload: td.captureEngineFormUpload,
    browserlessHost: td.captureBrowserlessHost,
    browserlessApi: td.captureBrowserlessApi,
    waitUntil: td.captureWaitUntil,
    imageSize: td.captureImageSize,
    proxyModeNone: td.captureProxyNone,
    proxyModeResidential: td.captureProxyResidential,
    proxyModeExternal: td.captureProxyExternal,
    proxyModeRetryWithout: td.captureProxyRetryWithout,
  };

  const integrityLabel =
    integrity === "ok"
      ? locale === "ja"
        ? "一致"
        : "OK"
      : integrity === "missing"
        ? locale === "ja"
          ? "未設定"
          : "N/A"
        : integrity === "mismatch"
          ? locale === "ja"
            ? "不一致"
            : "MISMATCH"
          : "—";

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `@media print { .no-print { display: none !important; } }`,
        }}
      />
      <div className="no-print mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link
            href={`/dashboard/observations/${obs.id}`}
            className="font-medium text-accent hover:text-accent-hover"
          >
            ← {t.back}
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <PrintReportButton label={t.print} />
          <p className="text-sm text-ink-muted">{t.printHint}</p>
        </div>
      </div>

      <article className="mx-auto max-w-3xl space-y-6 px-4 pb-12 sm:px-6 sm:pb-16">
        <header className="border-b border-border pb-6">
          <ViewtraceLogo className="h-7 w-auto sm:h-8" priority={false} />
          <h1 className="mt-3 font-display text-2xl font-semibold text-ink">{t.title}</h1>
          <p className="mt-2 font-mono text-sm text-ink">{obs.id}</p>
          <p className="mt-4 text-sm text-ink-muted">{t.disclaimer}</p>
        </header>

        <section>
          <h2 className="text-sm font-semibold text-ink">{t.sectionMeta}</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-ink-muted">{t.reportCaptured}</dt>
              <dd className="text-ink">
                {formatJaDateTime(obs.capturedAt)} · {formatUtcLabel(obs.capturedAt)}
              </dd>
            </div>
          </dl>
        </section>

        {captureTierBadge ? (
          <section>
            <h2 className="text-sm font-semibold text-ink">{ct.reportLabel}</h2>
            <p className="mt-2 text-sm font-medium text-ink">{captureTierBadge}</p>
            {captureTierHint ? (
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">{captureTierHint}</p>
            ) : null}
          </section>
        ) : null}

        <section>
          <h2 className="text-sm font-semibold text-ink">{t.sectionCaptureConditions}</h2>
          <div className="mt-3">
            <ObservationCaptureConditionsPanel
              conditions={obs.captureConditions}
              copy={captureConditionsCopy}
              locale={locale}
            />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-ink">{t.sectionUrl}</h2>
          <p className="mt-2 break-all font-mono text-sm text-ink">{obs.url}</p>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-ink">{t.sectionRegion}</h2>
          <p className="mt-2 text-sm text-ink">
            {obs.regionLabel}
            {obs.regionValue ? ` (${obs.regionValue})` : ""}
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-ink">{t.sectionStatus}</h2>
          <p className="mt-2 text-sm text-ink">{obs.status}</p>
        </section>

        {obs.pageTitle ? (
          <section>
            <h2 className="text-sm font-semibold text-ink">{t.reportTitle}</h2>
            <p className="mt-2 text-sm text-ink">{obs.pageTitle}</p>
          </section>
        ) : null}

        <section>
          <h2 className="text-sm font-semibold text-ink">{t.sectionNote}</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-ink">
            {obs.note ? localizeObservationNote(obs.note, locale) : "—"}
          </p>
        </section>

        {obs.snapshotImageUrl ? (
          <section>
            <h2 className="text-sm font-semibold text-ink">{t.reportSnapshotUrl}</h2>
            <p className="mt-2 break-all font-mono text-xs text-ink">{obs.snapshotImageUrl}</p>
          </section>
        ) : null}

        <section>
          <h2 className="text-sm font-semibold text-ink">{t.sectionHashes}</h2>
          <dl className="mt-3 space-y-3 font-mono text-xs text-ink">
            <div>
              <dt className="text-ink-muted">
                {t.hashContent} (v{contentHashVersion})
              </dt>
              <dd className="mt-1 break-all">{obs.contentHash ?? "—"}</dd>
              <dd className="mt-1 text-ink-muted">
                {t.reportIntegrity}: {integrityLabel}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">{t.hashSnapshot}</dt>
              <dd className="mt-1 break-all">{obs.snapshotSha256 ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">{t.hashPerceptual}</dt>
              <dd className="mt-1 break-all">{obs.snapshotPhash ?? "—"}</dd>
            </div>
            {typeof obs.snapshotBytes === "number" ? (
              <div>
                <dt className="text-ink-muted">{t.hashBytesType}</dt>
                <dd className="mt-1">
                  {obs.snapshotBytes} {obs.snapshotContentType ? `· ${obs.snapshotContentType}` : ""}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        {obs.events?.length ? (
          <section>
            <h2 className="text-sm font-semibold text-ink">{t.sectionEvents}</h2>
            <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm text-ink">
              {obs.events.map((ev, i) => (
                <li key={`${ev.at}-${i}`}>
                  <span className="font-medium">{ev.label}</span>
                  {ev.detail ? (
                    <span className="mt-1 block text-ink-muted">{ev.detail}</span>
                  ) : null}
                  <span className="mt-1 block text-xs text-ink-muted">
                    {formatUtcLabel(ev.at)}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </article>
    </>
  );
}
