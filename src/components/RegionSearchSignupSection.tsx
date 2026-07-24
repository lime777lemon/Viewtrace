import Link from "next/link";

export type RegionSearchSignupLabels = {
  title: string;
  body: string;
  ctaPrimary: string;
  ctaSecondary: string;
};

type Props = {
  labels: RegionSearchSignupLabels;
};

export function RegionSearchSignupSection({ labels }: Props) {
  return (
    <section
      className="border-b border-border bg-accent-soft/35"
      aria-labelledby="region-search-signup-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm sm:p-8">
          <h3
            id="region-search-signup-heading"
            className="font-display text-xl font-semibold text-ink sm:text-2xl"
          >
            {labels.title}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">{labels.body}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/login?mode=signup"
              className="inline-flex flex-1 items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-accent-hover sm:min-w-48"
            >
              {labels.ctaPrimary}
            </Link>
            <Link
              href="/login?mode=signin"
              className="inline-flex flex-1 items-center justify-center rounded-full border border-border bg-surface px-6 py-3 text-sm font-semibold text-ink transition hover:border-ink-muted/40 sm:min-w-48"
            >
              {labels.ctaSecondary}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
