"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { deleteJourneyAction, disableJourneyMonitoringAction, enableJourneyMonitoringAction, runJourneyNowAction, saveJourneyAction } from "@/app/actions/journeys";
import { JourneyCommerceFields } from "@/components/dashboard/JourneyCommerceFields";
import { JourneyRunsTable } from "@/components/dashboard/JourneyRunsTable";
import { RegionEnvironmentMatrixView } from "@/components/dashboard/RegionEnvironmentMatrixView";
import { parseJourneyGeoStage } from "@/lib/journey-conclusion";
import { buildRegionEnvironmentMatrix, environmentFromJourneyRecord, keepLatestColumns, resourcesCellFromRequests } from "@/lib/region-environment-matrix";
import {
  commerceJourneyInputs,
  isJourneyCommerceKind,
  isJourneyPurposeKind,
  journeyPurposeLabel,
  JOURNEY_KEYS,
  JOURNEY_STEP_KINDS,
  JOURNEY_STEP_LIMIT,
  journeyKindLabel,
  resolveJourneyOpenUrl,
  resolveJourneySteps,
  type JourneyDeviceClass,
  type JourneyPurpose,
  type JourneySideEffect,
  type JourneyStepDefinition,
  type JourneyStepKind,
} from "@/lib/journey-definition";
import type { Locale } from "@/lib/i18n";
import type { JourneyDefinitionPublic, JourneyRunPublic } from "@/lib/journey-store";
import { evaluateMonitoringPreflight, journeyMonitoringChecks, type MonitoringPreflight } from "@/lib/monitoring-watch";

type RegionChoice = { value: string; label: string };

const EMPTY_STEP = (index: number): JourneyStepDefinition => ({
  id: `s${index}`,
  kind: index === 1 ? "open_url" : "click",
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
});

export function JourneyEditor({
  journey,
  regions,
  watchAllowed,
  runs,
  locale = "en",
  availableChecks = null,
}: {
  journey: JourneyDefinitionPublic | null;
  regions: RegionChoice[];
  watchAllowed: boolean;
  runs: JourneyRunPublic[];
  locale?: Locale;
  availableChecks?: number | null;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [monitoringPending, startMonitoring] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(journey?.name ?? "");
  const [purpose, setPurpose] = useState<JourneyPurpose>(journey?.purpose ?? "production");
  const [startUrl, setStartUrl] = useState(journey?.start_url ?? "https://");
  const [steps, setSteps] = useState<JourneyStepDefinition[]>(() => {
    const raw = journey?.steps.length ? journey.steps : [EMPTY_STEP(1)];
    return journey ? resolveJourneySteps(journey.start_url, raw) : raw;
  });
  const [selectedRegions, setSelectedRegions] = useState<string[]>(journey?.regions.length ? journey.regions : ["US-CA"]);
  const [devices, setDevices] = useState<JourneyDeviceClass[]>(journey?.device_classes.length ? journey.device_classes : ["desktop"]);
  const [schedule, setSchedule] = useState<"off" | "daily" | "weekly">(journey?.watch_enabled ? journey.watch_frequency : "off");
  const [preflightNote, setPreflightNote] = useState<MonitoringPreflight | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [uploadCustomOpen, setUploadCustomOpen] = useState<Record<string, boolean>>({});
  const regionMatrix = buildRegionEnvironmentMatrix(keepLatestColumns(runs.map((run) => ({
    region: run.region,
    stage: parseJourneyGeoStage(run.environment),
    device: run.device_class,
    environment: environmentFromJourneyRecord(run.environment),
    resources: resourcesCellFromRequests(run.steps.flatMap((step) => step.network ?? [])),
    steps: run.steps.map((step) => ({ kind: step.kind, status: step.status })),
  }))), locale);

  function updateStep(index: number, patch: Partial<JourneyStepDefinition>) {
    setSteps((current) => current.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  }

  function fieldValue(field: string, fallback: string) {
    return formRef.current?.querySelector<HTMLInputElement>(`[name="${field}"]`)?.value ?? fallback;
  }

  function save() {
    setError(null);
    const nextName = fieldValue("journeyName", name).trim();
    const typedStart = fieldValue("startUrl", startUrl).trim();
    const nextStart = typedStart === "https://" || typedStart === "http://" ? "" : typedStart;
    const typedSteps = steps.map((step, index) => {
      if (step.kind !== "open_url") return step;
      const typed = fieldValue(`step-${index}-url`, step.url).trim();
      return { ...step, url: typed || nextStart };
    });
    const urlToSave = nextStart || typedSteps.find((step) => step.kind === "open_url")?.url || "";
    const nextSteps = resolveJourneySteps(urlToSave, typedSteps);
    setSteps(nextSteps);
    if (urlToSave.startsWith("http")) setStartUrl(urlToSave);
    if (!urlToSave) {
      setError("Enter a full URL, such as https://viewtrace.net");
      return;
    }
    start(async () => {
      const result = await saveJourneyAction({
        id: journey?.id,
        name: nextName,
        startUrl: urlToSave,
        steps: nextSteps,
        regions: selectedRegions,
        deviceClasses: devices,
        watchEnabled: false,
        watchFrequency: schedule === "weekly" ? "weekly" : "daily",
        purpose,
        preserveWatch: Boolean(journey),
        username: fieldValue("testUsername", username),
        password: fieldValue("testPassword", password),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/dashboard/journeys/${result.id}`);
      router.refresh();
    });
  }

  function applyMonitoring() {
    if (!journey) return;
    setError(null);
    const frequency = schedule === "weekly" ? "weekly" : "daily";
    startMonitoring(async () => {
      if (schedule === "off") {
        const result = await disableJourneyMonitoringAction(journey.id);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setPreflightNote(null);
        router.refresh();
        return;
      }
      const result = await enableJourneyMonitoringAction({
        id: journey.id,
        frequency,
        regions: selectedRegions,
        deviceClasses: devices,
        username: fieldValue("testUsername", username),
        password: fieldValue("testPassword", password),
      });
      if (!result.ok) {
        setError(result.error);
        setPreflightNote(result.preflight ?? null);
        return;
      }
      setPreflightNote(null);
      router.refresh();
    });
  }

  function runNow() {
    if (!journey) return;
    setError(null);
    start(async () => {
      const result = await runJourneyNowAction(journey.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <form ref={formRef} className="rounded-xl border border-border bg-surface-elevated p-4 sm:p-5" onSubmit={(event) => { event.preventDefault(); save(); }}>
        <h1 className="text-lg font-semibold text-ink">{journey ? "Journey" : "New Journey"}</h1>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">
          {locale === "ja"
            ? "Discovery は自動のままです。Journey は、選んだ地域と環境で、定義した手順だけを実行します。ログイン、アカウント作成、カート、チェックアウトは追加した手順だけ実行します。注文確定と支払いは、その手順で許可したときだけです。各手順では、URL、表示、文言、入力、属性、DOM、HTTP、リソース、ダウンロード、エラー、console、失敗したリクエスト、新しいタブ、リダイレクトのうち、観測できたものを Evidence として残します。領域のスクリーンショットと動画の再生は、その手順で有効にしたときだけです。"
            : "Discovery stays automatic. A Journey runs the steps you define, in each selected region and environment. Login, Signup, Add to cart, and Checkout run only as steps you add. Place order and payment stay blocked unless that step permits them. Each step keeps the evidence it actually observed: URL, visibility, text, input, attributes, DOM, HTTP, resources, downloads, errors, console, failed requests, new tabs, and redirects. Screenshot region and video playback run only on steps where you turn them on."}
        </p>
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-xs text-ink-muted">
            Name
            <input name="journeyName" value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink" />
          </label>
          <fieldset className="grid gap-2">
            <legend className="text-xs text-ink-muted">{locale === "ja" ? "用途" : "Purpose"}</legend>
            <div className="flex flex-wrap gap-3 text-sm text-ink">
              {(["production", "test", "fixture"] as const).map((value) => (
                <label key={value} className="flex items-center gap-1.5">
                  <input type="radio" name="journeyPurpose" checked={purpose === value} onChange={() => setPurpose(value)} />
                  {journeyPurposeLabel(value, locale)}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="grid gap-1 text-xs text-ink-muted">
            Start URL
            <input
              name="startUrl"
              value={startUrl}
              onChange={(event) => setStartUrl(event.target.value)}
              onBlur={() => {
                const typed = fieldValue("startUrl", startUrl).trim();
                if (!typed || typed === "https://" || typed === "http://") return;
                setSteps((current) => current.map((step, index) => {
                  if (step.kind !== "open_url") return step;
                  const typedUrl = fieldValue(`step-${index}-url`, step.url);
                  const resolved = resolveJourneyOpenUrl(typed, typedUrl);
                  return resolved ? { ...step, url: resolved } : step;
                }));
              }}
              autoComplete="url"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink"
            />
          </label>
        </div>

        <fieldset className="mt-4">
          <legend className="text-xs font-semibold text-ink">Region</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {regions.map((region) => (
              <label key={region.value} className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-ink">
                <input
                  type="checkbox"
                  checked={selectedRegions.includes(region.value)}
                  onChange={(event) => {
                    setSelectedRegions((current) => event.target.checked ? [...current, region.value].slice(0, 4) : current.filter((value) => value !== region.value));
                  }}
                />
                {region.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-4">
          <legend className="text-xs font-semibold text-ink">Environment</legend>
          <div className="mt-2 flex gap-2">
            {(["desktop", "mobile"] as const).map((device) => (
              <label key={device} className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-ink">
                <input
                  type="checkbox"
                  checked={devices.includes(device)}
                  onChange={(event) => {
                    setDevices((current) => event.target.checked ? [...current, device] : current.filter((value) => value !== device));
                  }}
                />
                {device === "desktop" ? "Desktop · 1440×900 · mouse" : "Mobile · 390×844 · touch"}
              </label>
            ))}
          </div>
        </fieldset>

        <ol className="mt-5 space-y-3">
          {steps.map((step, index) => (
            <li key={step.id} className="rounded-lg border border-border bg-surface p-3">
              <div className="flex flex-wrap gap-2">
                <span className="pt-2 text-xs text-ink-muted">{index + 1}</span>
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
                  {JOURNEY_STEP_KINDS.map((kind) => (
                    <option key={kind} value={kind}>{journeyKindLabel(kind, locale)}</option>
                  ))}
                </select>
                {isJourneyCommerceKind(step.kind) ? (
                  <JourneyCommerceFields step={step} locale={locale} onChange={(patch) => updateStep(index, patch)} />
                ) : null}
                {!isJourneyCommerceKind(step.kind) && step.kind !== "wait" && step.kind !== "open_url" && step.kind !== "assert_url" && step.kind !== "assert_page_text" ? (
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
                {step.kind === "open_url" ? (
                  <input
                    name={`step-${index}-url`}
                    value={step.url}
                    placeholder="https://…"
                    onChange={(event) => updateStep(index, { url: event.target.value })}
                    onBlur={() => {
                      const resolved = resolveJourneyOpenUrl(fieldValue("startUrl", startUrl), fieldValue(`step-${index}-url`, step.url));
                      if (resolved) updateStep(index, { url: resolved });
                    }}
                    autoComplete="url"
                    className="min-w-40 flex-1 rounded-lg border border-border bg-surface px-2 py-2 text-xs text-ink"
                  />
                ) : null}
                {step.kind === "search" || step.kind === "language_switch" || step.kind === "currency_switch" || step.kind === "region_switch" ? (
                  <input
                    value={step.value}
                    placeholder={step.kind === "search"
                      ? (locale === "ja" ? "検索語" : "Query")
                      : step.kind === "region_switch"
                        ? (locale === "ja" ? "選択後の地域" : "Selected region")
                        : (locale === "ja" ? "select の値" : "Option value")}
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
                      ? "{{username}} or text"
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
              {step.kind === "open_url" && journey?.steps[index]?.url && journey.steps[index].url !== step.url ? (
                <p className="mt-2 text-xs text-ink-muted">
                  {locale === "ja"
                    ? `保存値 ${journey.steps[index].url} は、実行時に ${step.url} として開きます。`
                    : `Saved ${journey.steps[index].url} opens as ${step.url}.`}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-3">
                <label className="flex items-center gap-1 text-xs text-ink-muted">
                  <input
                    type="checkbox"
                    checked={step.evidence_screenshot === true}
                    onChange={(event) => updateStep(index, { evidence_screenshot: event.target.checked })}
                  />
                  {locale === "ja" ? "領域のスクリーンショット" : "Screenshot region"}
                </label>
                <label className="flex items-center gap-1 text-xs text-ink-muted">
                  <input
                    type="checkbox"
                    checked={step.evidence_video === true}
                    onChange={(event) => updateStep(index, { evidence_video: event.target.checked })}
                  />
                  {locale === "ja" ? "動画の再生" : "Video playback"}
                </label>
              </div>
              {step.kind === "upload" ? (
                <div className="mt-2 space-y-2">
                  <select
                    value={step.upload_custom || uploadCustomOpen[step.id] ? "custom" : (step.upload_sample || "")}
                    onChange={(event) => {
                      const next = event.target.value;
                      if (next === "custom") {
                        setUploadCustomOpen((current) => ({ ...current, [step.id]: true }));
                        updateStep(index, { upload_sample: "" });
                      } else if (next === "sample_jpg" || next === "sample_png" || next === "sample_pdf" || next === "sample_csv" || next === "sample_txt") {
                        setUploadCustomOpen((current) => ({ ...current, [step.id]: false }));
                        updateStep(index, { upload_sample: next, upload_custom: null });
                      } else {
                        setUploadCustomOpen((current) => ({ ...current, [step.id]: false }));
                        updateStep(index, { upload_sample: "", upload_custom: null, upload_submit: false, upload_drop: false });
                      }
                    }}
                    className="rounded-lg border border-border bg-surface px-2 py-2 text-xs text-ink"
                  >
                    <option value="">{locale === "ja" ? "テストファイルなし" : "No test file"}</option>
                    <option value="sample_jpg">viewtrace-test.jpg</option>
                    <option value="sample_png">viewtrace-test.png</option>
                    <option value="sample_pdf">viewtrace-test.pdf</option>
                    <option value="sample_csv">viewtrace-test.csv</option>
                    <option value="sample_txt">viewtrace-test.txt</option>
                    <option value="custom">{locale === "ja" ? "自分のテストファイル" : "Custom test file"}</option>
                  </select>
                  {step.upload_custom || uploadCustomOpen[step.id] ? (
                    <input
                      type="file"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (!file) return;
                        if (file.size > 60000) {
                          setError(locale === "ja" ? "テストファイルは 60KB までです。" : "A test file can be up to 60KB.");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          const text = typeof reader.result === "string" ? reader.result : "";
                          const base64 = text.includes(",") ? text.slice(text.indexOf(",") + 1) : "";
                          if (!base64) return;
                          updateStep(index, {
                            upload_sample: "",
                            upload_custom: { name: file.name, mime: file.type || "application/octet-stream", base64 },
                          });
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="text-xs text-ink"
                    />
                  ) : null}
                  {step.upload_custom ? <p className="text-xs text-ink-muted">{step.upload_custom.name}</p> : null}
                  <label className="flex items-center gap-1 text-xs text-ink-muted">
                    <input
                      type="checkbox"
                      checked={step.upload_drop === true}
                      onChange={(event) => updateStep(index, { upload_drop: event.target.checked })}
                    />
                    {locale === "ja" ? "ファイルをドロップする" : "Drop the file"}
                  </label>
                  <p className="text-xs text-ink-muted">
                    {locale === "ja"
                      ? "ドロップを許可すると、テストファイルは対象へ置かれ、サイトが受け取る場合があります。許可しないドロップ領域は未測定です。"
                      : "Dropping places the test file on the target, and the site may receive it. A drop zone stays not measured until drop is permitted."}
                  </p>
                  <label className="flex items-center gap-1 text-xs text-ink-muted">
                    <input
                      type="checkbox"
                      checked={step.upload_submit === true}
                      onChange={(event) => updateStep(index, { upload_submit: event.target.checked })}
                    />
                    {locale === "ja" ? "アップロードを送信する" : "Submit upload"}
                  </label>
                  <p className="text-xs text-ink-muted">
                    {locale === "ja"
                      ? "送信を許可すると、テストファイルは対象サイトへ送られます。ファイルを選ぶだけでは送りません。"
                      : "Submit upload sends the test file to the target website. Selecting the file does not send it."}
                  </p>
                  {step.upload_submit ? (
                    <input
                      value={step.confirm_selector || ""}
                      placeholder={locale === "ja" ? "送信ボタンのセレクタ" : "Submit button selector"}
                      onChange={(event) => updateStep(index, { confirm_selector: event.target.value })}
                      className="min-w-36 flex-1 rounded-lg border border-border bg-surface px-2 py-2 text-xs text-ink"
                    />
                  ) : null}
                </div>
              ) : null}
              {step.kind === "click" || isJourneyPurposeKind(step.kind) ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {step.kind === "language_switch" ? (
                    <input
                      value={step.expect_lang}
                      placeholder={locale === "ja" ? "期待する lang（en）" : "Expected lang (en)"}
                      onChange={(event) => updateStep(index, { expect_lang: event.target.value })}
                      className="min-w-36 flex-1 rounded-lg border border-border bg-surface px-2 py-2 text-xs text-ink"
                    />
                  ) : null}
                  <input
                    value={step.expect_selector}
                    placeholder={step.kind === "currency_switch"
                      ? (locale === "ja" ? "価格のセレクタ" : "Price selector")
                      : step.kind === "language_switch"
                        ? (locale === "ja" ? "見出しのセレクタ" : "Heading selector")
                        : "expected selector"}
                    onChange={(event) => updateStep(index, { expect_selector: event.target.value })}
                    className="min-w-36 flex-1 rounded-lg border border-border bg-surface px-2 py-2 text-xs text-ink"
                  />
                  <input
                    value={step.expect_text}
                    placeholder={step.kind === "currency_switch"
                      ? (locale === "ja" ? "切替後の価格" : "Price after switch")
                      : step.kind === "language_switch"
                        ? (locale === "ja" ? "切替後の見出し" : "Heading after switch")
                        : "expected text change"}
                    onChange={(event) => updateStep(index, { expect_text: event.target.value })}
                    className="min-w-36 flex-1 rounded-lg border border-border bg-surface px-2 py-2 text-xs text-ink"
                  />
                  <input
                    value={step.expect_url}
                    placeholder={locale === "ja" ? "最終 URL に含む文字" : "Final URL contains"}
                    onChange={(event) => updateStep(index, { expect_url: event.target.value })}
                    className="min-w-36 flex-1 rounded-lg border border-border bg-surface px-2 py-2 text-xs text-ink"
                  />
                  <label className="flex items-center gap-1 text-xs text-ink-muted">
                    <input type="checkbox" checked={step.expect_visible} onChange={(event) => updateStep(index, { expect_visible: event.target.checked })} />
                    Becomes visible
                  </label>
                  <select
                    value={step.permitted_side_effect ?? ""}
                    onChange={(event) => updateStep(index, { permitted_side_effect: (event.target.value || null) as JourneySideEffect | null })}
                    className="rounded-lg border border-border bg-surface px-2 py-2 text-xs text-ink"
                  >
                    <option value="">No side effect</option>
                    <option value="place_order">Permit place order</option>
                    <option value="payment">Permit payment</option>
                    <option value="delete">Permit delete</option>
                    <option value="external_send">Permit external send</option>
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
            onClick={() => setSteps((current) => current.length >= JOURNEY_STEP_LIMIT ? current : [...current, EMPTY_STEP(current.length + 1)])}
          >
            Add step
          </button>
          {(["login", "signup", "add_to_cart", "checkout"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-ink"
              onClick={() => setSteps((current) => current.length >= JOURNEY_STEP_LIMIT ? current : [...current, {
                ...EMPTY_STEP(current.length + 1),
                kind,
                inputs: commerceJourneyInputs(kind),
                wait_ms: 8000,
              }])}
            >
              {journeyKindLabel(kind, locale)}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs text-ink-muted">
            Test username
            <input name="testUsername" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="off" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink" placeholder={journey?.has_credentials ? "saved" : ""} />
          </label>
          <label className="grid gap-1 text-xs text-ink-muted">
            Test password
            <input name="testPassword" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink" placeholder={journey?.has_credentials ? "saved" : ""} />
          </label>
        </div>
        <p className="mt-1 text-xs text-ink-muted">Use {"{{username}}"} and {"{{password}}"} in Fill. The password is not shown again after save.</p>

        {watchAllowed && journey ? (
          <MonitoringSchedulePanel
            locale={locale}
            schedule={schedule}
            onSchedule={setSchedule}
            regionLabels={regions.filter((region) => selectedRegions.includes(region.value)).map((region) => region.label)}
            selectedRegions={selectedRegions}
            devices={devices}
            availableChecks={availableChecks}
            credentialsReady={journey.credentials_ready || Boolean(username && password)}
            startUrl={startUrl}
            steps={steps}
            runs={runs}
            nextRunAt={journey.next_run_at}
            enabled={journey.watch_enabled}
            serverPreflight={preflightNote}
            pending={monitoringPending}
            onApply={applyMonitoring}
          />
        ) : (
          <p className="mt-4 text-xs text-ink-muted">Scheduled Watch is included with Starter and Pro. You can still run this Journey now.</p>
        )}

        {error ? <p className="mt-3 text-xs font-medium text-red-700" role="alert">{monitoringErrorText(error, locale)}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" disabled={pending} className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-surface disabled:opacity-60">
            {pending ? "Saving…" : "Save Journey"}
          </button>
          {journey ? (
            <button type="button" disabled={pending} onClick={runNow} className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-ink disabled:opacity-60">
              {pending ? "Running…" : "Run now"}
            </button>
          ) : null}
          {journey ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                start(async () => {
                  const result = await deleteJourneyAction(journey.id);
                  if (result.ok) router.push("/dashboard/journeys");
                  else setError(result.error);
                });
              }}
              className="rounded-full border border-border px-4 py-2 text-xs text-ink-muted"
            >
              Delete
            </button>
          ) : null}
        </div>
      </form>

      {runs.length ? (
        <section className="rounded-xl border border-border bg-surface-elevated p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-ink">Runs</h2>
          <p className="mt-1 text-xs text-ink-muted">Journey × Region × Environment × Run. Each row is one execution.</p>
          <div className="mt-4">
            <RegionEnvironmentMatrixView matrix={regionMatrix} />
          </div>
          <div className="mt-4">
            <JourneyRunsTable
              runs={runs}
              steps={journey?.steps ?? []}
              regions={regions}
              startUrl={journey?.start_url || startUrl}
              locale={locale}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function monitoringErrorText(error: string, locale: Locale): string {
  const ja = locale === "ja";
  if (error === "invalid_url") return ja ? "URLを https://viewtrace.net のように入力してください。" : "Enter a full URL, such as https://viewtrace.net";
  if (error === "outcome_required") return ja ? "Login、Checkout、言語、通貨、地域、アップロードの送信とドロップには、成立したことを確認する条件を指定してください。Download はファイル応答を待ちます。" : "Login, Checkout, language, currency, region, and an upload submit or drop need a condition that proves the step worked. Download waits for the file response.";
  if (error === "selector_required") return ja ? "この手順にはセレクタが必要です。" : "This step needs a selector.";
  if (error === "value_required") return ja ? "この手順には値が必要です。" : "This step needs a value.";
  if (error === "attribute_required") return ja ? "属性名を指定してください。" : "This step needs an attribute name.";
  if (error === "key_not_allowed") return ja ? "送れるキーは Enter、Escape、Tab、矢印、Space、Backspace です。" : "The recorded keys are Enter, Escape, Tab, the arrows, Space, and Backspace.";
  if (error === "upload_file_required") return ja ? "送信するにはテストファイルを指定してください。" : "Submit upload needs a test file.";
  if (error === "upload_confirm_required") return ja ? "送信ボタンのセレクタを指定してください。" : "Submit upload needs the submit button selector.";
  if (error === "preflight") return ja ? "監視をオンにする条件が揃っていません。" : "Monitoring preflight did not pass.";
  if (error === "test_run") return ja ? "テストRunは保存されましたが、成功していないため監視はオンにしていません。" : "The test run was saved. Monitoring stays off because it did not pass.";
  if (error === "plan") return ja ? "定期監視は Starter と Pro に含まれます。" : "Scheduled monitoring is included with Starter and Pro.";
  if (error === "quota") return ja ? "今月の残量が、この実行全体に足りません。" : "Monthly capacity is short for this whole run.";
  return error;
}

function MonitoringSchedulePanel({
  locale,
  schedule,
  onSchedule,
  regionLabels,
  selectedRegions,
  devices,
  availableChecks,
  credentialsReady,
  startUrl,
  steps,
  runs,
  nextRunAt,
  enabled,
  serverPreflight,
  pending,
  onApply,
}: {
  locale: Locale;
  schedule: "off" | "daily" | "weekly";
  onSchedule: (value: "off" | "daily" | "weekly") => void;
  regionLabels: string[];
  selectedRegions: string[];
  devices: JourneyDeviceClass[];
  availableChecks: number | null;
  credentialsReady: boolean;
  startUrl: string;
  steps: JourneyStepDefinition[];
  runs: JourneyRunPublic[];
  nextRunAt: string | null;
  enabled: boolean;
  serverPreflight: MonitoringPreflight | null;
  pending: boolean;
  onApply: () => void;
}) {
  const ja = locale === "ja";
  const checks = journeyMonitoringChecks(selectedRegions, devices);
  const preview = evaluateMonitoringPreflight({
    startUrl,
    steps,
    regions: selectedRegions,
    environments: devices,
    credentialsAvailable: credentialsReady,
    availableChecks,
    runs,
  });
  const shown = serverPreflight ?? preview;
  const lines = [
    [shown.urlValid, ja ? "URLは有効" : "URL valid"],
    [shown.definitionValid, ja ? "Journey定義は有効" : "Journey definition valid"],
    [shown.credentialsAvailable, ja ? "必要な認証情報がある" : "Required credentials available"],
    [shown.capacityAvailable, ja ? "月間の残量がある" : "Monthly capacity available"],
    [shown.testRunPassed, ja ? "テストRunが成功している" : "Test run passed"],
  ] as const;
  const nextLabel = enabled && nextRunAt
    ? new Date(nextRunAt).toLocaleString(ja ? "ja-JP" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;
  return (
    <fieldset className="mt-4 rounded-lg border border-border p-3">
      <legend className="px-1 text-xs font-semibold text-ink">{ja ? "Journeyの監視" : "Journey Monitoring"}</legend>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink">
        {(["off", "daily", "weekly"] as const).map((value) => (
          <label key={value} className="flex items-center gap-1">
            <input type="radio" name="monitoring-schedule" checked={schedule === value} onChange={() => onSchedule(value)} />
            {value === "off" ? "Off" : value === "daily" ? (ja ? "毎日" : "Daily") : (ja ? "毎週" : "Weekly")}
          </label>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-muted">
        {ja ? "地域" : "Regions"} {regionLabels.length ? regionLabels.join(", ") : "—"}
      </p>
      <p className="mt-1 text-xs text-ink-muted">
        {ja ? "環境" : "Environments"} {devices.map((device) => (device === "mobile" ? (ja ? "モバイル" : "Mobile") : (ja ? "デスクトップ" : "Desktop"))).join(", ") || "—"}
      </p>
      <p className="mt-1 text-xs text-ink">{checks} {ja ? "checks / 回" : "checks per run"}</p>
      {nextLabel ? <p className="mt-1 text-xs text-ink-muted">{ja ? "次回" : "Next run"} {nextLabel}</p> : null}
      <ul className="mt-3 space-y-1 text-xs text-ink">
        {lines.map(([ok, label]) => (
          <li key={label}>{ok ? "✓" : "·"} {label}</li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-ink-muted">
        {ja
          ? "成功したRunがまだ無いときは、有効化の前に 1地域 × 1環境のテストを保存します。残量が実行全体に足りないときは、何も実行しません。"
          : "If no successful run is saved yet, enabling runs and saves one region and one environment first. If capacity is short for the whole schedule, nothing runs."}
      </p>
      <button type="button" disabled={pending || !journeyReady(schedule, enabled)} onClick={onApply} className="mt-3 rounded-full border border-border px-4 py-2 text-xs font-semibold text-ink disabled:opacity-60">
        {pending ? (ja ? "確認しています…" : "Checking…") : schedule === "off" ? (ja ? "監視を停止" : "Stop monitoring") : (ja ? "監視を有効にする" : "Enable monitoring")}
      </button>
    </fieldset>
  );
}

function journeyReady(schedule: "off" | "daily" | "weekly", enabled: boolean): boolean {
  if (schedule === "off") return enabled;
  return true;
}
