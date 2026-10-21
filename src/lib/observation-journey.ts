import type { Observation } from "@/lib/demo/observations";
import type { SyntheticInteractionV1 } from "@/lib/observation-synthetic-interaction";

export type JourneyStepStatus = "pass" | "fail" | "not_run";

export type JourneyStep = {
  key: string;
  label: string;
  status: JourneyStepStatus;
  latencyMs: number | null;
  detail: string | null;
};

export type JourneyOverall = "pass" | "fail" | "not_run";

export type JourneyRun = {
  overall: JourneyOverall;
  durationMs: number | null;
  steps: JourneyStep[];
};

export const JOURNEY_OPEN_KEY = "open";

function clickKey(kind: string, label: string, index: number): string {
  const slug = label.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 40);
  return `click:${kind}:${slug || String(index)}`;
}

export function buildJourneyRun(input: {
  observationStatus: Observation["status"];
  synthetic: SyntheticInteractionV1 | null | undefined;
}): JourneyRun {
  const openPass = input.observationStatus === "success";
  const open: JourneyStep = {
    key: JOURNEY_OPEN_KEY,
    label: "Open page",
    status: openPass ? "pass" : input.observationStatus === "failure" ? "fail" : "not_run",
    latencyMs: null,
    detail: null,
  };

  const synthetic = input.synthetic;
  if (!synthetic) {
    return {
      overall: open.status === "fail" ? "fail" : "not_run",
      durationMs: null,
      steps: [open],
    };
  }

  const clicks: JourneyStep[] = synthetic.interactions.map((row, index) => ({
    key: clickKey(row.kind, row.label, index),
    label: row.label,
    status: row.error ? "fail" : "pass",
    latencyMs: row.latency_ms,
    detail: row.error,
  }));

  const steps = [open, ...clicks];
  const anyFail = steps.some((step) => step.status === "fail") || synthetic.error === "failed";
  return {
    overall: anyFail ? "fail" : "pass",
    durationMs: synthetic.duration_ms,
    steps,
  };
}

export type JourneyRegionColumn = {
  observationId: string;
  regionLabel: string;
  run: JourneyRun;
};

export type JourneyCompareRow = {
  key: string;
  label: string;
  cells: Array<{ status: JourneyStepStatus; latencyMs: number | null }>;
};

export function buildJourneyCompareRows(columns: JourneyRegionColumn[]): JourneyCompareRow[] {
  if (columns.length === 0) return [];
  const order: string[] = [];
  const labels = new Map<string, string>();
  for (const col of columns) {
    for (const step of col.run.steps) {
      if (!labels.has(step.key)) {
        order.push(step.key);
        labels.set(step.key, step.label);
      }
    }
  }
  return order.map((key) => ({
    key,
    label: labels.get(key) ?? key,
    cells: columns.map((col) => {
      const step = col.run.steps.find((row) => row.key === key);
      return {
        status: step?.status ?? "not_run",
        latencyMs: step?.latencyMs ?? null,
      };
    }),
  }));
}

export function formatJourneyDurationSec(durationMs: number | null): string | null {
  if (durationMs == null || !Number.isFinite(durationMs) || durationMs < 0) return null;
  return `${(durationMs / 1000).toFixed(1)} sec`;
}
