import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginView } from "@/components/auth/LoginView";
import { getSession } from "@/lib/auth/session";
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
  const initialMode = verified || modeParam === "signin" ? ("signin" as const) : ("signup" as const);

  const session = await getSession();
  // メール確認後に `/login?verified=1` へ誘導されたとき、セッション付きでも一言表示できるようにダッシュボードへ即飛ばさない
  if (session && !verified) {
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
