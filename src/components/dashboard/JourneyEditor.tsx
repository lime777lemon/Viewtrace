"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { deleteJourneyAction, runJourneyNowAction, saveJourneyAction } from "@/app/actions/journeys";
import {
  JOURNEY_STEP_KINDS,
  journeyCaptureLine,
  journeyStatusLabel,
  journeyStepReport,
  resolveJourneyOpenUrl,
  resolveJourneySteps,
  type JourneyDeviceClass,
  type JourneySideEffect,
  type JourneyStepDefinition,
  type JourneyStepKind,
} from "@/lib/journey-definition";
import type { Locale } from "@/lib/i18n";
import type { JourneyDefinitionPublic, JourneyRunPublic } from "@/lib/journey-store";

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
});

export function JourneyEditor({
  journey,
  regions,
  watchAllowed,
  runs,
  locale = "en",
}: {
  journey: JourneyDefinitionPublic | null;
  regions: RegionChoice[];
  watchAllowed: boolean;
  runs: JourneyRunPublic[];
  locale?: Locale;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(journey?.name ?? "");
  const [startUrl, setStartUrl] = useState(journey?.start_url ?? "https://");
  const [steps, setSteps] = useState<JourneyStepDefinition[]>(() => {
    const raw = journey?.steps.length ? journey.steps : [EMPTY_STEP(1)];
    return journey ? resolveJourneySteps(journey.start_url, raw) : raw;
  });
  const [selectedRegions, setSelectedRegions] = useState<string[]>(journey?.regions.length ? journey.regions : ["US-CA"]);
  const [devices, setDevices] = useState<JourneyDeviceClass[]>(journey?.device_classes.length ? journey.device_classes : ["desktop"]);
  const [watchEnabled, setWatchEnabled] = useState(journey?.watch_enabled ?? false);
  const [watchFrequency, setWatchFrequency] = useState<"daily" | "weekly">(journey?.watch_frequency ?? "daily");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

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
        watchEnabled,
        watchFrequency,
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
          Discovery stays automatic. A Journey runs the steps you define, in each selected region and environment.
          Place order, payment, delete, and external send stay blocked unless that step is explicitly permitted.
        </p>
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-xs text-ink-muted">
            Name
            <input name="journeyName" value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink" />
          </label>
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
                  onChange={(event) => updateStep(index, { kind: event.target.value as JourneyStepKind })}
                  className="rounded-lg border border-border bg-surface px-2 py-2 text-xs text-ink"
                >
                  {JOURNEY_STEP_KINDS.map((kind) => (
                    <option key={kind} value={kind}>{kind}</option>
                  ))}
                </select>
                {step.kind !== "wait" && step.kind !== "open_url" && step.kind !== "assert_url" ? (
                  <input
                    value={step.selector}
                    placeholder="selector"
                    onChange={(event) => updateStep(index, { selector: event.target.value })}
                    className="min-w-40 flex-1 rounded-lg border border-border bg-surface px-2 py-2 text-xs text-ink"
                  />
                ) : null}
                {step.kind === "open_url" || step.kind === "assert_url" ? (
                  <input
                    name={step.kind === "open_url" ? `step-${index}-url` : undefined}
                    value={step.kind === "open_url" ? step.url : step.value}
                    placeholder={step.kind === "open_url" ? "https://…" : "url contains"}
                    onChange={(event) => updateStep(index, step.kind === "open_url" ? { url: event.target.value } : { value: event.target.value })}
                    onBlur={step.kind === "open_url" ? () => {
                      const resolved = resolveJourneyOpenUrl(fieldValue("startUrl", startUrl), fieldValue(`step-${index}-url`, step.url));
                      if (resolved) updateStep(index, { url: resolved });
                    } : undefined}
                    autoComplete={step.kind === "open_url" ? "url" : "off"}
                    className="min-w-40 flex-1 rounded-lg border border-border bg-surface px-2 py-2 text-xs text-ink"
                  />
                ) : null}
                {step.kind === "fill" || step.kind === "select" || step.kind === "assert_text" ? (
                  <input
                    value={step.value}
                    placeholder={step.kind === "fill" ? "{{username}} or text" : "value"}
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
              {step.kind === "click" ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <input
                    value={step.expect_selector}
                    placeholder="expected selector"
                    onChange={(event) => updateStep(index, { expect_selector: event.target.value })}
                    className="min-w-36 flex-1 rounded-lg border border-border bg-surface px-2 py-2 text-xs text-ink"
                  />
                  <input
                    value={step.expect_text}
                    placeholder="expected text change"
                    onChange={(event) => updateStep(index, { expect_text: event.target.value })}
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
        <button
          type="button"
          className="mt-3 text-xs font-semibold text-ink"
          onClick={() => setSteps((current) => current.length >= 8 ? current : [...current, EMPTY_STEP(current.length + 1)])}
        >
          Add step
        </button>

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

        {watchAllowed ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-ink">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={watchEnabled} onChange={(event) => setWatchEnabled(event.target.checked)} />
              Run on Watch
            </label>
            <select value={watchFrequency} onChange={(event) => setWatchFrequency(event.target.value === "weekly" ? "weekly" : "daily")} className="rounded-lg border border-border bg-surface px-2 py-1">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        ) : (
          <p className="mt-4 text-xs text-ink-muted">Scheduled Watch is included with Starter and Pro. You can still run this Journey now.</p>
        )}

        {error ? <p className="mt-3 text-xs font-medium text-red-700" role="alert">{error === "invalid_url" ? "Enter a full URL, such as https://viewtrace.net" : error}</p> : null}
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
          <ul className="mt-4 space-y-4">
            {runs.map((run) => {
              const env = run.environment && typeof run.environment.viewport === "object" ? run.environment.viewport as { width?: number; height?: number } : null;
              const geo = run.environment && typeof run.environment.geo === "object" && run.environment.geo
                ? run.environment.geo as { stage?: string; requested_region?: string }
                : null;
              const captureLine = journeyCaptureLine(geo?.requested_region || run.region, geo?.stage, locale);
              const regionLabel = regions.find((item) => item.value === run.region)?.label ?? run.region;
              const deviceLabel = run.device_class === "mobile"
                ? (locale === "ja" ? "モバイル" : "Mobile")
                : (locale === "ja" ? "デスクトップ" : "Desktop");
              const statusClass = run.status === "passed"
                ? "text-emerald-800"
                : run.status === "blocked"
                  ? "text-amber-800"
                  : run.status === "failed"
                    ? "text-red-800"
                    : "text-ink";
              return (
                <li key={run.id} className="rounded-lg border border-border bg-surface p-3">
                  <p className={`text-sm font-semibold ${statusClass}`}>
                    Journey Run · {journeyStatusLabel(run.status, locale)}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {regionLabel} · {deviceLabel}
                    {env?.width && env?.height ? ` · ${env.width}×${env.height}` : ""}
                    {run.duration_ms != null ? ` · ${(run.duration_ms / 1000).toFixed(1)}s` : ""}
                  </p>
                  {captureLine ? <p className="mt-1 text-xs text-ink-muted">{captureLine}</p> : null}
                  {run.alert ? <p className="mt-1 text-xs font-medium text-red-700">Journey regression · {run.alert}</p> : null}
                  <ol className="mt-3 space-y-3">
                    {run.steps.map((step, index) => {
                      const defined = journey?.steps.find((item) => item.id === step.id) ?? journey?.steps[index] ?? null;
                      const report = journeyStepReport(step, defined, index, locale);
                      return (
                        <li key={`${run.id}-${step.id}`} className="text-xs text-ink">
                          <p className="font-semibold">{report.title}</p>
                          <dl className="mt-1 space-y-0.5 text-ink-muted">
                            {report.lines.map((line, lineIndex) => (
                              <div key={`${line.label}-${lineIndex}`} className="flex gap-2">
                                <dt className="shrink-0">{line.label}</dt>
                                <dd className="min-w-0 break-all">{line.value}</dd>
                              </div>
                            ))}
                          </dl>
                        </li>
                      );
                    })}
                  </ol>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
