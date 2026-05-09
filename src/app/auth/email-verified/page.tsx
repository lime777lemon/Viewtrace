import type { Metadata } from "next";
import { EmailVerifiedView } from "@/components/auth/EmailVerifiedView";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "認証完了 | Viewtrace",
  robots: { index: false, follow: false },
};

export default async function EmailVerifiedPage() {
  const session = await getSession();
  return <EmailVerifiedView hasSession={Boolean(session)} />;
}
