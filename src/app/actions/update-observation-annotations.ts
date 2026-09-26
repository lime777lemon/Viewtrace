"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import type { ObservationReviewStatus } from "@/lib/demo/observations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyTagsToSameUrlObservations } from "@/lib/observation-url-tags";
import { sanitizeObservationRouteId } from "@/lib/observation-route-id";

const REVIEW_STATUSES = new Set<ObservationReviewStatus>([
  "open",
  "reviewed",
  "archived",
  "flagged",
]);

export type UpdateObservationAnnotationsInput = {
  note?: string;
  tags?: string[];
  /** union: 追加分を同じ URL の全記録へ。replace: その URL のタグ一覧を上書き */
  tagsMode?: "union" | "replace";
  folder?: string;
  reviewStatus?: ObservationReviewStatus | "";
};

export async function updateObservationAnnotationsAction(
  observationIdRaw: string,
  input: UpdateObservationAnnotationsInput,
): Promise<{ ok: true } | { ok: false; error: "unauthorized" | "invalid_id" | "not_found" | "save_failed" }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };

  const observationId = sanitizeObservationRouteId(observationIdRaw);
  if (!observationId) return { ok: false, error: "invalid_id" };

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.note !== undefined) {
    patch.note = input.note.trim().slice(0, 500) || null;
  }
  if (input.folder !== undefined) {
    const folder = input.folder.trim().slice(0, 120);
    patch.folder = folder || null;
  }
  if (input.reviewStatus !== undefined) {
    if (input.reviewStatus === "") {
      patch.review_status = null;
    } else if (REVIEW_STATUSES.has(input.reviewStatus)) {
      patch.review_status = input.reviewStatus;
    }
  }

  const supabase = await createSupabaseServerClient();
  const { data: source, error: sourceErr } = await supabase
    .from("observations")
    .select("id, url")
    .eq("id", observationId)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (sourceErr) {
    console.warn("[observation-annotations] load failed", sourceErr.code, sourceErr.message);
    return { ok: false, error: "save_failed" };
  }
  if (!source) return { ok: false, error: "not_found" };

  if (input.tags !== undefined) {
    const applied = await applyTagsToSameUrlObservations(supabase, {
      userId: session.userId,
      sourceUrl: typeof source.url === "string" ? source.url : "",
      tags: input.tags,
      mode: input.tagsMode ?? "union",
    });
    if (!applied.ok) return { ok: false, error: "save_failed" };
  }

  const { data, error } = await supabase
    .from("observations")
    .update(patch)
    .eq("id", observationId)
    .eq("user_id", session.userId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.warn("[observation-annotations] update failed", error.code, error.message);
    return { ok: false, error: "save_failed" };
  }
  if (!data) return { ok: false, error: "not_found" };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/observations");
  revalidatePath(`/dashboard/observations/${observationId}`);
  revalidatePath(`/dashboard/observations/${observationId}/report`);
  return { ok: true };
}
