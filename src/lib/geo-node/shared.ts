import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export function geoNodeAdmin() {
  return createSupabaseAdminClient();
}

export function tableMissing(message: string | undefined): boolean {
  return /geo_node_jobs|geo_nodes|schema cache|does not exist/i.test(message ?? "");
}

export function parseGeoNodeId(value: string | null | undefined): string | null {
  const nodeId = value?.trim() ?? "";
  if (!nodeId) return null;
  return /^[a-zA-Z0-9._-]{1,64}$/.test(nodeId) ? nodeId : null;
}
