import type { Metadata } from "next";
import { Noto_Sans_JP, Sora } from "next/font/google";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { siteSeoKeywordPhrases } from "@/lib/seo/site-keywords";
import { siteOrigin } from "@/lib/site";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: "Viewtrace — Post-click verification for landing pages",
    template: "%s | Viewtrace",
  },
  description:
    "Ad platforms tell you where the click went. Viewtrace shows you what was actually waiting there. Catch geo-specific landing issues before they waste spend.",
  keywords: [...siteSeoKeywordPhrases, "Viewtrace"],
  applicationName: "Viewtrace",
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
    title: "Viewtrace — Post-click verification for landing pages",
    description:
      "Ad platforms tell you where the click went. Viewtrace shows you what was actually waiting there. Catch geo-specific landing issues before they waste spend.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Viewtrace — Post-click verification for landing pages",
    description:
      "Ad platforms tell you where the click went. Viewtrace shows you what was actually waiting there. Catch geo-specific landing issues before they waste spend.",
  },
  verification: {
    google: "hWP7-fbRH5By6ftqXkQOAO73beDcZx4B2XAZ8Jtbx5s",
  },
};

/** サイト全体の構造化データ（Organization / WebSite / SoftwareApplication）。
 *  検索のナレッジ理解と、AI/LLM が Viewtrace を「クリック後のランディング体験の確認」と
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
        "Viewtrace is post-click verification for agencies: it shows what the landing page actually rendered after the click, from the region you buy in.",
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
        "Ad platforms tell you where the click went. Viewtrace shows what was waiting on the landing page. Not ad-delivery or tag/pixel verification.",
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
    <html lang="en" className={`${notoSansJp.variable} ${sora.variable}`}>
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
