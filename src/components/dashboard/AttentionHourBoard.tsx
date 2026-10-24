import Link from "next/link";
import type { AttentionAvailability, AttentionFailureReason, AttentionGeo, AttentionHour, AttentionSlow } from "@/lib/attention-hour";
import { formatAttentionHourRange } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import { WORLD_COUNTRIES, WORLD_MAP_VIEW } from "@/lib/world-map-paths";

export type AttentionHourCopy = {
  title: string;
  intro: string;
  emptyHour: string;
  records: string;
  failures: string;
  slowest: string;
  unmeasured: string;
  medianTtfb: string;
  regions: string;
  regionRecords: string;
  regionFailures: string;
  failedTitle: string;
  slowTitle: string;
  noRecords: string;
  noFailures: string;
  noLatency: string;
  ttfb: string;
  load: string;
  dns: string;
  tls: string;
  requestsPerSecond: string;
  requestsPerSecondNote: string;
  availability: string;
  past7: string;
  past30: string;
  availabilityNote: string;
  cpu: string;
  forecast: string;
  forecastNote: string;
  geoTitle: string;
  geoNote: string;
  geoEmpty: string;
  reasons: Record<AttentionFailureReason, string>;
};

function hostPath(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return url;
  }
}

function formatRate(value: number): string {
  if (value >= 1000) {
    const scaled = value / 1000;
    return `${scaled >= 10 ? Math.round(scaled) : scaled.toFixed(1)}K`;
  }
  if (value >= 100) return String(Math.round(value));
  return value.toFixed(1);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function availabilityClass(row: AttentionAvailability): string {
  if (row.percent == null) return "text-ink-muted";
  return row.percent < 100 ? "text-red-800" : "text-emerald-950";
}

function RateChart({ rates, forecast }: { rates: number[]; forecast: number | null }) {
  if (rates.length < 2 || forecast == null) return null;
  const values = [...rates, forecast];
  const max = Math.max(...values, 0.001);
  const width = 280;
  const height = 72;
  const step = width / (values.length - 1);
  const y = (value: number) => height - (value / max) * (height - 8) - 4;
  const measured = rates.map((value, index) => `${index * step},${y(value)}`).join(" ");
  const last = rates.length - 1;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-16 w-full" role="img">
      <polyline fill="none" stroke="currentColor" strokeWidth="2" className="text-ink" points={measured} />
      <line
        x1={last * step}
        y1={y(rates[last] ?? 0)}
        x2={width}
        y2={y(forecast)}
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="4 3"
        className="text-orange-700"
      />
    </svg>
  );
}

function latencyLabel(row: AttentionSlow, copy: AttentionHourCopy): string {
  const name = row.kind === "ttfb" ? copy.ttfb : copy.load;
  const extra = [
    row.dnsMs != null ? `${copy.dns} ${row.dnsMs} ms` : "",
    row.tlsMs != null ? `${copy.tls} ${row.tlsMs} ms` : "",
  ].filter(Boolean);
  return extra.length ? `${name} · ${extra.join(" · ")}` : name;
}

function geoFill(count: number, max: number): string {
  if (count <= 0 || max <= 0) return "#e7e4dc";
  if (count >= max && max > 1) return "#1e3a8a";
  if (max === 1 || count / max > 0.5) return "#1d4ed8";
  return "#93c5fd";
}

function AttentionGeoMap({
  geo,
  copy,
  locale,
}: {
  geo: AttentionGeo[];
  copy: AttentionHourCopy;
  locale: Locale;
}) {
  const byCountry = new Map(geo.map((row) => [row.country, row]));
  const max = geo.reduce((highest, row) => Math.max(highest, row.observations), 0);
  const summary = geo
    .map((row) => {
      const country = WORLD_COUNTRIES.find((item) => item.code === row.country);
      const name = country ? (locale === "ja" ? country.nameJa : country.nameEn) : row.country;
      return `${name} ${row.observations}`;
    })
    .join(", ");
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-lg font-semibold">{copy.geoTitle}</h2>
        <p className="mt-1 text-sm text-ink-muted">{copy.geoNote}</p>
      </div>
      <div className="rounded-2xl border border-border bg-surface-elevated p-4">
        <svg
          viewBox={`0 0 ${WORLD_MAP_VIEW.width} ${WORLD_MAP_VIEW.height}`}
          className="h-auto w-full"
          role="img"
          aria-label={summary || copy.geoEmpty}
        >
          <rect width={WORLD_MAP_VIEW.width} height={WORLD_MAP_VIEW.height} fill="#eef3f8" />
          {WORLD_COUNTRIES.map((country) => {
            const row = byCountry.get(country.code);
            const count = row?.observations ?? 0;
            const name = locale === "ja" ? country.nameJa : country.nameEn;
            const title = count > 0 ? `${name} · ${copy.regionRecords} ${count}` : name;
            return (
              <path key={country.code} d={country.d} fill={geoFill(count, max)} stroke="#f6f4ef" strokeWidth="0.6">
                <title>{title}</title>
              </path>
            );
          })}
        </svg>
        {geo.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">{copy.geoEmpty}</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {geo.map((row) => {
              const country = WORLD_COUNTRIES.find((item) => item.code === row.country);
              const name = country ? (locale === "ja" ? country.nameJa : country.nameEn) : row.country;
              return (
                <li key={row.country} className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: geoFill(row.observations, max) }} />
                  <span className="font-medium">{name}</span>
                  <span className="tabular-nums text-ink-muted">{row.observations}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

export function AttentionHourBoard({
  board,
  copy,
  locale,
  windowLabel,
  capturedLabel,
}: {
  board: AttentionHour;
  copy: AttentionHourCopy;
  locale: Locale;
  windowLabel: string;
  capturedLabel: (iso: string) => string;
}) {
  const hasRecords = board.observationCount > 0 || board.failureCount > 0;
  const emptyHour = board.observationCount === 0 && board.failureCount === 0;
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{copy.title}</h1>
        {emptyHour ? null : <p className="mt-1 text-sm text-ink-muted">{windowLabel}</p>}
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-muted">{copy.intro}</p>
        {emptyHour ? (
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-muted">
            {copy.emptyHour.replace("{range}", formatAttentionHourRange(board.windowStart, board.windowEnd, locale))}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface-elevated p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.records}</p>
          <p className="mt-3 font-display text-4xl font-semibold tabular-nums">{board.observationCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-elevated p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.failures}</p>
          <p
            className={`mt-3 font-display text-4xl font-semibold tabular-nums ${
              board.observationCount === 0 && board.failureCount === 0
                ? "text-ink-muted"
                : board.failureCount > 0
                  ? "text-red-800"
                  : "text-ink"
            }`}
          >
            {board.observationCount === 0 && board.failureCount === 0 ? copy.unmeasured : board.failureCount}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-elevated p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.slowest}</p>
          {board.slowest ? (
            <>
              <p className="mt-3 font-display text-4xl font-semibold tabular-nums text-orange-700">
                {board.slowest.ms.toLocaleString()}
                <span className="ml-1 text-lg">ms</span>
              </p>
              <p className="mt-2 text-xs text-ink-muted">
                {board.slowest.kind === "ttfb" ? copy.ttfb : copy.load}
                {board.medianTtfbMs != null ? ` · ${copy.medianTtfb} ${board.medianTtfbMs.toLocaleString()} ms` : ""}
              </p>
            </>
          ) : (
            <p className="mt-3 font-display text-2xl font-semibold text-ink-muted">{copy.unmeasured}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface-elevated p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.requestsPerSecond}</p>
          <p className="mt-3 font-display text-4xl font-semibold tabular-nums">
            {board.requestsPerSecond == null ? copy.unmeasured : formatRate(board.requestsPerSecond)}
          </p>
          <p className="mt-2 text-xs text-ink-muted">{copy.requestsPerSecondNote}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-elevated p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.availability}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[
              { label: copy.past7, row: board.availability7 },
              { label: copy.past30, row: board.availability30 },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs text-ink-muted">{item.label}</p>
                <p className={`mt-1 font-display text-base font-semibold tabular-nums ${availabilityClass(item.row)}`}>
                  {item.row.percent == null ? copy.unmeasured : formatPercent(item.row.percent)}
                </p>
                {item.row.measured > 0 ? (
                  <p className="mt-1 text-xs text-ink-muted">
                    {item.row.up}/{item.row.measured}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-muted">{copy.availabilityNote}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-elevated p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.cpu}</p>
          <p className="mt-3 font-display text-2xl font-semibold text-ink-muted">{copy.unmeasured}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-elevated p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.forecast}</p>
          <p className="mt-3 font-display text-4xl font-semibold tabular-nums text-orange-700">
            {board.forecastRequestsPerSecond == null ? (
              <span className="text-2xl text-ink-muted">{copy.unmeasured}</span>
            ) : (
              formatRate(board.forecastRequestsPerSecond)
            )}
          </p>
          <p className="mt-2 text-xs text-ink-muted">{copy.forecastNote}</p>
          <RateChart rates={board.requestRates} forecast={board.forecastRequestsPerSecond} />
        </div>
      </div>

      <AttentionGeoMap geo={board.geo} copy={copy} locale={locale} />

      {board.regions.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">{copy.regions}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {board.regions.map((region) => (
              <li key={region.regionLabel} className="rounded-2xl border border-border bg-surface-elevated p-4">
                <p className="font-semibold">{region.regionLabel}</p>
                <p className="mt-1 text-sm text-ink-muted">
                  {copy.regionRecords} {region.observations}
                  {" · "}
                  {copy.regionFailures} {region.failures}
                  {region.slowestMs != null
                    ? ` · ${region.slowestKind === "load" ? copy.load : copy.ttfb} ${region.slowestMs.toLocaleString()} ms`
                    : ` · ${copy.unmeasured}`}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">{copy.failedTitle}</h2>
          {board.failures.length === 0 ? (
            <p className="rounded-2xl border border-border bg-surface-elevated p-4 text-sm text-ink-muted">
              {hasRecords ? copy.noFailures : copy.noRecords}
            </p>
          ) : (
            <ul className="space-y-3">
              {board.failures.map((row) => (
                <li key={row.id} className="rounded-2xl border border-border bg-surface-elevated p-4">
                  <Link href={row.href} className="font-semibold text-red-800 hover:underline">
                    {copy.reasons[row.reason]}
                    {row.detail ? ` · ${row.detail}` : ""}
                  </Link>
                  <p className="mt-1 wrap-break-word text-sm text-ink">{hostPath(row.url)}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {row.regionLabel} · {capturedLabel(row.at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">{copy.slowTitle}</h2>
          {board.slow.length === 0 ? (
            <p className="rounded-2xl border border-border bg-surface-elevated p-4 text-sm text-ink-muted">
              {hasRecords ? copy.noLatency : copy.noRecords}
            </p>
          ) : (
            <ul className="space-y-3">
              {board.slow.map((row) => (
                <li key={row.id} className="rounded-2xl border border-border bg-surface-elevated p-4">
                  <Link href={row.href} className="font-display text-2xl font-semibold tabular-nums text-orange-700 hover:underline">
                    {row.ms.toLocaleString()} ms
                  </Link>
                  <p className="mt-1 text-xs text-ink-muted">{latencyLabel(row, copy)}</p>
                  <p className="mt-1 wrap-break-word text-sm text-ink">{hostPath(row.url)}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {row.regionLabel} · {capturedLabel(row.at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
