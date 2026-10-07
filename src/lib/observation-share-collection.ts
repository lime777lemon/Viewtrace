import type { Observation } from "@/lib/demo/observations";
import {
  previousObservationForCompare,
  sameObservationUrlIdentity,
  screenshotCompareField,
  type ObservationCompareField,
} from "@/lib/observation-compare";
import {
  mapObservationRowToPublicVerify,
  PUBLIC_OBSERVATION_ROW_SELECT,
  retentionDaysForOwner,
  type PublicVerifyObservation,
} from "@/lib/observation-public-verify";
import {
  generateObservationVerifyToken,
  sanitizeVerifyTokenParam,
} from "@/lib/observation-verify-token";
import { getAppOriginForEmailLinks } from "@/lib/site";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SHARE_COLLECTION_MAX_ITEMS,
  SHARE_COLLECTION_MAX_PER_USER,
  SHARE_COLLECTION_MIN_ITEMS,
  type OwnerShareCollectionSummary,
} from "@/lib/observation-share-collection-shared";

export {
  SHARE_COLLECTION_MAX_ITEMS,
  SHARE_COLLECTION_MAX_PER_USER,
  SHARE_COLLECTION_MIN_ITEMS,
  type OwnerShareCollectionSummary,
} from "@/lib/observation-share-collection-shared";

export type PublicShareCollectionItem = PublicVerifyObservation & {
  screenshotCompare: ObservationCompareField | null;
};

export type PublicShareCollection = {
  token: string;
  createdAt: string;
  items: PublicShareCollectionItem[];
};

export function buildPublicShareCollectionUrl(token: string): string {
  const origin = getAppOriginForEmailLinks().replace(/\/+$/, "");
  return `${origin}/share/${token}`;
}

export function publicVerifyToCompareObservation(obs: PublicVerifyObservation): Observation {
  return {
    id: obs.id,
    url: obs.url,
    regionValue: obs.regionValue,
    regionLabel: obs.regionLabel,
    capturedAt: obs.capturedAt,
    status: obs.status,
    snapshotImageUrl: obs.snapshotImageUrl,
    snapshotSha256: obs.snapshotSha256,
    snapshotPhash: obs.snapshotPhash,
    snapshotPurgedAt: obs.snapshotPurgedAt,
    captureConditions: obs.captureConditions,
  };
}

export function screenshotCompareInShareCollection(
  current: PublicVerifyObservation,
  items: PublicVerifyObservation[],
): ObservationCompareField | null {
  const asObs = items.map(publicVerifyToCompareObservation);
  const currentObs = publicVerifyToCompareObservation(current);
  const siblings = asObs.filter((row) => sameObservationUrlIdentity(row.url, currentObs.url));
  const previous = previousObservationForCompare(currentObs, siblings);
  if (!previous) return null;
  return screenshotCompareField(previous, currentObs);
}

export async function fetchShareCollectionForPublic(
  tokenRaw: string,
): Promise<PublicShareCollection | null> {
  const token = sanitizeVerifyTokenParam(tokenRaw);
  if (!token) return null;

  const admin = createSupabaseAdminClient();
  if (!admin) return null;

  const { data: collection, error: collectionError } = await admin
    .from("observation_share_collections")
    .select("id,user_id,token,created_at")
    .eq("token", token)
    .maybeSingle();

  if (collectionError || !collection) return null;

  const ownerUserId = typeof collection.user_id === "string" ? collection.user_id : "";
  if (!ownerUserId) return null;

  const { data: itemRows, error: itemsError } = await admin
    .from("observation_share_collection_items")
    .select("observation_id,sort_order")
    .eq("collection_id", collection.id);

  if (itemsError || !itemRows?.length) return null;

  const observationIds = itemRows
    .map((row) => (typeof row.observation_id === "string" ? row.observation_id : ""))
    .filter(Boolean);
  if (observationIds.length === 0) return null;

  const { data: observationRows, error: obsError } = await admin
    .from("observations")
    .select(PUBLIC_OBSERVATION_ROW_SELECT)
    .eq("user_id", ownerUserId)
    .in("id", observationIds);

  if (obsError || !observationRows?.length) return null;

  const retentionDays = await retentionDaysForOwner(admin, ownerUserId);
  const byId = new Map<string, PublicVerifyObservation>();
  for (const row of observationRows) {
    const mapped = mapObservationRowToPublicVerify(row as Record<string, unknown>, retentionDays);
    const { ownerUserId: _ignoredOwner, ...publicRow } = mapped;
    void _ignoredOwner;
    byId.set(publicRow.id, { ...publicRow, aiAudit: null });
  }

  const items = itemRows
    .map((row) => {
      const id = typeof row.observation_id === "string" ? row.observation_id : "";
      return byId.get(id) ?? null;
    })
    .filter((row): row is PublicVerifyObservation => row != null)
    .sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt));

  if (items.length === 0) return null;

  return {
    token: typeof collection.token === "string" ? collection.token : token,
    createdAt: typeof collection.created_at === "string" ? collection.created_at : "",
    items: items.map((item) => ({
      ...item,
      screenshotCompare: screenshotCompareInShareCollection(item, items),
    })),
  };
}

export async function listShareCollectionsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<OwnerShareCollectionSummary[]> {
  const { data: collections, error } = await supabase
    .from("observation_share_collections")
    .select("id,token,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(SHARE_COLLECTION_MAX_PER_USER);

  if (error || !collections?.length) return [];

  const ids = collections.map((row) => String(row.id));
  const { data: itemRows } = await supabase
    .from("observation_share_collection_items")
    .select("collection_id")
    .in("collection_id", ids);

  const counts = new Map<string, number>();
  for (const row of itemRows ?? []) {
    const id = typeof row.collection_id === "string" ? row.collection_id : "";
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return collections
    .map((row) => {
      const id = String(row.id);
      const token = typeof row.token === "string" ? row.token.toLowerCase() : "";
      if (token.length !== 48) return null;
      return {
        id,
        token,
        createdAt: typeof row.created_at === "string" ? row.created_at : "",
        itemCount: counts.get(id) ?? 0,
      };
    })
    .filter((row): row is OwnerShareCollectionSummary => row != null);
}

export async function createShareCollectionForUser(
  supabase: SupabaseClient,
  userId: string,
  observationIds: string[],
): Promise<{ token: string } | { error: "need_two" | "too_many" | "limit" | "not_found" | "failed" }> {
  const uniqueIds = [...new Set(observationIds)];
  if (uniqueIds.length < SHARE_COLLECTION_MIN_ITEMS) return { error: "need_two" };
  if (uniqueIds.length > SHARE_COLLECTION_MAX_ITEMS) return { error: "too_many" };

  const { count: existingCount, error: countError } = await supabase
    .from("observation_share_collections")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countError) return { error: "failed" };
  if ((existingCount ?? 0) >= SHARE_COLLECTION_MAX_PER_USER) return { error: "limit" };

  const { data: owned, error: ownedError } = await supabase
    .from("observations")
    .select("id,captured_at")
    .eq("user_id", userId)
    .in("id", uniqueIds);

  if (ownedError || !owned || owned.length !== uniqueIds.length) return { error: "not_found" };

  const orderByCaptured = owned
    .slice()
    .sort(
      (a, b) =>
        Date.parse(typeof a.captured_at === "string" ? a.captured_at : "") -
        Date.parse(typeof b.captured_at === "string" ? b.captured_at : ""),
    );

  const token = generateObservationVerifyToken();
  const { data: collection, error: insertError } = await supabase
    .from("observation_share_collections")
    .insert({ user_id: userId, token })
    .select("id")
    .maybeSingle();

  if (insertError || !collection?.id) return { error: "failed" };

  const items = orderByCaptured.map((row, index) => ({
    collection_id: collection.id,
    observation_id: row.id,
    sort_order: index,
  }));

  const { error: itemsError } = await supabase.from("observation_share_collection_items").insert(items);
  if (itemsError) {
    await supabase.from("observation_share_collections").delete().eq("id", collection.id).eq("user_id", userId);
    return { error: "failed" };
  }

  return { token };
}
