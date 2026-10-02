import type { LandingPlanCopy } from "@/lib/plans/landing-copy";

export function LandingPlanDetails({
  plan,
  extraFeatures,
  headingLevel = "h3",
}: {
  plan: LandingPlanCopy;
  extraFeatures?: string[];
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  const features = extraFeatures?.length ? [...plan.features, ...extraFeatures] : plan.features;

  return (
    <div>
      {plan.badge ? (
        <div className="mb-3 inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
          <span aria-hidden>⭐</span>
          {plan.badge}
        </div>
      ) : null}
      <Heading className="font-display text-xl font-semibold text-ink">{plan.name}</Heading>
      <p className="mt-1 text-sm font-medium text-ink">{plan.description}</p>
      {plan.subdescription ? (
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{plan.subdescription}</p>
      ) : null}
      <p className="mt-6 flex items-baseline gap-1">
        <span className="font-display text-3xl font-semibold text-ink">{plan.price}</span>
        <span className="text-sm text-ink-muted">{plan.period}</span>
      </p>
      {plan.usageExample ? (
        <p className="mt-4 rounded-xl border border-accent/25 bg-accent-soft/40 px-4 py-3 text-sm font-medium leading-relaxed text-ink">
          {plan.usageExample}
        </p>
      ) : null}
      <ul className="mt-6 space-y-2.5 text-sm text-ink-muted">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
