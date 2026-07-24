import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginView } from "@/components/auth/LoginView";
import { getSession } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sanitizeDashboardObservationHrefPath } from "@/lib/observation-route-id";

export const metadata: Metadata = {
  title: "Sign in | Viewtrace",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string; verified?: string }>;
}) {
  const sp = await searchParams;
  const nextParam = sp.next?.trim() ?? "";
  const nextPathRaw =
    nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : undefined;
  const nextPath = nextPathRaw
    ? sanitizeDashboardObservationHrefPath(nextPathRaw)
    : undefined;
  const modeParam = sp.mode?.trim().toLowerCase();
  const verified = sp.verified === "1";
  const initialMode: "signin" | "signup" =
    verified || modeParam === "signin" ? "signin" : "signup";

  const wantsSignup = modeParam !== "signin";

  let session = await getSession();
  // 登録画面へ来たときはダッシュボードへ飛ばさず、既存セッションがあればいったんログアウトして登録フォームを表示
  if (session && wantsSignup && !verified) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    session = null;
  } else if (session && !verified) {
    if (nextPath) redirect(nextPath);
    redirect("/dashboard");
  }

  return (
    <LoginView
      nextPath={nextPath}
      initialMode={initialMode}
      verified={verified}
    />
  );
}
