import { put } from "@vercel/blob";
import { lookupIpRegion, verifiedRegionFromLookup } from "@/lib/geo-node/ip-lookup";
import { parseRequestedGeo, resolveObservedGeo } from "@/lib/geo-node/observe";
import { getGeoNode, nodeCanTakeJob, pickNodeForRequest, type GeoNodeRow } from "@/lib/geo-node/registry";
import { geoNodeAdmin, parseGeoNodeId, tableMissing } from "@/lib/geo-node/shared";

export type GeoNodeJob = {
  id: string;
  status: "queued" | "claimed" | "done" | "error";
  node_id: string | null;
  claimed_by: string | null;
  url: string;
  full_page: boolean;
  requested_country: string | null;
  requested_region: string | null;
  observed_country: string | null;
  observed_region: string | null;
  ip_type: string | null;
  ip: string | null;
  http_status: number | null;
  final_url: string | null;
  duration_ms: number | null;
  error_code: string | null;
  screenshot_url: string | null;
  created_at: string;
  claimed_at: string | null;
  completed_at: string | null;
};

export { parseGeoNodeId, tableMissing };

export function jobObserved(job: Pick<GeoNodeJob, "observed_country" | "observed_region">): string | null {
  return resolveObservedGeo({
    verifiedCountry: job.observed_country,
    verifiedRegion: job.observed_region,
  }).observed;
}

export async function enqueueGeoNodeJob(input: {
  url: string;
  nodeId?: string | null;
  requested?: string | null;
  fullPage?: boolean;
}): Promise<{ job: GeoNodeJob; assigned: GeoNodeRow | null } | { error: string; status: number }> {
  const admin = geoNodeAdmin();
  if (!admin) return { error: "supabase_not_configured", status: 503 };

  const requested = parseRequestedGeo(input.requested);
  const assigned = await pickNodeForRequest({
    country: requested.country,
    region: requested.region,
    nodeId: input.nodeId,
  });
  const nodeId = input.nodeId || assigned?.node_id || null;

  const { data, error } = await admin
    .from("geo_node_jobs")
    .insert({
      url: input.url,
      node_id: nodeId,
      full_page: input.fullPage === true,
      status: "queued",
      requested_country: requested.country,
      requested_region: requested.region,
    })
    .select("*")
    .single();

  if (error) {
    return {
      error: tableMissing(error.message) ? "geo_node_jobs_missing" : error.message,
      status: 503,
    };
  }
  return { job: data as GeoNodeJob, assigned };
}

export async function claimNextGeoNodeJob(
  nodeId: string,
): Promise<{ job: GeoNodeJob | null } | { error: string; status: number }> {
  const admin = geoNodeAdmin();
  if (!admin) return { error: "supabase_not_configured", status: 503 };
  const safe = parseGeoNodeId(nodeId);
  if (!safe) return { error: "invalid_node_id", status: 400 };

  const node = await getGeoNode(safe);
  const { data: candidates, error: listError } = await admin
    .from("geo_node_jobs")
    .select("*")
    .eq("status", "queued")
    .or(`node_id.is.null,node_id.eq.${safe}`)
    .order("created_at", { ascending: true })
    .limit(20);

  if (listError) {
    return {
      error: tableMissing(listError.message) ? "geo_node_jobs_missing" : listError.message,
      status: 503,
    };
  }

  const match = ((candidates ?? []) as GeoNodeJob[]).find((job) => {
    if (!node) return job.node_id === safe && !job.requested_region;
    return nodeCanTakeJob(node, job);
  });
  if (!match) return { job: null };

  const { data, error } = await admin
    .from("geo_node_jobs")
    .update({
      status: "claimed",
      claimed_by: safe,
      claimed_at: new Date().toISOString(),
    })
    .eq("id", match.id)
    .eq("status", "queued")
    .select("*")
    .maybeSingle();

  if (error) return { error: error.message, status: 503 };
  return { job: (data as GeoNodeJob | null) ?? null };
}

export async function completeGeoNodeJob(input: {
  jobId: string;
  nodeId: string;
  observedCountry?: string | null;
  ipType?: string | null;
  ip?: string | null;
  httpStatus?: number | null;
  finalUrl?: string | null;
  durationMs?: number | null;
  status: "done" | "error";
  errorCode?: string | null;
  screenshotPng?: Buffer | null;
}): Promise<{ job: GeoNodeJob; observed: string | null } | { error: string; status: number }> {
  const admin = geoNodeAdmin();
  if (!admin) return { error: "supabase_not_configured", status: 503 };

  const lookup = await lookupIpRegion(input.ip ?? null);
  const observed = resolveObservedGeo({
    verifiedCountry: input.observedCountry ?? null,
    verifiedRegion: verifiedRegionFromLookup(input.observedCountry ?? null, lookup),
  });

  let screenshotUrl: string | null = null;
  if (input.screenshotPng && process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    try {
      const uploaded = await put(`geo-node/${input.jobId}.png`, input.screenshotPng, {
        access: "public",
        contentType: "image/png",
        token: process.env.BLOB_READ_WRITE_TOKEN.trim(),
      });
      screenshotUrl = uploaded.url;
    } catch {
      screenshotUrl = null;
    }
  }

  const { data, error } = await admin
    .from("geo_node_jobs")
    .update({
      status: input.status,
      observed_country: observed.country,
      observed_region: observed.region,
      ip_type: input.ipType ?? null,
      ip: input.ip ?? null,
      http_status: input.httpStatus ?? null,
      final_url: input.finalUrl ?? null,
      duration_ms: input.durationMs ?? null,
      error_code: input.errorCode ?? null,
      screenshot_url: screenshotUrl,
      completed_at: new Date().toISOString(),
    })
    .eq("id", input.jobId)
    .eq("claimed_by", input.nodeId)
    .in("status", ["claimed"])
    .select("*")
    .maybeSingle();

  if (error) return { error: error.message, status: 503 };
  if (!data) return { error: "job_not_claimed", status: 409 };
  const job = data as GeoNodeJob;
  return { job, observed: jobObserved(job) };
}
