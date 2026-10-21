import type { DiscoveryTransitionV1 } from "@/lib/observation-behavior-discovery";
import {
  journeySideEffect,
  type JourneySideEffect,
  type JourneyStepDefinition,
} from "@/lib/journey-definition";

export type DiscoveryJourneyCandidate = {
  id: string;
  selector: string;
  label: string;
  sideEffect: JourneySideEffect | null;
  expect_selector: string;
  expect_visible: boolean;
};

const APPEARANCE = /hidden|visibility|display|aria-expanded|aria-selected/i;

function usableSelector(selector: string): boolean {
  return selector.length > 1 && /[#.[\]]/.test(selector);
}

function blankStep(id: string, kind: JourneyStepDefinition["kind"]): JourneyStepDefinition {
  return {
    id,
    kind,
    selector: "",
    value: "",
    url: "",
    wait_ms: 1000,
    permitted_side_effect: null,
    expect_selector: "",
    expect_text: "",
    expect_visible: false,
    expect_url: "",
  };
}

/** Measured transitions first, then controls Discovery refused to execute. No side-effect permission is granted. */
export function discoveryJourneyCandidates(input: {
  transitions: DiscoveryTransitionV1[] | null;
  blocked: Array<{ selector: string; text: string }>;
}): DiscoveryJourneyCandidate[] {
  const out: DiscoveryJourneyCandidate[] = [];
  const seen = new Set<string>();
  for (const row of input.transitions ?? []) {
    if (row.frame_path.length || row.shadow_path.length || !usableSelector(row.selector) || seen.has(row.selector)) continue;
    seen.add(row.selector);
    const revealed = row.rendered.find(
      (item) => !item.frame_path.length && !item.shadow_path.length && usableSelector(item.selector) && APPEARANCE.test(item.changes.join(" ")),
    );
    out.push({
      id: `t${out.length + 1}`,
      selector: row.selector,
      label: row.selector,
      sideEffect: null,
      expect_selector: revealed?.selector ?? "",
      expect_visible: Boolean(revealed),
    });
  }
  for (const row of input.blocked) {
    if (!usableSelector(row.selector) || seen.has(row.selector)) continue;
    seen.add(row.selector);
    out.push({
      id: `b${out.length + 1}`,
      selector: row.selector,
      label: row.text || row.selector,
      sideEffect: journeySideEffect(row.text),
      expect_selector: "",
      expect_visible: false,
    });
  }
  return out.slice(0, 7);
}

export function journeyStepsFromCandidates(startUrl: string, candidates: DiscoveryJourneyCandidate[]): JourneyStepDefinition[] {
  const steps = [blankStep("open", "open_url")];
  steps[0] = { ...steps[0]!, url: startUrl };
  for (const candidate of candidates) {
    if (steps.length >= 8) break;
    steps.push({
      ...blankStep(candidate.id, "click"),
      selector: candidate.selector,
      expect_selector: candidate.expect_selector,
      expect_visible: candidate.expect_visible,
    });
  }
  return steps;
}
