"use server";

import { isObservationUuid } from "@/lib/observation-route-id";
import { getSession } from "@/lib/auth/session";
import {
  createShareCollectionForUser,
  SHARE_COLLECTION_MAX_ITEMS,
  SHARE_COLLECTION_MIN_ITEMS,
} from "@/lib/observation-share-collection";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CreateShareCollectionResult =
  | { ok: true; token: string }
  | { ok: false; error: "auth" | "need_two" | "too_many" | "limit" | "not_found" | "failed" };

export async function createShareCollectionAction(
  observationIds: string[],
): Promise<CreateShareCollectionResult> {
  const session = await getSession();
  if (!session?.userId) return { ok: false, error: "auth" };

  const ids = observationIds.filter((id) => isObservationUuid(id));
  if (ids.length < SHARE_COLLECTION_MIN_ITEMS) return { ok: false, error: "need_two" };
  if (ids.length > SHARE_COLLECTION_MAX_ITEMS) return { ok: false, error: "too_many" };

  const supabase = await createSupabaseServerClient();
  const result = await createShareCollectionForUser(supabase, session.userId, ids);
  if ("error" in result) return { ok: false, error: result.error };
  return { ok: true, token: result.token };
}

export async function revokeShareCollectionAction(
  collectionId: string,
): Promise<{ ok: true } | { ok: false; error: "auth" | "failed" }> {
  const session = await getSession();
  if (!session?.userId) return { ok: false, error: "auth" };
  if (!isObservationUuid(collectionId)) return { ok: false, error: "failed" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("observation_share_collections")
    .delete()
    .eq("id", collectionId)
    .eq("user_id", session.userId);

  if (error) return { ok: false, error: "failed" };
  return { ok: true };
}
