import { NextResponse } from "next/server";
import { authorizeGeoNode, geoNodeSecret } from "@/lib/geo-node/auth";
import { geoNodeAdmin, tableMissing } from "@/lib/geo-node/shared";
import { isNodeOnline } from "@/lib/geo-node/registry";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!geoNodeSecret()) {
    return NextResponse.json({ error: "secret_not_configured" }, { status: 503 });
  }
  if (!authorizeGeoNode(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = geoNodeAdmin();
  if (!admin) return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  const { data, error } = await admin.from("geo_nodes").select("*").order("node_id");
  if (error) {
    return NextResponse.json(
      { error: tableMissing(error.message) ? "geo_nodes_missing" : error.message },
      { status: 503 },
    );
  }
  return NextResponse.json({
    nodes: (data ?? []).map((node) => ({
      ...node,
      online: isNodeOnline(node),
    })),
  });
}
