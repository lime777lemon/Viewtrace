"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { runMonitoringCheckAction } from "@/app/actions/monitoring-runs";
import { REGION_SEARCH_FIELD_CLASS } from "@/components/RegionSearchQueryField";
import type { RegionSearchLabels } from "@/components/RegionSearchQueryField";
import { JourneyCommerceFields } from "@/components/dashboard/JourneyCommerceFields";
import {
  commerceJourneyInputs,
  isJourneyCommerceKind,
  isJourneyPurposeKind,
  JOURNEY_KEYS,
  JOURNEY_STEP_KINDS,
  JOURNEY_STEP_LIMIT,
  journeyKindLabel,
  type JourneySideEffect,
  type JourneyStepDefinition,
  type JourneyStepKind,
} from "@/lib/journey-definition";
import type { Locale } from "@/lib/i18n";
import { monitoringCheckPlan } from "@/lib/monitoring-run";
import type { PlanId } from "@/lib/plans";
import { DEFAULT_OBSERVATION_REGION, getRegionLabelForLocale, getRegionOptions } from "@/lib/regions";

const TEXT = {
  ja: {
    extraRegions: "ほかの地域",
    environment: "環境",
    desktop: "Desktop",
    mobile: "Mobile",
    both: "Desktop + Mobile",
    thisCheck: "今回の確認",
    region: "地域",
    page: "ページ",
    behavior: "挙動",
    behaviorAuto: "自動確認",
    stepsNone: "なし",
    stepsSome: "手順",
    uses: "使用",
    run: "確認する",
    runPending: "確認しています…",
    checks: "この確認は",
    checksUnit: "件です",
    pageObservations: "ページの Observation",
    journeyRuns: "Journey Run",
    available: "残量",
    steps: "手順",
    evidenceNote: "各手順は、観測できたものだけを Evidence に残します。URL、表示、非表示、文言、入力値、属性、DOM、HTTP、リソース、ダウンロード、エラー、console、失敗したリクエスト、新しいタブ、リダイレクトです。領域のスクリーンショットと動画の再生は、その手順で有効にしたときだけです。",
    evidenceScreenshot: "領域のスクリーンショット",
    evidenceVideo: "動画の再生",
    stepOne: "1. open_url は上の URL です。",
    addStep: "手順を追加",
    fillValue: "入力する値",
    urlRequired: "https://viewtrace.net のように URL を入力してください。",
    noSideEffect: "副作用なし",
    permitOrder: "注文確定を許可",
    permitPayment: "決済を許可",
    permitDelete: "削除を許可",
    permitSend: "外部送信を許可",
    becomesVisible: "表示される",
    expectedSelector: "期待するセレクタ",
    expectedText: "期待する文言",
    errors: {
      invalid_url: "https://viewtrace.net のように URL を入力してください。",
      quota: "残量を確認できなかったため、開始していません。",
      unauthorized: "ログインしてください。",
      trial_expired: "無料期間が終わっています。",
      trial_limit: "無料期間の回数に達しています。",
      region_required: "地域を選んでください。",
      environment_required: "Desktop か Mobile を選んでください。",
      selector_required: "この手順にはセレクタが必要です。",
      outcome_required: "Login、Checkout、言語、通貨、地域、アップロードの送信とドロップには、成立したことを確認する条件を指定してください。",
      value_required: "この手順には値が必要です。",
      attribute_required: "属性名を指定してください。",
      key_not_allowed: "送れるキーは Enter、Escape、Tab、矢印、Space、Backspace です。",
      url_host: "手順の URL は開始 URL と同じホストにしてください。",
      save_failed: "Journey を保存できませんでした。",
      region: "このプランでは選べない地域です。",
      invalid: "URL と地域を確認してください。",
    } as Record<string, string>,
  },
  en: {
    extraRegions: "More regions",
    environment: "Environment",
    desktop: "Desktop",
    mobile: "Mobile",
    both: "Desktop + Mobile",
    thisCheck: "This check",
    region: "Region",
    page: "Page",
    behavior: "Behavior",
    behaviorAuto: "Measured automatically",
    stepsNone: "None",
    stepsSome: "steps",
    uses: "Uses",
    run: "Run check",
    runPending: "Running the check…",
    checks: "This check will use",
    checksUnit: "checks",
    pageObservations: "Page observations",
    journeyRuns: "Journey runs",
    available: "Available",
    steps: "Steps",
    evidenceNote: "Each step keeps only the evidence it observed: URL, visible, hidden, text, input value, attribute, DOM, HTTP, resource, download, error, console, failed request, new tab, and redirect. Screenshot region and video playback run only on steps where you turn them on.",
    evidenceScreenshot: "Screenshot region",
    evidenceVideo: "Video playback",
    stepOne: "1. open_url uses the URL above.",
    addStep: "Add step",
    fillValue: "Value to enter",
    urlRequired: "Enter a full URL, such as https://viewtrace.net.",
    noSideEffect: "No side effect",
    permitOrder: "Permit place order",
    permitPayment: "Permit payment",
    permitDelete: "Permit delete",
    permitSend: "Permit external send",
    becomesVisible: "Becomes visible",
    expectedSelector: "expected selector",
    expectedText: "expected text change",
    errors: {
      invalid_url: "Enter a full URL, such as https://viewtrace.net.",
      quota: "The remaining allowance could not be read, so the check did not start.",
      unauthorized: "Sign in to run this check.",
      trial_expired: "The trial period has ended.",
      trial_limit: "The trial allowance is used up.",
      region_required: "Choose a region.",
      environment_required: "Choose Desktop or Mobile.",
      selector_required: "This step needs a selector.",
      outcome_required: "Login, Checkout, language, currency, region, and an upload submit or drop need a condition that proves the step worked.",
      value_required: "This step needs a value.",
      attribute_required: "This step needs an attribute name.",
      key_not_allowed: "The recorded keys are Enter, Escape, Tab, the arrows, Space, and Backspace.",
      url_host: "Step URLs stay on the same host as the start URL.",
      save_failed: "Could not save the Journey.",
      region: "That region is outside this plan.",
      invalid: "Check the URL and region.",
    } as Record<string, string>,
  },
};

function emptyStep(index: number): JourneyStepDefinition {
  return {
    id: `s${index}`,
    kind: "click",
    selector: "",
    value: "",
    url: "",
    wait_ms: 1000,
    permitted_side_effect: null,
    expect_selector: "",
    expect_text: "",
    expect_visible: false,
    expect_url: "",
    expect_lang: "",
  };
}

export function CaptureEntryForm({
  locale,
  labels,
  planId,
  remaining,
}: {
  locale: Locale;
  labels: RegionSearchLabels;
  planId: PlanId;
  remaining: number | null;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const copy = TEXT[locale];
  const options = useMemo(
    () => getRegionOptions(planId).map((option) => ({
      value: option.value,
      label: getRegionLabelForLocale(option, locale),
    })),
    [locale, planId],
  );
  const defaultRegion = options.some((option) => option.value === DEFAULT_OBSERVATION_REGION)
    ? DEFAULT_OBSERVATION_REGION
    : options[0]?.value ?? "";
  const [region, setRegion] = useState(defaultRegion);
  const [environment, setEnvironment] = useState<"desktop" | "mobile" | "both">("desktop");
  const [extraRegions, setExtraRegions] = useState<string[]>([]);
  const [steps, setSteps] = useState<JourneyStepDefinition[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const environments = environment === "both" ? (["desktop", "mobile"] as const) : ([environment] as const);
  const plan = monitoringCheckPlan({
    regions: [region, ...extraRegions],
    environments: [...environments],
    workflowSteps: steps.length,
  });
  const regionLine = [region, ...extraRegions]
    .map((value) => options.find((option) => option.value === value)?.label ?? value)
    .filter(Boolean)
    .join(", ");
  const environmentLine = environment === "both" ? copy.both : environment === "mobile" ? copy.mobile : copy.desktop;

  function readUrl() {
    return formRef.current?.querySelector<HTMLInputElement>('[name="url"]')?.value.trim() ?? "";
  }

  function updateStep(index: number, patch: Partial<JourneyStepDefinition>) {
    setSteps((current) => current.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  }

  function toggleExtra(value: string) {
    setExtraRegions((current) => {
      if (current.includes(value)) return current.filter((item) => item !== value);
      if (current.length >= 3) return current;
      return [...current, value];
    });
  }

  async function runCheck() {
    const url = readUrl();
    if (!url || url === "https://" || url === "http://") {
      setError(copy.urlRequired);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await runMonitoringCheckAction({
      url,
      regions: [region, ...extraRegions],
      environments: [...environments],
      steps,
      username,
      password,
    });
    if (!result.ok) {
      setBusy(false);
      if (result.error === "unauthorized") {
        router.push("/login?next=/dashboard/region-search");
        return;
      }
      if (result.error === "trial_expired") {
        router.push("/checkout?plan=starter&reason=trial_expired");
        return;
      }
      if (result.error === "trial_limit") {
        router.push("/checkout?plan=starter&reason=trial_observation_limit");
        return;
      }
      setError(copy.errors[result.error] ?? result.error);
      return;
    }
    router.push(result.observationId
      ? `/dashboard/observations/${result.observationId}`
      : `/dashboard/monitoring-runs/${result.id}`);
  }

  return (
    <form
      ref={formRef}
      data-tour="observe"
      className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-8"
      onSubmit={(event) => event.preventDefault()}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{labels.planLabel}</p>
      <p className="mt-2 text-sm text-ink-muted">
        {planId === "pro"
          ? `${labels.planPro} · ${labels.planProHint}`
          : planId === "starter"
            ? `${labels.planStarter} · ${labels.planStarterHint}`
            : labels.planTrialHint}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:gap-8">
        <div data-onboarding="region">
          <label htmlFor="capture-entry-region" className="block text-sm font-medium text-ink">
            {labels.dashboardRegionLabel}
          </label>
          <select
            id="capture-entry-region"
            value={region}
            aria-label={labels.dashboardRegionAria}
            onChange={(event) => {
              const next = event.target.value;
              setRegion(next);
              setExtraRegions((current) => current.filter((value) => value !== next));
            }}
            className={REGION_SEARCH_FIELD_CLASS}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div data-onboarding="url">
          <label htmlFor="capture-entry-url" className="block text-sm font-medium text-ink">
            {labels.dashboardQueryLabel}
          </label>
          <input
            id="capture-entry-url"
            name="url"
            type="text"
            required
            enterKeyHint="go"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder={labels.queryPlaceholder}
            className={REGION_SEARCH_FIELD_CLASS}
          />
        </div>
      </div>

      <fieldset data-onboarding="environment" className="mt-8">
        <legend className="text-sm font-medium text-ink">{copy.environment}</legend>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-ink">
          {([
            ["desktop", copy.desktop],
            ["mobile", copy.mobile],
            ["both", copy.both],
          ] as const).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2">
              <input
                type="radio"
                name="environment"
                value={value}
                checked={environment === value}
                onChange={() => setEnvironment(value)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-sm font-medium text-ink">{copy.extraRegions}</legend>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {extraRegions.map((value) => {
            const option = options.find((item) => item.value === value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleExtra(value)}
                aria-label={locale === "ja" ? `${option?.label ?? value} を外す` : `Remove ${option?.label ?? value}`}
                className="rounded-full border border-border px-3 py-1 text-xs text-ink"
              >
                {option?.label ?? value} ×
              </button>
            );
          })}
          {extraRegions.length < 3 ? (
            <select
              aria-label={copy.extraRegions}
              value=""
              onChange={(event) => {
                if (event.target.value) toggleExtra(event.target.value);
              }}
              className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-ink"
            >
              <option value="">{locale === "ja" ? "地域を追加" : "Add a region"}</option>
              {options.filter((option) => option.value !== region && !extraRegions.includes(option.value)).map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          ) : null}
        </div>
      </fieldset>

      <div data-onboarding="steps" className="mt-6">
        <h2 className="text-sm font-medium text-ink">{copy.steps}</h2>
        <p className="text-xs leading-relaxed text-ink-muted">{copy.evidenceNote}</p>
        <p className="mt-1 text-xs text-ink-muted">{copy.stepOne}</p>
        <ol className="mt-3 space-y-3">
          {steps.map((step, index) => (
            <li key={step.id} className="rounded-lg border border-border bg-surface-elevated p-3">
              <div className="flex flex-wrap gap-2">
                <span className="pt-2 text-xs text-ink-muted">{index + 2}</span>
                <select
                  value={step.kind}
                  onChange={(event) => {
                    const kind = event.target.value as JourneyStepKind;
                    updateStep(index, isJourneyCommerceKind(kind)
                      ? { kind, inputs: commerceJourneyInputs(kind), confirm_selector: "", selector: "" }
                      : { kind });
                  }}
                  className="rounded-lg border border-border bg-surface px-2 py-2 text-xs text-ink"
                >
                  {JOURNEY_STEP_KINDS.filter((kind) => kind !== "open_url").map((kind) => (
                    <option key={kind} value={kind}>{journeyKindLabel(kind, locale)}</option>
                  ))}
                </select>
                {isJourneyCommerceKind(step.kind) ? (
                  <JourneyCommerceFields step={step} locale={locale} onChange={(patch) => updateStep(index, patch)} />
                ) : null}
                {!isJourneyCommerceKind(step.kind) && step.kind !== "wait" && step.kind !== "assert_url" && step.kind !== "assert_page_text" ? (
                  <input
                    value={step.selector}
                    placeholder={step.kind === "key" ? (locale === "ja" ? "フォーカスする要素（任意）" : "Focus selector (optional)") : step.kind === "drag" ? (locale === "ja" ? "ドラッグする要素" : "Element to drag") : "selector"}
                    onChange={(event) => updateStep(index, { selector: event.target.value })}
                    className="min-w-40 flex-1 rounded-lg border border-border bg-surface px-2 py-2 text-xs text-ink"
                  />
                ) : null}
                {step.kind === "drag" ? (
                  <input
                    value={step.expect_selector}
                    placeholder={locale === "ja" ? "ドロップ先" : "Drop target"}
                    onChange={(event) => updateStep(index, { expect_selector: event.target.value })}
                    className="min-w-40 flex-1 rounded-lg border border-border bg-surface px-2 py-2 text-xs text-ink"
                  />
                ) : null}
                {step.kind === "assert_attribute" ? (
                  <input
                    value={step.expect_attribute ?? ""}
                    placeholder={locale === "ja" ? "属性名（href など）" : "Attribute name, such as href"}
                    onChange={(event) => updateStep(index, { expect_attribute: event.target.value })}
                    className="min-w-32 flex-1 rounded-lg border border-border bg-surface px-2 py-2 text-xs text-ink"
                  />
                ) : null}
                {step.kind === "search" ? (
                  <input
                    value={step.value}
                    placeholder={locale === "ja" ? "検索語" : "Query"}
                    onChange={(event) => updateStep(index, { value: event.target.value })}
                    className="min-w-32 flex-1 rounded-lg border border-border bg-surface px-2 py-2 text-xs text-ink"
                  />
                ) : null}
                {step.kind === "key" ? (
                  <select
                    value={step.value}
                    onChange={(event) => updateStep(index, { value: event.target.value })}
                    className="min-w-32 rounded-lg border border-border bg-surface px-2 py-2 text-xs text-ink"
                  >
                    <option value="">{locale === "ja" ? "キー" : "Key"}</option>
                    {JOURNEY_KEYS.map((key) => (
                      <option key={key} value={key}>{key}</option>
                    ))}
                  </select>
                ) : null}
                {step.kind === "fill" || step.kind === "select" || step.kind === "assert_text" || step.kind === "assert_url" || step.kind === "assert_page_text" || step.kind === "assert_attribute" ? (
                  <input
                    value={step.value}
                    placeholder={step.kind === "fill"
                      ? copy.fillValue
                      : step.kind === "assert_text"
                        ? (locale === "ja" ? "一致する文字" : "Exact text")
                        : step.kind === "assert_url"
                          ? (locale === "ja" ? "期待する URL、または URL に含まれる文字列" : "Expected URL, or text the URL contains")
                          : step.kind === "assert_page_text"
                            ? (locale === "ja" ? "ページに含まれる文字列" : "Text the page contains")
                            : step.kind === "assert_attribute"
                              ? (locale === "ja" ? "期待する属性値" : "Expected attribute value")
                              : "value"}
                    onChange={(event) => updateStep(index, { value: event.target.value })}
                    className="min-w-32 flex-1 rounded-lg border border-border bg-surface px-2 py-2 text-xs text-ink"
                  />
                ) : null}
                {step.kind === "wait" ? (
                  <input
                    type="number"
                    value={step.wait_ms}
                    min={200}
                    max={15000}
                    onChange={(event) => updateStep(index, { wait_ms: Number(event.target.value) })}
                    className="w-28 rounded-lg border border-border bg-surface px-2 py-2 text-xs text-ink"
                  />
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-3">
                <label className="flex items-center gap-1 text-xs text-ink-muted">
                  <input
                    type="checkbox"
                    checked={step.evidence_screenshot === true}
                    onChange={(event) => updateStep(index, { evidence_screenshot: event.target.checked })}
                  />
                  {copy.evidenceScreenshot}
                </label>
                <label className="flex items-center gap-1 text-xs text-ink-muted">
                  <input
                    type="checkbox"
                    checked={step.evidence_video === true}
                    onChange={(event) => updateStep(index, { evidence_video: event.target.checked })}
                  />
                  {copy.evidenceVideo}
                </label>
              </div>
              {step.kind === "click" || isJourneyPurposeKind(step.kind) ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <input
                    value={step.expect_selector}
                    placeholder={copy.expectedSelector}
                    onChange={(event) => updateStep(index, { expect_selector: event.target.value })}
                    className="min-w-36 flex-1 rounded-lg border border-border bg-surface px-2 py-2 text-xs text-ink"
                  />
                  <input
                    value={step.expect_text}
                    placeholder={copy.expectedText}
                    onChange={(event) => updateStep(index, { expect_text: event.target.value })}
                    className="min-w-36 flex-1 rounded-lg border border-border bg-surface px-2 py-2 text-xs text-ink"
                  />
                  <label className="flex items-center gap-1 text-xs text-ink-muted">
                    <input type="checkbox" checked={step.expect_visible} onChange={(event) => updateStep(index, { expect_visible: event.target.checked })} />
                    {copy.becomesVisible}
                  </label>
                  <select
                    value={step.permitted_side_effect ?? ""}
                    onChange={(event) => updateStep(index, { permitted_side_effect: (event.target.value || null) as JourneySideEffect | null })}
                    className="rounded-lg border border-border bg-surface px-2 py-2 text-xs text-ink"
                  >
                    <option value="">{copy.noSideEffect}</option>
                    <option value="place_order">{copy.permitOrder}</option>
                    <option value="payment">{copy.permitPayment}</option>
                    <option value="delete">{copy.permitDelete}</option>
                    <option value="external_send">{copy.permitSend}</option>
                  </select>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="text-xs font-semibold text-ink"
            onClick={() => setSteps((current) => current.length >= JOURNEY_STEP_LIMIT - 1 ? current : [...current, emptyStep(current.length + 2)])}
          >
            {copy.addStep}
          </button>
          {(["login", "signup", "add_to_cart", "checkout"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-ink"
              onClick={() => setSteps((current) => current.length >= JOURNEY_STEP_LIMIT - 1 ? current : [...current, {
                ...emptyStep(current.length + 2),
                kind,
                inputs: commerceJourneyInputs(kind),
                wait_ms: 8000,
              }])}
            >
              {journeyKindLabel(kind, locale)}
            </button>
          ))}
        </div>
        {steps.some((step) => step.kind === "login" || step.kind === "signup") ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs text-ink-muted">
              {locale === "ja" ? "テストのユーザー名" : "Test username"}
              <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="off" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink" />
            </label>
            <label className="grid gap-1 text-xs text-ink-muted">
              {locale === "ja" ? "テストのパスワード" : "Test password"}
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink" />
            </label>
          </div>
        ) : null}
      </div>

      {error ? <p className="mt-3 text-xs font-medium text-red-700" role="alert">{error}</p> : null}

      <div data-onboarding="confirm" className="mt-6 space-y-1 text-sm text-ink">
        <p className="font-semibold">{copy.thisCheck}</p>
        <p>{copy.region} {regionLine}</p>
        <p>{copy.environment} {environmentLine}</p>
        <p>{copy.page} {plan.pageObservations}</p>
        <p>{copy.behavior} {copy.behaviorAuto}</p>
        <p>{copy.steps} {steps.length ? String(steps.length) : copy.stepsNone}</p>
        <p className="pt-1 font-semibold">
          {copy.uses} {plan.total} check
          {remaining != null ? ` · ${copy.available}: ${remaining}` : ""}
        </p>
        <button
          type="button"
          disabled={busy}
          aria-busy={busy}
          onClick={() => void runCheck()}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-80"
        >
          {busy ? (
            <>
              <span
                aria-hidden
                className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/35 border-t-white"
              />
              <span>{copy.runPending}</span>
            </>
          ) : (
            copy.run
          )}
        </button>
      </div>
    </form>
  );
}
