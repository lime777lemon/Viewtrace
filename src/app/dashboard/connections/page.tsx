import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PipedreamConnectPanel } from "@/components/dashboard/PipedreamConnectPanel";
import { getSession } from "@/lib/auth/session";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { listConnectedAccounts, pipedreamConfigured } from "@/lib/pipedream";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connections | Viewtrace",
  robots: { index: false, follow: false },
};

export default async function ConnectionsPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/connections");
  const locale = await getRequestLocale();
  const configured = pipedreamConfigured();
  const accounts = configured ? await listConnectedAccounts(session.userId).catch(() => []) : [];

  return (
    <div className="mx-auto max-w-3xl">
      <PipedreamConnectPanel
        externalUserId={session.userId}
        configured={configured}
        accounts={accounts}
        locale={locale === "en" ? "en" : "ja"}
      />
    </div>
  );
}
