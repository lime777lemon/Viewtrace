import type { Metadata } from "next";
import { EmailVerifiedView } from "@/components/auth/EmailVerifiedView";
import { getSession } from "@/lib/auth/session";

/** ビルド時の静的生成で getSession → Supabase を評価すると、環境変数未設定で失敗するのを避ける */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "認証成功 | Viewtrace",
  robots: { index: false, follow: false },
};

export default async function EmailVerifiedPage() {
  const session = await getSession();
  return <EmailVerifiedView hasSession={Boolean(session)} />;
}
