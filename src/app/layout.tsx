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
    default: "Viewtrace — Tamper-evident records of what sites showed",
    template: "%s | Viewtrace",
  },
  description:
    "Keep tamper-evident records of what a website actually showed—geo-routed captures with timestamps and integrity checks for teams that need shared truth.",
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
    title: "Viewtrace — Tamper-evident records of what sites showed",
    description:
      "Keep tamper-evident records of what a website actually showed—geo-routed captures with timestamps and integrity checks for teams that need shared truth.",
  },
  twitter: {
    card: "summary",
    title: "Viewtrace — Tamper-evident records of what sites showed",
    description:
      "Keep tamper-evident records of what a website actually showed—geo-routed captures with timestamps and integrity checks for teams that need shared truth.",
  },
  verification: {
    google: "hWP7-fbRH5By6ftqXkQOAO73beDcZx4B2XAZ8Jtbx5s",
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
        <GoogleAnalytics />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
