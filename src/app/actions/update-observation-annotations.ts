"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import type { ObservationReviewStatus } from "@/lib/demo/observations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
  folder?: string;
  reviewStatus?: ObservationReviewStatus | "";
};

function normalizeTags(raw: string[] | undefined): string[] {
  if (!raw?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw) {
    const v = t.trim().slice(0, 32);
    if (!v || seen.has(v.toLowerCase())) continue;
    seen.add(v.toLowerCase());
    out.push(v);
    if (out.length >= 12) break;
  }
  return out;
}

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
  if (input.tags !== undefined) {
    patch.tags = normalizeTags(input.tags);
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

  revalidatePath(`/dashboard/observations/${observationId}`);
  revalidatePath(`/dashboard/observations/${observationId}/report`);
  return { ok: true };
}
