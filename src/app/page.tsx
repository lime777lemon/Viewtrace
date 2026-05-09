import { ViewtraceLanding } from "@/components/ViewtraceLanding";
import { getRequestLocale } from "@/lib/i18n/locale-server";

export default async function Home() {
  const locale = await getRequestLocale();
  return <ViewtraceLanding initialLocale={locale} />;
}
