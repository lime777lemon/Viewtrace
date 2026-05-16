import { type NextRequest, NextResponse } from "next/server";
import { sanitizeObservationRouteId } from "@/lib/observation-route-id";

export const dynamic = "force-dynamic";

/**
 * メール「記録を開く」用。`?id=` に UUID を載せ、ダッシュボード詳細へ 302。
 * パス `/dashboard/observations/{uuid}` より iOS メールで壊れにくい。
 */
export function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("id") ?? "";
  const id = sanitizeObservationRouteId(raw);
  if (!id) {
    return NextResponse.redirect(new URL("/dashboard/observations", request.url), 302);
  }
  const res = NextResponse.redirect(new URL(`/dashboard/observations/${id}`, request.url), 302);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
