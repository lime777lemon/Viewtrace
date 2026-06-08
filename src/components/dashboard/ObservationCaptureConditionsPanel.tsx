import type { CaptureConditionsV1 } from "@/lib/capture-conditions";
import { formatViewportLabel } from "@/lib/capture-conditions";
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
  proxyModeRetryWithout: string;
};

type Props = {
  conditions: CaptureConditionsV1 | null | undefined;
  copy: ObservationCaptureConditionsCopy;
  locale: Locale;
};

function engineLabel(
  name: CaptureConditionsV1["engine"]["name"],
  copy: ObservationCaptureConditionsCopy,
): string {
  const map = {
    browserless: copy.engineBrowserless,
    microlink: copy.engineMicrolink,
    direct_fetch: copy.engineDirectFetch,
    form_upload: copy.engineFormUpload,
  } as const;
  return map[name];
}

function proxyModeLabel(mode: CaptureConditionsV1["geo"]["proxy_mode"], copy: ObservationCaptureConditionsCopy) {
  const map = {
    none: copy.proxyModeNone,
    browserless_residential: copy.proxyModeResidential,
    external_proxy: copy.proxyModeExternal,
    retry_without_proxy: copy.proxyModeRetryWithout,
  } as const;
  return map[mode];
}

export function ObservationCaptureConditionsPanel({ conditions, copy, locale }: Props) {
  if (!conditions) {
    return (
      <div className="rounded-xl border border-border bg-surface-elevated p-4 sm:col-span-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.title}</h2>
        <p className="mt-2 text-sm text-ink-muted">{copy.legacyMissing}</p>
      </div>
    );
  }

  const scopeLabel = conditions.full_page_requested
    ? copy.captureScopeFullPage
    : copy.captureScopeViewport;

  const imageSize =
    conditions.result.image_width_px != null && conditions.result.image_height_px != null
      ? `${conditions.result.image_width_px}×${conditions.result.image_height_px}`
      : "—";

  const countryState = [conditions.geo.country, conditions.geo.state].filter(Boolean).join(" / ") || "—";

  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-4 sm:col-span-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.title}</h2>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-ink-muted">{copy.browser}</dt>
          <dd className="mt-0.5 text-sm text-ink">
            {conditions.browser.family} · {conditions.browser.channel}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{copy.captureScope}</dt>
          <dd className="mt-0.5 text-sm text-ink">{scopeLabel}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-ink-muted">{copy.userAgent}</dt>
          <dd className="mt-0.5 break-all font-mono text-xs text-ink">{conditions.browser.user_agent}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{copy.country}</dt>
          <dd className="mt-0.5 text-sm text-ink">{countryState}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{copy.viewport}</dt>
          <dd className="mt-0.5 text-sm text-ink">{formatViewportLabel(conditions)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{copy.proxyMode}</dt>
          <dd className="mt-0.5 text-sm text-ink">{proxyModeLabel(conditions.geo.proxy_mode, copy)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{copy.proxyProvider}</dt>
          <dd className="mt-0.5 text-sm text-ink">{conditions.geo.proxy_provider ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{copy.engine}</dt>
          <dd className="mt-0.5 text-sm text-ink">{engineLabel(conditions.engine.name, copy)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{copy.imageSize}</dt>
          <dd className="mt-0.5 text-sm text-ink">{imageSize}</dd>
        </div>
        {conditions.engine.browserless ? (
          <>
            <div>
              <dt className="text-xs text-ink-muted">{copy.browserlessHost}</dt>
              <dd className="mt-0.5 font-mono text-xs text-ink">
                {conditions.engine.browserless.endpoint_host}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">{copy.browserlessApi}</dt>
              <dd className="mt-0.5 font-mono text-xs text-ink">
                {conditions.engine.browserless.api_surface} · {conditions.engine.browserless.wait_until}
              </dd>
            </div>
          </>
        ) : null}
      </dl>
      {locale === "ja" && conditions.viewport.source === "browserless_implicit_default" ? (
        <p className="mt-3 text-xs text-ink-muted">
          ビューポートは Browserless の既定値です（明示指定なし・既存キャプチャとの差分を抑えるため）。
        </p>
      ) : null}
      {locale === "en" && conditions.viewport.source === "browserless_implicit_default" ? (
        <p className="mt-3 text-xs text-ink-muted">
          Viewport uses Browserless defaults (not overridden—to stay consistent with earlier captures).
        </p>
      ) : null}
    </div>
  );
}
