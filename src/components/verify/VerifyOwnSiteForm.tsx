import { submitVerifyOwnUrlAction } from "@/app/actions/verify-loop";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";

type Props = {
  token: string;
  error?: boolean;
  labels: {
    urlLabel: string;
    urlPlaceholder: string;
    submit: string;
    submitting: string;
    invalidUrl: string;
  };
};

export function VerifyOwnSiteForm({ token, error, labels }: Props) {
  return (
    <form action={submitVerifyOwnUrlAction} className="mt-4 space-y-3">
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="verify-loop-url" className="block text-sm font-medium text-ink">
          {labels.urlLabel}
        </label>
        <input
          id="verify-loop-url"
          name="url"
          type="url"
          required
          inputMode="url"
          autoComplete="url"
          placeholder={labels.urlPlaceholder}
          className="mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none ring-accent/25 transition placeholder:text-ink-muted/60 focus:border-accent/40 focus:ring-2"
        />
      </div>
      {error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {labels.invalidUrl}
        </p>
      ) : null}
      <PendingSubmitButton
        label={labels.submit}
        pendingLabel={labels.submitting}
        className="w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover sm:w-auto"
      />
    </form>
  );
}
