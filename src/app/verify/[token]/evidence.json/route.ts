import { NextResponse } from "next/server";
import { buildObservationEvidencePack } from "@/lib/observation-evidence-json";
import { fetchObservationForPublicVerify } from "@/lib/observation-public-verify";
import { buildPublicVerifyUrlForObservation, sanitizeVerifyTokenParam } from "@/lib/observation-verify-token";

export const runtime = "nodejs";

type Props = { params: Promise<{ token: string }> };

/**
 * 公開証跡の JSON（追加撮影なし）。AdsChecks 風のメタデータパック。
 */
export async function GET(_req: Request, { params }: Props) {
  const { token: tokenRaw } = await params;
  const token = sanitizeVerifyTokenParam(tokenRaw);
  if (!token) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const obs = await fetchObservationForPublicVerify(token);
  if (!obs) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const pack = buildObservationEvidencePack({
    obs: {
      id: obs.id,
      url: obs.url,
      regionLabel: obs.regionLabel,
      capturedAt: obs.capturedAt,
      status: obs.status,
      snapshotImageUrl: obs.snapshotImageUrl,
      snapshotSha256: obs.snapshotSha256,
      contentHash: obs.contentHash,
    },
    verifyUrl: buildPublicVerifyUrlForObservation(token),
  });

  return NextResponse.json(pack, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="viewtrace-${obs.id}.json"`,
    },
  });
}
