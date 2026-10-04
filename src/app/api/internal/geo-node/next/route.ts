import { NextResponse } from "next/server";
import { authorizeGeoNode, geoNodeSecret } from "@/lib/geo-node/auth";
import { claimNextGeoNodeJob } from "@/lib/geo-node/jobs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!geoNodeSecret()) {
    return NextResponse.json({ error: "secret_not_configured" }, { status: 503 });
  }
  if (!authorizeGeoNode(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const nodeId =
    new URL(req.url).searchParams.get("node_id")?.trim() ||
    process.env.VIEWTRACE_GEO_NODE_ID?.trim() ||
    "";
  if (!nodeId) {
    return NextResponse.json({ error: "node_id_required" }, { status: 400 });
  }

  const result = await claimNextGeoNodeJob(nodeId.slice(0, 64));
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  if (!result.job) return new NextResponse(null, { status: 204 });
  return NextResponse.json({ job: result.job });
}
