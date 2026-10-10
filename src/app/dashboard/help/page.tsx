import type { Metadata } from "next";
import { DashboardHelp } from "@/components/dashboard/DashboardHelp";
import { copy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    title: copy[locale].dashboard.help.panelTitle,
    robots: { index: false, follow: false },
  };
}

export default async function DashboardHelpPage() {
  const locale = await getRequestLocale();
  return <DashboardHelp locale={locale} />;
}
