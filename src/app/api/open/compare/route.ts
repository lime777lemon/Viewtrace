import { type NextRequest, NextResponse } from "next/server";
import { observationCompareHref } from "@/lib/observation-compare";
import { sanitizeObservationRouteId } from "@/lib/observation-route-id";

export const dynamic = "force-dynamic";

/** メール「Compare を開く」用。短いクエリでダッシュボード比較へ 302。 */
export function GET(request: NextRequest) {
  const a = sanitizeObservationRouteId(request.nextUrl.searchParams.get("a") ?? "");
  const b = sanitizeObservationRouteId(request.nextUrl.searchParams.get("b") ?? "");
  if (!a || !b || a === b) {
    return NextResponse.redirect(new URL("/dashboard/observations", request.url), 302);
  }
  const res = NextResponse.redirect(new URL(observationCompareHref(a, b), request.url), 302);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
