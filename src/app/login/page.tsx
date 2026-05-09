import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginView } from "@/components/auth/LoginView";
import { getAuthEmailRedirectTo } from "@/lib/auth/callback-url";
import { getSession } from "@/lib/auth/session";

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
  const nextPath = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : undefined;
  const modeParam = sp.mode?.trim().toLowerCase();
  const verified = sp.verified === "1";
  const initialMode = verified || modeParam === "signin" ? ("signin" as const) : ("signup" as const);

  const session = await getSession();
  if (session) {
    if (nextPath) redirect(nextPath);
    redirect("/dashboard");
  }

  const callbackUrl = await getAuthEmailRedirectTo();

  return (
    <LoginView
      callbackUrl={callbackUrl}
      nextPath={nextPath}
      initialMode={initialMode}
      verified={verified}
    />
  );
}
