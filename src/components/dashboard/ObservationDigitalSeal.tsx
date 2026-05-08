import type { Observation } from "@/lib/demo/observations";
import { formatJaDateTime, formatUtcLabel } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";
import { OBSERVATION_CONTENT_HASH_VERSION } from "@/lib/observation-content-hash";

type Props = {
  obs: Observation;
  locale: Locale;
};

export function ObservationDigitalSeal({ obs, locale }: Props) {
  const t = copy[locale].observationSeal;
  const short = (hex: string | undefined, n: number) =>
    hex && hex.length > n * 2 ? `${hex.slice(0, n)}…${hex.slice(-n)}` : hex ?? "—";

  return (
    <div className="relative overflow-hidden rounded-2xl border-4 border-double border-[var(--color-accent)]/50 bg-gradient-to-br from-[var(--color-surface-elevated)] to-[var(--color-surface)] px-6 py-6 shadow-sm sm:col-span-2">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[var(--color-accent)]/10" />
      <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
        {t.brand}
      </p>
      <p className="mt-1 text-center font-display text-lg font-semibold text-[var(--color-ink)]">{t.title}</p>
      <p className="mt-3 text-center text-xs text-[var(--color-ink-muted)]">
        {t.recordId}{" "}
        <span className="font-mono text-[var(--color-ink)]">{obs.id}</span>
      </p>
      <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-4 py-3 text-center text-sm text-[var(--color-ink)]">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
          {t.timestamp}
        </p>
        <p className="mt-1 font-medium">{formatJaDateTime(obs.capturedAt)}</p>
        <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{formatUtcLabel(obs.capturedAt)}</p>
      </div>
      <dl className="mt-4 grid gap-2 text-xs text-[var(--color-ink-muted)]">
        <div className="flex justify-between gap-4 border-t border-[var(--color-border)]/80 pt-2">
          <dt className="shrink-0 font-semibold text-[var(--color-ink)]">{t.contentHash}</dt>
          <dd className="break-all font-mono text-[10px]" title={obs.contentHash}>
            v{OBSERVATION_CONTENT_HASH_VERSION} · {short(obs.contentHash, 6)}
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-[var(--color-border)]/80 pt-2">
          <dt className="shrink-0 font-semibold text-[var(--color-ink)]">{t.snapshotSha}</dt>
          <dd className="break-all font-mono text-[10px]" title={obs.snapshotSha256}>
            {short(obs.snapshotSha256, 8)}
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-[var(--color-border)]/80 pt-2">
          <dt className="shrink-0 font-semibold text-[var(--color-ink)]">{t.perceptual}</dt>
          <dd className="break-all font-mono text-[10px]" title={obs.snapshotPhash}>
            {short(obs.snapshotPhash, 6)}
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-center text-[10px] leading-relaxed text-[var(--color-ink-muted)]">{t.disclaimer}</p>
    </div>
  );
}
