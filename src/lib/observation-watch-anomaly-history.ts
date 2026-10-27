import type { SupabaseClient } from "@supabase/supabase-js";
import {
  observationUrlIdentity,
  observationUrlLookupVariants,
} from "@/lib/observation-compare";
import type { WatchMetricSample } from "@/lib/observation-watch-anomaly";
import { parseStoredScroll } from "@/lib/observation-optional-metrics-store";

const SCROLL_INTERACTION_ANALYSIS_TYPE = "scroll_interaction";

export async function loadWatchMetricHistory(
  supabase: SupabaseClient,
  input: {
    userId: string;
    url: string;
    region: string;
    beforeCapturedAt: string;
    excludeId?: string;
    limit?: number;
  },
): Promise<WatchMetricSample[]> {
  const variants = observationUrlLookupVariants(input.url);
  const identity = observationUrlIdentity(input.url);
  if (!variants.length || !input.region.trim()) return [];

  const { data, error } = await supabase
    .from("observations")
    .select("id,captured_at,url")
    .eq("user_id", input.userId)
    .in("url", variants)
    .eq("region", input.region)
    .lt("captured_at", input.beforeCapturedAt)
    .order("captured_at", { ascending: false })
    .limit(input.limit ?? 40);

  if (error || !data?.length) return [];

  const rows = data.filter((item) => {
    if (input.excludeId && item.id === input.excludeId) return false;
    const url = typeof item.url === "string" ? item.url : "";
    return identity ? observationUrlIdentity(url) === identity : url.trim() === input.url.trim();
  });

  const ids = rows.map((r) => (typeof r.id === "string" ? r.id : "")).filter(Boolean);
  if (!ids.length) return [];

  const { data: analyses, error: analysisError } = await supabase
    .from("ai_analyses")
    .select("observation_id,notes")
    .eq("user_id", input.userId)
    .eq("analysis_type", SCROLL_INTERACTION_ANALYSIS_TYPE)
    .in("observation_id", ids);

  if (analysisError || !analyses?.length) return [];

  const storedById = new Map<string, ReturnType<typeof parseStoredScroll>>();
  for (const row of analyses) {
    const id = typeof row.observation_id === "string" ? row.observation_id : "";
    if (!id) continue;
    storedById.set(id, parseStoredScroll(row.notes));
  }

  const capturedAtById = new Map(rows.map((r) => [String(r.id), String(r.captured_at)]));
  const out: WatchMetricSample[] = [];

  for (const id of [...ids].reverse()) {
    const stored = storedById.get(id);
    if (!stored || stored.billing !== "watch_included" || !stored.result) continue;
    out.push({
      measured_at: stored.result.measured_at || capturedAtById.get(id) || "",
      interaction_duration_ms: stored.result.duration_ms,
      proxy_bytes: stored.result.proxy_bytes,
    });
  }

  return out;
}
