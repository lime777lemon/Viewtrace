import { lookupIpRegion, verifiedRegionFromLookup } from "@/lib/geo-node/ip-lookup";
import { parseCountryCode, parseIpType, parseUsRegion, resolveObservedGeo } from "@/lib/geo-node/observe";
import { geoNodeAdmin, parseGeoNodeId, tableMissing } from "@/lib/geo-node/shared";

export const GEO_NODE_ONLINE_MS = 120_000;

export type GeoNodeRow = {
  id: string;
  node_id: string;
  country: string;
  region: string | null;
  city: string | null;
  ip_type: string;
  status: "online" | "offline" | "disabled";
  last_seen_at: string | null;
  observed_ip: string | null;
  observed_country: string | null;
  observed_region: string | null;
  created_at: string;
};

export function isNodeOnline(node: Pick<GeoNodeRow, "status" | "last_seen_at">, now = Date.now()): boolean {
  if (node.status === "disabled") return false;
  if (!node.last_seen_at) return false;
  return now - new Date(node.last_seen_at).getTime() <= GEO_NODE_ONLINE_MS;
}

export function nodeCanTakeJob(
  node: Pick<GeoNodeRow, "node_id" | "country" | "region">,
  job: { node_id?: string | null; requested_country?: string | null; requested_region?: string | null },
): boolean {
  if (job.node_id && job.node_id !== node.node_id) return false;
  if (job.requested_country && job.requested_country !== node.country) return false;
  if (job.requested_region && job.requested_region !== node.region) return false;
  return true;
}

async function verifyEgress(ip: string | null, cfCountry: string | null) {
  const lookup = await lookupIpRegion(ip);
  const region = verifiedRegionFromLookup(cfCountry, lookup);
  return resolveObservedGeo({ verifiedCountry: cfCountry, verifiedRegion: region });
}

export async function upsertGeoNode(input: {
  nodeId: string;
  country: string;
  region?: string | null;
  city?: string | null;
  ipType?: string | null;
  ip?: string | null;
  observedCountry?: string | null;
}): Promise<{ node: GeoNodeRow } | { error: string; status: number }> {
  const admin = geoNodeAdmin();
  if (!admin) return { error: "supabase_not_configured", status: 503 };
  const nodeId = parseGeoNodeId(input.nodeId);
  const country = parseCountryCode(input.country);
  if (!nodeId || !country) return { error: "invalid_node", status: 400 };
  const ipType = parseIpType(input.ipType) ?? "residential";
  const region = country === "US" ? parseUsRegion(input.region) : null;
  const city = input.city?.trim().slice(0, 64) || null;
  const observed = await verifyEgress(input.ip ?? null, parseCountryCode(input.observedCountry));

  const { data, error } = await admin
    .from("geo_nodes")
    .upsert(
      {
        node_id: nodeId,
        country,
        region,
        city,
        ip_type: ipType,
        status: "online",
        last_seen_at: new Date().toISOString(),
        observed_ip: input.ip ?? null,
        observed_country: observed.country,
        observed_region: observed.region,
      },
      { onConflict: "node_id" },
    )
    .select("*")
    .single();

  if (error) {
    return {
      error: tableMissing(error.message) ? "geo_nodes_missing" : error.message,
      status: 503,
    };
  }
  return { node: data as GeoNodeRow };
}

export async function heartbeatGeoNode(input: {
  nodeId: string;
  ip?: string | null;
  observedCountry?: string | null;
}): Promise<{ node: GeoNodeRow } | { error: string; status: number }> {
  const admin = geoNodeAdmin();
  if (!admin) return { error: "supabase_not_configured", status: 503 };
  const nodeId = parseGeoNodeId(input.nodeId);
  if (!nodeId) return { error: "invalid_node_id", status: 400 };
  const observed = await verifyEgress(input.ip ?? null, parseCountryCode(input.observedCountry));

  const { data, error } = await admin
    .from("geo_nodes")
    .update({
      status: "online",
      last_seen_at: new Date().toISOString(),
      observed_ip: input.ip ?? null,
      observed_country: observed.country,
      observed_region: observed.region,
    })
    .eq("node_id", nodeId)
    .neq("status", "disabled")
    .select("*")
    .maybeSingle();

  if (error) {
    return {
      error: tableMissing(error.message) ? "geo_nodes_missing" : error.message,
      status: 503,
    };
  }
  if (!data) return { error: "node_not_registered", status: 404 };
  return { node: data as GeoNodeRow };
}

export async function getGeoNode(nodeId: string): Promise<GeoNodeRow | null> {
  const admin = geoNodeAdmin();
  const safe = parseGeoNodeId(nodeId);
  if (!admin || !safe) return null;
  const { data } = await admin.from("geo_nodes").select("*").eq("node_id", safe).maybeSingle();
  return (data as GeoNodeRow | null) ?? null;
}

export async function pickNodeForRequest(input: {
  country: string | null;
  region: string | null;
  nodeId?: string | null;
}): Promise<GeoNodeRow | null> {
  const admin = geoNodeAdmin();
  if (!admin) return null;
  if (input.nodeId) {
    const exact = await getGeoNode(input.nodeId);
    return exact && exact.status !== "disabled" ? exact : null;
  }
  if (!input.country) return null;

  let q = admin.from("geo_nodes").select("*").eq("country", input.country).neq("status", "disabled");
  if (input.region) q = q.eq("region", input.region);
  else q = q.is("region", null);

  const { data, error } = await q.order("last_seen_at", { ascending: false, nullsFirst: false }).limit(8);
  if (error || !data?.length) return null;
  return (data as GeoNodeRow[]).find((n) => isNodeOnline(n)) ?? null;
}

export { parseGeoNodeId };
