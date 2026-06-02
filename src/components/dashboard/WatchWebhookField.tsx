type Props = {
  label: string;
  hint: string;
  placeholder: string;
  initialValue?: string | null;
};

export function WatchWebhookField({ label, hint, placeholder, initialValue }: Props) {
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
    </label>
  );
}
