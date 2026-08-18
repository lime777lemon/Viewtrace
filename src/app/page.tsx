import { SupabaseHomeAuthCapture } from "@/components/auth/SupabaseHomeAuthCapture";
import { ViewtraceLanding } from "@/components/ViewtraceLanding";
import { getOveragePerObservationUsd } from "@/lib/plans";

/**
 * ランディングは CDN キャッシュ可能な静的ページとして配信し TTFB を最小化する。
 * ロケールは cookie（vt_locale）をクライアントで読み取り、ViewtraceLanding が切り替える。
 * （既定は英語。日本語リピーターはマウント直後に自動で切り替わる）
 */
export const dynamic = "force-static";

export default function Home() {
  const overagePerObservationUsd = getOveragePerObservationUsd();
  return (
    <>
      <SupabaseHomeAuthCapture />
      <ViewtraceLanding initialLocale="en" overagePerObservationUsd={overagePerObservationUsd} />
    </>
  );
}
