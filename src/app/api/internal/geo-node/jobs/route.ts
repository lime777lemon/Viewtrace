import { NextResponse } from "next/server";
import { authorizeGeoNode, geoNodeSecret } from "@/lib/geo-node/auth";
import { enqueueGeoNodeJob, parseGeoNodeId } from "@/lib/geo-node/jobs";
import { isBlockedPreviewHost, normalizeUserUrlInput } from "@/lib/url-preview";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!geoNodeSecret()) {
    return NextResponse.json({ error: "secret_not_configured" }, { status: 503 });
  }
  if (!authorizeGeoNode(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const url = typeof o.url === "string" ? normalizeUserUrlInput(o.url) : null;
  if (!url) return NextResponse.json({ error: "invalid_url" }, { status: 400 });

  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }
  if (isBlockedPreviewHost(hostname)) {
    return NextResponse.json({ error: "blocked_host" }, { status: 400 });
  }

  const rawNodeId = typeof o.node_id === "string" ? o.node_id : "";
  const nodeId = rawNodeId.trim() ? parseGeoNodeId(rawNodeId) : null;
  if (rawNodeId.trim() && !nodeId) {
    return NextResponse.json({ error: "invalid_node_id" }, { status: 400 });
  }
  const requested =
    (typeof o.region === "string" && o.region) ||
    (typeof o.requested === "string" && o.requested) ||
    (typeof o.requested_country === "string" && o.requested_country) ||
    null;
  const result = await enqueueGeoNodeJob({
    url,
    nodeId,
    requested,
    fullPage: o.full_page === true,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ job: result.job, assigned: result.assigned });
}
