import type { Metadata } from "next";
import { ViewtraceFeatures } from "@/components/ViewtraceFeatures";
import { copy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { getOveragePerObservationUsd } from "@/lib/plans";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const page = copy[locale].featuresPage;
  const canonical = "/features";

  return {
    title: { absolute: page.metaTitle },
    description: page.metaDescription,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title: page.metaTitle,
      description: page.metaDescription,
    },
    twitter: {
      card: "summary_large_image",
      title: page.metaTitle,
      description: page.metaDescription,
    },
  };
}

export default async function FeaturesPage() {
  const locale = await getRequestLocale();
  return (
    <ViewtraceFeatures
      locale={locale}
      overagePerObservationUsd={getOveragePerObservationUsd()}
    />
  );
}
