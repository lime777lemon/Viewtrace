/** Pass gates. A gate runs only when the step gives it an expected value. */
export const JOURNEY_PASS_VERIFIERS = [
  "url",
  "visible_text",
  "element_state",
  "html_lang",
  "currency_display",
  "download",
] as const;

/** Recorded on every step. They do not set Passed by themselves. */
export const JOURNEY_RECORD_VERIFIERS = ["network", "runtime", "dom"] as const;

export type JourneyPassVerifier = (typeof JOURNEY_PASS_VERIFIERS)[number];
export type JourneyRecordVerifier = (typeof JOURNEY_RECORD_VERIFIERS)[number];
export type JourneyVerifierAction = "click" | "click_or_select";

export type JourneyVerifierRecipe = {
  action: JourneyVerifierAction;
  pass: JourneyPassVerifier[];
  record: JourneyRecordVerifier[];
};

/** Named journey types are recipes. The UI keeps the names. */
export const JOURNEY_RECIPES: Record<string, JourneyVerifierRecipe> = {
  language_switch: {
    action: "click_or_select",
    pass: ["html_lang", "visible_text", "url"],
    record: ["network", "runtime", "dom"],
  },
  currency_switch: {
    action: "click_or_select",
    pass: ["currency_display", "visible_text"],
    record: ["network", "runtime", "dom"],
  },
  region_switch: {
    action: "click_or_select",
    pass: ["element_state", "visible_text", "url"],
    record: ["network", "runtime", "dom"],
  },
  download: {
    action: "click",
    pass: ["download"],
    record: ["network", "runtime", "dom"],
  },
};

export function journeyRecipe(kind: string): JourneyVerifierRecipe | null {
  return JOURNEY_RECIPES[kind] ?? null;
}

function gateProvided(step: { expect_lang?: string; expect_text: string; expect_url: string; value: string }, gate: JourneyPassVerifier): boolean {
  if (gate === "html_lang") return Boolean(step.expect_lang?.trim());
  if (gate === "visible_text" || gate === "currency_display") return Boolean(step.expect_text.trim());
  if (gate === "url") return Boolean(step.expect_url.trim());
  if (gate === "element_state") return Boolean(step.value.trim());
  if (gate === "download") return true;
  return false;
}

/** A recipe is ready when at least one of its pass gates has an expected value. */
export function journeyRecipeReady(step: { kind: string; expect_lang?: string; expect_text: string; expect_url: string; value: string }): boolean {
  const recipe = journeyRecipe(step.kind);
  if (!recipe) return false;
  return recipe.pass.some((gate) => gateProvided(step, gate));
}
