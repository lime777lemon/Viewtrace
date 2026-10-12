import type { Observation } from "@/lib/demo/observations";
import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";
import { contentHashVersionForObservation } from "@/lib/observation-content-hash";

type Props = {
  obs: Observation;
  locale: Locale;
};

function hexOrDash(value: string | undefined): string {
  return value?.trim() ? value.trim() : "—";
}

/** 41: 既存ハッシュと記録 ID を記録面にまとめる。SHA は同じか違うかまで。 */
export function ObservationEvidenceHashes({ obs, locale }: Props) {
  const t = copy[locale].observationDetail;
  const version = contentHashVersionForObservation(obs);

  return (
    <section
      className="rounded-xl border border-border bg-surface-elevated p-4 sm:p-5 sm:col-span-2"
      aria-labelledby="observation-evidence-hashes-heading"
    >
      <h3 id="observation-evidence-hashes-heading" className="text-sm font-semibold text-ink">
        {t.hashesTitle}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t.hashesHint}</p>
      <dl className="mt-4 space-y-3">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            {t.hashesRecordId}
          </dt>
          <dd className="mt-1 break-all font-mono text-sm text-ink">{obs.id}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            {t.hashesSha256}
          </dt>
          <dd className="mt-1 break-all font-mono text-xs leading-relaxed text-ink">
            {hexOrDash(obs.snapshotSha256)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            {t.hashesContentHash}
          </dt>
          <dd className="mt-1 break-all font-mono text-xs leading-relaxed text-ink">
            v{version} · {hexOrDash(obs.contentHash)}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs leading-relaxed text-ink-muted">{t.hashesShaIdentityHint}</p>
      <p className="mt-1 text-xs text-ink-muted">{t.hashesSealNote}</p>
    </section>
  );
}
