import {
  commerceJourneyInputs,
  type JourneyInput,
  type JourneySideEffect,
  type JourneyStepDefinition,
} from "@/lib/journey-definition";
import type { Locale } from "@/lib/i18n";

const FIELD = "min-w-36 flex-1 rounded-lg border border-border bg-surface px-2 py-2 text-xs text-ink";

export function JourneyCommerceFields({
  step,
  locale,
  onChange,
}: {
  step: JourneyStepDefinition;
  locale: Locale;
  onChange: (patch: Partial<JourneyStepDefinition>) => void;
}) {
  const ja = locale === "ja";
  const inputs = step.inputs?.length ? step.inputs : commerceJourneyInputs(step.kind === "signup" ? "signup" : step.kind === "login" ? "login" : "add_to_cart");
  function setInput(role: JourneyInput["role"], patch: Partial<JourneyInput>) {
    const current = step.inputs?.length ? step.inputs : inputs;
    const next = current.some((input) => input.role === role)
      ? current.map((input) => (input.role === role ? { ...input, ...patch } : input))
      : [...current, { role, selector: "", value: "", ...patch }];
    onChange({ inputs: next });
  }
  function labeled(role: JourneyInput["role"], label: string, valueLabel?: string) {
    const input = (step.inputs ?? inputs).find((item) => item.role === role) ?? { role, selector: "", value: "" };
    return (
      <>
        <input
          value={input.selector}
          placeholder={label}
          onChange={(event) => setInput(role, { selector: event.target.value })}
          className={FIELD}
        />
        {valueLabel ? (
          <input
            value={input.value}
            placeholder={valueLabel}
            onChange={(event) => setInput(role, { value: event.target.value })}
            className={FIELD}
          />
        ) : null}
      </>
    );
  }

  return (
    <div className="mt-2 grid w-full basis-full gap-2">
      <div className="flex flex-wrap gap-2">
        {step.kind === "login" ? labeled("username", ja ? "ユーザー名のセレクタ" : "Username selector") : null}
        {step.kind === "signup" ? labeled("name", ja ? "名前のセレクタ" : "Name selector", ja ? "名前" : "Name") : null}
        {step.kind === "signup" ? labeled("email", ja ? "メールのセレクタ" : "Email selector", ja ? "メール" : "Email") : null}
        {step.kind === "login" || step.kind === "signup" ? labeled("password", ja ? "パスワードのセレクタ" : "Password selector") : null}
        <input
          value={step.selector}
          placeholder={step.kind === "add_to_cart" ? (ja ? "カートに追加するボタン" : "Add to cart button") : step.kind === "checkout" ? (ja ? "チェックアウトのボタン" : "Checkout button") : (ja ? "送信ボタン" : "Submit button")}
          onChange={(event) => onChange({ selector: event.target.value })}
          className={FIELD}
        />
      </div>
      {step.kind === "login" || step.kind === "signup" ? (
        <p className="text-xs text-ink-muted">
          {ja ? "パスワードは保存済みのテストパスワード {{password}} を使います。" : "The password field uses the saved test password {{password}}."}
        </p>
      ) : null}
      {step.kind === "checkout" ? (
        <div className="grid gap-2">
          {(step.inputs ?? []).map((input, index) => (
            <div key={`${input.role}-${index}`} className="flex flex-wrap gap-2">
              <input
                value={input.selector}
                placeholder={ja ? "入力欄のセレクタ" : "Field selector"}
                onChange={(event) => {
                  const next = [...(step.inputs ?? [])];
                  next[index] = { ...input, selector: event.target.value };
                  onChange({ inputs: next });
                }}
                className={FIELD}
              />
              <input
                value={input.value}
                placeholder={ja ? "入力する値" : "Value"}
                onChange={(event) => {
                  const next = [...(step.inputs ?? [])];
                  next[index] = { ...input, value: event.target.value };
                  onChange({ inputs: next });
                }}
                className={FIELD}
              />
            </div>
          ))}
          {(step.inputs ?? []).length < 3 ? (
            <button
              type="button"
              className="w-fit text-xs font-semibold text-ink"
              onClick={() => onChange({ inputs: [...(step.inputs ?? []), { role: "field", selector: "", value: "" }] })}
            >
              {ja ? "チェックアウトの入力欄を追加" : "Add a checkout field"}
            </button>
          ) : null}
          <input
            value={step.confirm_selector ?? ""}
            placeholder={ja ? "確定ボタン（注文確定は許可が必要）" : "Confirm button (place order needs permission)"}
            onChange={(event) => onChange({ confirm_selector: event.target.value })}
            className={FIELD}
          />
          <select
            value={step.permitted_side_effect ?? ""}
            onChange={(event) => onChange({ permitted_side_effect: (event.target.value || null) as JourneySideEffect | null })}
            className="rounded-lg border border-border bg-surface px-2 py-2 text-xs text-ink"
          >
            <option value="">{ja ? "注文確定はしない" : "Do not place the order"}</option>
            <option value="place_order">{ja ? "注文確定を許可" : "Permit place order"}</option>
            <option value="payment">{ja ? "決済を許可" : "Permit payment"}</option>
          </select>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <input
          value={step.expect_url}
          placeholder={ja ? "最終 URL に含む文字" : "Final URL contains"}
          onChange={(event) => onChange({ expect_url: event.target.value })}
          className={FIELD}
        />
        <input
          value={step.expect_selector}
          placeholder={ja ? "最終状態のセレクタ" : "Final state selector"}
          onChange={(event) => onChange({ expect_selector: event.target.value })}
          className={FIELD}
        />
        <input
          value={step.expect_text}
          placeholder={ja ? "最終状態の文言" : "Final state text"}
          onChange={(event) => onChange({ expect_text: event.target.value })}
          className={FIELD}
        />
        <label className="flex items-center gap-1 text-xs text-ink-muted">
          <input type="checkbox" checked={step.expect_visible} onChange={(event) => onChange({ expect_visible: event.target.checked })} />
          {ja ? "表示される" : "Becomes visible"}
        </label>
      </div>
    </div>
  );
}
