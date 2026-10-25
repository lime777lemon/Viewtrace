import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EmailVerifiedView } from "@/components/auth/EmailVerifiedView";
import { POST_LOGIN_PATH } from "@/lib/auth/post-login-path";
import { getSession } from "@/lib/auth/session";

/** ビルド時の静的生成で getSession → Supabase を評価すると、環境変数未設定で失敗するのを避ける */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "認証成功 | Viewtrace",
  robots: { index: false, follow: false },
};

export default async function EmailVerifiedPage() {
  const session = await getSession();
  // 確認リンクでセッションが付いているときは再ログインさせずダッシュボードへ（二重 sign-in によるトークン競合を避ける）
  if (session) {
    redirect(POST_LOGIN_PATH);
  }
  return <EmailVerifiedView hasSession={false} />;
}
