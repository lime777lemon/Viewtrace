import { ViewtraceLanding } from "@/components/ViewtraceLanding";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { getOveragePerObservationUsd } from "@/lib/plans";

export default async function Home() {
  const locale = await getRequestLocale();
  const overagePerObservationUsd = getOveragePerObservationUsd();
  return (
    <ViewtraceLanding initialLocale={locale} overagePerObservationUsd={overagePerObservationUsd} />
  );
}
