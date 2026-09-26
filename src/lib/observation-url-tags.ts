import type { SupabaseClient } from "@supabase/supabase-js";
import { canonicalObservationUrl, normalizeObservationTags } from "@/lib/observation-tags";

type ObservationTagRow = {
  id: string;
  url: string;
  tags: unknown;
};

function tagsFromRow(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((t): t is string => typeof t === "string");
}

export async function applyTagsToSameUrlObservations(
  supabase: SupabaseClient,
  input: {
    userId: string;
    sourceUrl: string;
    tags: string[];
    mode: "union" | "replace";
  },
): Promise<{ ok: true; ids: string[] } | { ok: false }> {
  const { data, error } = await supabase
    .from("observations")
    .select("id, url, tags")
    .eq("user_id", input.userId);

  if (error) {
    console.warn("[observation-url-tags] list failed", error.code, error.message);
    return { ok: false };
  }

  const key = canonicalObservationUrl(input.sourceUrl);
  const targets = ((data ?? []) as ObservationTagRow[]).filter(
    (row) => canonicalObservationUrl(row.url) === key,
  );
  if (targets.length === 0) return { ok: true, ids: [] };

  const next =
    input.mode === "replace"
      ? normalizeObservationTags(input.tags)
      : normalizeObservationTags([
          ...targets.flatMap((row) => tagsFromRow(row.tags)),
          ...input.tags,
        ]);

  const ids = targets.map((row) => row.id);
  const { error: updErr } = await supabase
    .from("observations")
    .update({ tags: next, updated_at: new Date().toISOString() })
    .in("id", ids)
    .eq("user_id", input.userId);

  if (updErr) {
    console.warn("[observation-url-tags] update failed", updErr.code, updErr.message);
    return { ok: false };
  }
  return { ok: true, ids };
}

export async function inheritedTagsForUrl(
  supabase: SupabaseClient,
  userId: string,
  url: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("observations")
    .select("url, tags, captured_at")
    .eq("user_id", userId)
    .order("captured_at", { ascending: false })
    .limit(200);

  if (error || !data) return [];
  const key = canonicalObservationUrl(url);
  const match = data.find((row) => canonicalObservationUrl(String(row.url ?? "")) === key);
  return normalizeObservationTags(tagsFromRow(match?.tags));
}
