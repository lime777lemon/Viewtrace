import { NextResponse } from "next/server";
import { authorizeGeoNode, geoNodeSecret } from "@/lib/geo-node/auth";
import { completeGeoNodeJob, parseGeoNodeId } from "@/lib/geo-node/jobs";

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
  const jobId = typeof o.job_id === "string" ? o.job_id.trim() : "";
  const nodeId = parseGeoNodeId(typeof o.node_id === "string" ? o.node_id : "");
  if (!jobId || !nodeId) {
    return NextResponse.json({ error: "job_id_and_node_id_required" }, { status: 400 });
  }

  let screenshotPng: Buffer | null = null;
  if (typeof o.screenshot_png_base64 === "string" && o.screenshot_png_base64.length > 0) {
    try {
      screenshotPng = Buffer.from(o.screenshot_png_base64, "base64");
    } catch {
      return NextResponse.json({ error: "invalid_png" }, { status: 400 });
    }
  }

  const result = await completeGeoNodeJob({
    jobId,
    nodeId,
    observedCountry: typeof o.observed_country === "string" ? o.observed_country : null,
    ipType: typeof o.ip_type === "string" ? o.ip_type : null,
    ip: typeof o.ip === "string" ? o.ip : null,
    httpStatus: typeof o.http_status === "number" ? o.http_status : null,
    finalUrl: typeof o.final_url === "string" ? o.final_url : null,
    durationMs: typeof o.duration_ms === "number" ? o.duration_ms : null,
    status: o.success === false || o.status === "error" ? "error" : "done",
    errorCode: typeof o.error_code === "string" ? o.error_code : null,
    screenshotPng,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ job: result.job, observed: result.observed });
}
