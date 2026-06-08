import { ViewtraceLogo } from "@/components/brand/ViewtraceLogo";
import type { ObservationStatus } from "@/lib/demo/observations";

export type EvidenceReportCopy = {
  title: string;
  subtitle: string;
  disclaimer: string;
  fieldObservationId: string;
  fieldUrl: string;
  fieldCaptureTime: string;
  fieldCountry: string;
  fieldScreenshot: string;
  fieldSha256: string;
  fieldContentHash: string;
  fieldVerifyUrl: string;
  fieldStatus: string;
  statusSuccess: string;
  statusFailure: string;
  statusPending: string;
  noScreenshot: string;
};

type Props = {
  copy: EvidenceReportCopy;
  observationId: string;
  url: string;
  capturedLabel: string;
  country: string;
  status: ObservationStatus;
  snapshotImageUrl?: string;
  snapshotSha256?: string;
  contentHash?: string;
  verifyUrl: string;
};

export function EvidenceReportSheet({
  copy,
  observationId,
  url,
  capturedLabel,
  country,
  status,
  snapshotImageUrl,
  snapshotSha256,
  contentHash,
  verifyUrl,
}: Props) {
  const statusLabel =
    status === "success"
      ? copy.statusSuccess
      : status === "failure"
        ? copy.statusFailure
        : copy.statusPending;

  const rows: { label: string; value: string; mono?: boolean; isUrl?: boolean }[] = [
    { label: copy.fieldObservationId, value: observationId, mono: true },
    { label: copy.fieldCaptureTime, value: capturedLabel },
    { label: copy.fieldCountry, value: country },
    { label: copy.fieldStatus, value: statusLabel },
    { label: copy.fieldUrl, value: url, mono: true },
    { label: copy.fieldSha256, value: snapshotSha256?.trim() || "—", mono: true },
    { label: copy.fieldContentHash, value: contentHash?.trim() || "—", mono: true },
    { label: copy.fieldVerifyUrl, value: verifyUrl, mono: true, isUrl: true },
  ];

  return (
    <article className="evidence-report-sheet mx-auto max-w-2xl px-4 pb-16 sm:px-6 sm:pb-20 print:pb-0">
      <div className="rounded-2xl border border-border bg-surface-elevated px-6 py-8 shadow-sm print:border-0 print:shadow-none sm:px-8 sm:py-10">
        <header className="border-b border-border pb-6">
          <ViewtraceLogo className="h-7 w-auto sm:h-8" priority={false} />
          <h1 className="mt-4 font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">{copy.subtitle}</p>
        </header>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {copy.fieldScreenshot}
          </p>
          <div className="mt-3 overflow-hidden rounded-xl border border-border bg-surface">
            {snapshotImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- evidence snapshot CDN/Blob
              <img
                src={snapshotImageUrl}
                alt=""
                className="max-h-[min(55vh,480px)] w-full object-contain object-top"
              />
            ) : (
              <p className="px-4 py-8 text-center text-sm text-ink-muted">{copy.noScreenshot}</p>
            )}
          </div>
        </div>

        <dl className="mt-6 divide-y divide-border">
          {rows.map((row) => (
            <div key={row.label} className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {row.label}
              </dt>
              <dd
                className={`text-sm text-ink ${row.mono ? "break-all font-mono text-xs leading-relaxed" : "leading-relaxed"}`}
              >
                {row.isUrl && row.value !== "—" ? (
                  <a href={row.value} className="text-accent underline-offset-2 hover:underline">
                    {row.value}
                  </a>
                ) : (
                  row.value
                )}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-8 border-t border-border pt-6 text-xs leading-relaxed text-ink-muted">
          {copy.disclaimer}
        </p>
      </div>
    </article>
  );
}
