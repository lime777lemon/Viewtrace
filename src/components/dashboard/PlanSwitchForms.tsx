import { switchPlanAction } from "@/app/actions/auth";
import { PLANS, type PlanId } from "@/lib/plans";

export function PlanSwitchForms({ currentPlan }: { currentPlan: PlanId }) {
  return (
    <div className="mt-6 space-y-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-ink-muted)]">
        デモ：プランを切り替え
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["starter", "pro"] as const).map((id) => {
          const p = PLANS[id];
          const active = currentPlan === id;
          return (
            <form key={id} action={switchPlanAction}>
              <input type="hidden" name="plan" value={id} />
              <button
                type="submit"
                disabled={active}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition disabled:opacity-100 ${
                  active
                    ? "cursor-default border-[var(--color-accent)] bg-[var(--color-accent-soft)]/50 ring-2 ring-[var(--color-accent)]/25"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)]/40"
                }`}
              >
                <span className="font-display font-semibold text-[var(--color-ink)]">{p.name}</span>
                {active ? (
                  <span className="mt-1 block text-xs font-medium text-[var(--color-accent)]">現在のプラン</span>
                ) : (
                  <span className="mt-1 block text-xs text-[var(--color-ink-muted)]">このプランに切り替え</span>
                )}
                <span className="mt-1 block text-xs text-[var(--color-ink-muted)]">
                  {p.priceLabel} · 月{p.monthlyObservations}回 · {p.retentionDays}日 ·{" "}
                  {p.csvExport ? "CSVあり" : "CSVなし"}
                </span>
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
