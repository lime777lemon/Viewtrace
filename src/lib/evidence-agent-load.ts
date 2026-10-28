import type { SupabaseClient } from "@supabase/supabase-js";
import { loadObservationScrollInteractionsByIds } from "@/lib/observation-optional-metrics-store";
import type { RegionalInteractionCheckV1 } from "@/lib/observation-regional-interaction";

export async function loadInteractionChecks(
  supabase: SupabaseClient,
  userId: string,
  observationIds: string[],
): Promise<Map<string, RegionalInteractionCheckV1>> {
  const out = new Map<string, RegionalInteractionCheckV1>();
  const ids = [...new Set(observationIds.filter(Boolean))].slice(0, 80);
  for (let index = 0; index < ids.length; index += 12) {
    const part = await loadObservationScrollInteractionsByIds(supabase, userId, ids.slice(index, index + 12));
    for (const [id, check] of part) out.set(id, check);
  }
  return out;
}
