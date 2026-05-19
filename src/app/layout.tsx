import type { Metadata } from "next";
import { Noto_Sans_JP, Sora } from "next/font/google";
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
    default: "Viewtrace — Proof infrastructure for geo-routed captures",
    template: "%s | Viewtrace",
  },
  description:
    "Accountability infrastructure: geo-routed visual evidence with timestamps—audit-friendly trails and shared truth when teams must explain what was live.",
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
    title: "Viewtrace — Proof infrastructure for geo-routed captures",
    description:
      "Accountability infrastructure: geo-routed visual evidence with timestamps—audit-friendly trails and shared truth when teams must explain what was live.",
  },
  twitter: {
    card: "summary",
    title: "Viewtrace — Proof infrastructure for geo-routed captures",
    description:
      "Accountability infrastructure: geo-routed visual evidence with timestamps—audit-friendly trails and shared truth when teams must explain what was live.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${notoSansJp.variable} ${sora.variable}`}>
      <body className="font-sans">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
