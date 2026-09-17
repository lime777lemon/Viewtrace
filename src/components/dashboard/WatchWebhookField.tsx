import { WEBHOOK_PAYLOAD_SAMPLE } from "@/lib/observation-evidence-json";

type Props = {
  label: string;
  hint: string;
  placeholder: string;
  initialValue?: string | null;
  sampleLabel?: string;
};

export function WatchWebhookField({ label, hint, placeholder, initialValue, sampleLabel }: Props) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-ink-muted">{label}</span>
      <input
        type="url"
        name="webhook_url"
        inputMode="url"
        autoComplete="off"
        defaultValue={initialValue ?? ""}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm"
      />
      <p className="text-xs leading-relaxed text-ink-muted">{hint}</p>
      {sampleLabel ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-medium text-accent">{sampleLabel}</summary>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-surface p-3 font-mono text-[11px] leading-relaxed text-ink-muted">
            {WEBHOOK_PAYLOAD_SAMPLE}
          </pre>
        </details>
      ) : null}
    </label>
  );
}
