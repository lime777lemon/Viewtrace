import type { ObservationWebFactsV1 } from "@/lib/observation-web-facts";
import { presentWebFacts, type WebFactsRow, type WebFactsTone } from "@/lib/web-facts-presentation";

type Props = {
  facts: ObservationWebFactsV1 | undefined;
  locale: string;
};

function toneClass(tone: WebFactsTone): string {
  if (tone === "attention") return "text-amber-950";
  if (tone === "unavailable") return "text-ink-muted";
  return "text-ink";
}

function Rows({ rows }: { rows: WebFactsRow[] }) {
  return (
    <dl>
      {rows.map((row) => (
        <div key={row.id} className="grid gap-0.5 border-b border-border/70 py-2 last:border-b-0 sm:grid-cols-[11rem_1fr] sm:gap-4">
          <dt className="text-sm text-ink-muted">{row.label}</dt>
          <dd className={`min-w-0 whitespace-pre-line wrap-break-word text-sm ${toneClass(row.tone)}`}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ObservationWebFactsPanel({ facts, locale }: Props) {
  if (!facts) return null;
  const view = presentWebFacts(facts, locale.startsWith("ja") ? "ja" : "en");

  return (
    <section className="rounded-xl border border-border bg-surface-elevated p-4 sm:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
        {locale.startsWith("ja") ? "公開情報" : "Public records"}
      </p>
      <h2 className="mt-1 text-sm font-semibold text-ink">Web Facts</h2>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">{view.separation}</p>

      <div className="mt-4">
        <p className={`text-sm font-medium ${toneClass(view.http.tone)}`}>{view.http.value}</p>
        {view.http.url ? <p className="mt-0.5 break-all text-sm text-ink">{view.http.url}</p> : null}
      </div>

      {view.sections.map((section) => (
        <div key={section.id} className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{section.title}</h3>
          <Rows rows={section.rows} />
        </div>
      ))}

      {view.attention.length > 0 ? (
        <div className="mt-4 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-950">
            {view.attentionTitle}
          </h3>
          {view.attention.map((item) => (
            <div key={item.id} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
              <p className="text-sm font-medium text-ink">⚠ {item.title}</p>
              {item.detail ? <p className="mt-0.5 whitespace-pre-line break-all text-xs text-ink">{item.detail}</p> : null}
            </div>
          ))}
        </div>
      ) : null}

      <p className="mt-4 text-xs text-ink-muted">
        {view.measuredLabel} · {view.measured}
      </p>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-medium text-ink">{view.technicalLabel}</summary>
        <div className="mt-3 space-y-4">
          {view.technical.map((section) => (
            <div key={section.id}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{section.title}</h3>
              <Rows rows={section.rows} />
            </div>
          ))}
          <details>
            <summary className="cursor-pointer text-xs text-ink-muted">{view.rawLabel}</summary>
            <div className="mt-3 space-y-4">
              {view.raw.map((section) => (
                <div key={section.id}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{section.title}</h3>
                  <Rows rows={section.rows} />
                </div>
              ))}
            </div>
          </details>
        </div>
      </details>
    </section>
  );
}
