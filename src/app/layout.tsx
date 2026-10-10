import type { Metadata } from "next";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { siteSeoKeywordPhrases } from "@/lib/seo/site-keywords";
import { siteOrigin } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: "Viewtrace — Catch landing-page problems before they waste ad spend",
    template: "%s | Viewtrace",
  },
  description:
    "ViewTrace checks client landing pages from the regions where your ads actually run—then keeps timestamped proof of exactly what rendered.",
  keywords: [...siteSeoKeywordPhrases, "Viewtrace"],
  applicationName: "Viewtrace",
  authors: [{ name: "The Establish LLC", url: "/humans.txt" }],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Viewtrace",
    title: "Viewtrace — Catch landing-page problems before they waste ad spend",
    description:
      "ViewTrace checks client landing pages from the regions where your ads actually run—then keeps timestamped proof of exactly what rendered.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Viewtrace — Catch landing-page problems before they waste ad spend",
    description:
      "ViewTrace checks client landing pages from the regions where your ads actually run—then keeps timestamped proof of exactly what rendered.",
  },
  verification: {
    google: "hWP7-fbRH5By6ftqXkQOAO73beDcZx4B2XAZ8Jtbx5s",
  },
};

/** サイト全体の構造化データ（Organization / WebSite / SoftwareApplication）。
 *  検索のナレッジ理解と、AI/LLM が Viewtrace を「監視→検知→証明」と
 *  正しく説明・引用しやすくするための土台（GEO 対策）。 */
const SITE_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteOrigin}/#organization`,
      name: "Viewtrace",
      url: `${siteOrigin}/`,
      logo: `${siteOrigin}/brand/viewtrace-logo.png`,
      description:
        "Viewtrace monitors landing pages in each buying market, catches what breaks, and keeps the proof. Daily use is performance protection.",
      email: "info@viewtrace.net",
    },
    {
      "@type": "WebSite",
      "@id": `${siteOrigin}/#website`,
      url: `${siteOrigin}/`,
      name: "Viewtrace",
      publisher: { "@id": `${siteOrigin}/#organization` },
      inLanguage: ["en", "ja"],
    },
    {
      "@type": "SoftwareApplication",
      name: "Viewtrace",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: `${siteOrigin}/`,
      description:
        "Monitor every market. Catch what breaks. Keep the proof. Not ad-delivery or tag/pixel verification.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&family=Sora:wght@500;600;700&display=swap"
        />
      </head>
      <body className="font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_JSON_LD) }}
        />
        {children}
        <GoogleAnalytics />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
