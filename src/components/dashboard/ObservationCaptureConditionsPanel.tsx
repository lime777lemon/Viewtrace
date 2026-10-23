import type { CaptureConditionsV1 } from "@/lib/capture-conditions";
import { presentCaptureConditions } from "@/lib/capture-conditions-presentation";
import type { Locale } from "@/lib/i18n";

export type ObservationCaptureConditionsCopy = {
  title: string;
  legacyMissing: string;
  browser: string;
  userAgent: string;
  country: string;
  state: string;
  viewport: string;
  captureScope: string;
  captureScopeFullPage: string;
  captureScopeViewport: string;
  proxyMode: string;
  proxyProvider: string;
  engine: string;
  engineBrowserless: string;
  enginePlaywrightWorker: string;
  engineMicrolink: string;
  engineDirectFetch: string;
  engineFormUpload: string;
  browserlessHost: string;
  browserlessApi: string;
  waitUntil: string;
  imageSize: string;
  proxyModeNone: string;
  proxyModeResidential: string;
  proxyModeExternal: string;
  proxyModeExternalResidential: string;
  proxyModeRetryWithout: string;
  costTitle: string;
  costDuration: string;
  costUnits: string;
  costProxyBytes: string;
  costFallback: string;
  costFallbackYes: string;
  costFallbackNo: string;
  costScreenshotBytes: string;
  costAttempts: string;
  costProxyUnmeasured: string;
};

export function observationCaptureConditionsCopyFrom(t: {
  captureConditionsTitle: string;
  captureConditionsLegacy: string;
  captureBrowser: string;
  captureUserAgent: string;
  captureCountry: string;
  captureState: string;
  captureViewport: string;
  captureScope: string;
  captureScopeFullPage: string;
  captureScopeViewport: string;
  captureProxyMode: string;
  captureProxyProvider: string;
  captureEngine: string;
  captureEngineBrowserless: string;
  captureEnginePlaywrightWorker: string;
  captureEngineMicrolink: string;
  captureEngineDirectFetch: string;
  captureEngineFormUpload: string;
  captureBrowserlessHost: string;
  captureBrowserlessApi: string;
  captureWaitUntil: string;
  captureImageSize: string;
  captureProxyNone: string;
  captureProxyResidential: string;
  captureProxyExternal: string;
  captureProxyExternalResidential: string;
  captureProxyRetryWithout: string;
  captureCostTitle: string;
  captureCostDuration: string;
  captureCostUnits: string;
  captureCostProxyBytes: string;
  captureCostFallback: string;
  captureCostFallbackYes: string;
  captureCostFallbackNo: string;
  captureCostScreenshotBytes: string;
  captureCostAttempts: string;
  captureCostProxyUnmeasured: string;
}): ObservationCaptureConditionsCopy {
  return {
    title: t.captureConditionsTitle,
    legacyMissing: t.captureConditionsLegacy,
    browser: t.captureBrowser,
    userAgent: t.captureUserAgent,
    country: t.captureCountry,
    state: t.captureState,
    viewport: t.captureViewport,
    captureScope: t.captureScope,
    captureScopeFullPage: t.captureScopeFullPage,
    captureScopeViewport: t.captureScopeViewport,
    proxyMode: t.captureProxyMode,
    proxyProvider: t.captureProxyProvider,
    engine: t.captureEngine,
    engineBrowserless: t.captureEngineBrowserless,
    enginePlaywrightWorker: t.captureEnginePlaywrightWorker,
    engineMicrolink: t.captureEngineMicrolink,
    engineDirectFetch: t.captureEngineDirectFetch,
    engineFormUpload: t.captureEngineFormUpload,
    browserlessHost: t.captureBrowserlessHost,
    browserlessApi: t.captureBrowserlessApi,
    waitUntil: t.captureWaitUntil,
    imageSize: t.captureImageSize,
    proxyModeNone: t.captureProxyNone,
    proxyModeResidential: t.captureProxyResidential,
    proxyModeExternal: t.captureProxyExternal,
    proxyModeExternalResidential: t.captureProxyExternalResidential,
    proxyModeRetryWithout: t.captureProxyRetryWithout,
    costTitle: t.captureCostTitle,
    costDuration: t.captureCostDuration,
    costUnits: t.captureCostUnits,
    costProxyBytes: t.captureCostProxyBytes,
    costFallback: t.captureCostFallback,
    costFallbackYes: t.captureCostFallbackYes,
    costFallbackNo: t.captureCostFallbackNo,
    costScreenshotBytes: t.captureCostScreenshotBytes,
    costAttempts: t.captureCostAttempts,
    costProxyUnmeasured: t.captureCostProxyUnmeasured,
  };
}

type Props = {
  conditions: CaptureConditionsV1 | null | undefined;
  copy: ObservationCaptureConditionsCopy;
  locale: Locale;
  /** Host, units, proxy bytes, attempts, and stored image size. Admins only. */
  internal?: boolean;
};

function formatByteSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(3)} MB`;
  if (bytes >= 1000) return `${(bytes / 1000).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatProxyBytes(
  bytes: number | null | undefined,
  copy: ObservationCaptureConditionsCopy,
): string {
  if (bytes == null) return copy.costProxyUnmeasured;
  return formatByteSize(bytes);
}

export function ObservationCaptureConditionsPanel({ conditions, copy, locale, internal = false }: Props) {
  if (!conditions) {
    return (
      <div className="rounded-xl border border-border bg-surface-elevated p-4 sm:col-span-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.title}</h2>
        <p className="mt-2 text-sm text-ink-muted">{copy.legacyMissing}</p>
      </div>
    );
  }

  const view = presentCaptureConditions(conditions, locale);
  const cost = conditions.cost_signals;
  const rows = [
    [view.copy.region, view.customer.region],
    [view.copy.environment, view.customer.environment],
    [view.copy.viewport, view.customer.viewport],
    [view.copy.capture, view.customer.capture],
    [view.copy.measured, view.customer.measured],
    [view.copy.regionalVerification, view.customer.regionalVerificationLabel],
  ] as const;

  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-4 sm:col-span-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.title}</h2>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-ink-muted">{label}</dt>
            <dd className="mt-0.5 text-sm text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {view.customer.regionalNote ? (
        <p className="mt-3 text-sm text-ink-muted">{view.customer.regionalNote}</p>
      ) : null}
      <details className="mt-4">
        <summary className="cursor-pointer text-xs font-semibold text-ink-muted">{view.copy.technical}</summary>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-ink-muted">{view.copy.browser}</dt>
            <dd className="mt-0.5 text-sm text-ink">{view.technical.browser}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">{view.copy.engine}</dt>
            <dd className="mt-0.5 text-sm text-ink">{view.technical.engine}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-ink-muted">{view.copy.userAgent}</dt>
            <dd className="mt-0.5 break-all font-mono text-xs text-ink">{view.technical.userAgent}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">{view.copy.viewport}</dt>
            <dd className="mt-0.5 text-sm text-ink">{view.technical.viewport}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">{view.copy.capture}</dt>
            <dd className="mt-0.5 text-sm text-ink">{view.technical.capture}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">{view.copy.wait}</dt>
            <dd className="mt-0.5 text-sm text-ink">{view.technical.wait}</dd>
          </div>
          {view.technical.api ? (
            <div>
              <dt className="text-xs text-ink-muted">{copy.browserlessApi}</dt>
              <dd className="mt-0.5 text-sm text-ink">{view.technical.api}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs text-ink-muted">{copy.costDuration}</dt>
            <dd className="mt-0.5 text-sm text-ink">
              {view.technical.durationMs != null ? `${view.technical.durationMs} ms` : "—"}
            </dd>
          </div>
        </dl>
      </details>
      {internal && cost ? (
        <div className="mt-4 border-t border-border pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{view.copy.internalTitle}</h3>
          <p className="mt-1 text-xs text-ink-muted">{view.copy.internalHint}</p>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-ink-muted">{copy.costAttempts}</dt>
              <dd className="mt-0.5 text-sm text-ink">{cost.attempts ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">{copy.costDuration}</dt>
              <dd className="mt-0.5 text-sm text-ink">{cost.duration_ms != null ? `${cost.duration_ms} ms` : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">{copy.costUnits}</dt>
              <dd className="mt-0.5 text-sm text-ink">{cost.estimated_time_units ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">{copy.costScreenshotBytes}</dt>
              <dd className="mt-0.5 text-sm text-ink">
                {formatByteSize(cost.screenshot_bytes ?? conditions.result.snapshot_bytes)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">{copy.costProxyBytes}</dt>
              <dd className="mt-0.5 text-sm text-ink">{formatProxyBytes(cost.proxy_bytes, copy)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">{copy.costFallback}</dt>
              <dd className="mt-0.5 text-sm text-ink">{cost.fallback ? copy.costFallbackYes : copy.costFallbackNo}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">{copy.browserlessHost}</dt>
              <dd className="mt-0.5 break-all font-mono text-xs text-ink">
                {conditions.engine?.browserless?.endpoint_host ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">{copy.proxyProvider}</dt>
              <dd className="mt-0.5 text-sm text-ink">{conditions.geo?.proxy_provider ?? "—"}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </div>
  );
}
