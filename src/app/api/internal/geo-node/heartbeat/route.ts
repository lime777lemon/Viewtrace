import { NextResponse } from "next/server";
import { authorizeGeoNode, geoNodeSecret } from "@/lib/geo-node/auth";
import { heartbeatGeoNode } from "@/lib/geo-node/registry";

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
  const result = await heartbeatGeoNode({
    nodeId: typeof o.node_id === "string" ? o.node_id : "",
    ip: typeof o.ip === "string" ? o.ip : null,
    observedCountry: typeof o.observed_country === "string" ? o.observed_country : null,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ node: result.node });
}
