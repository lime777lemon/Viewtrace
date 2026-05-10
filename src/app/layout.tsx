import type { Metadata } from "next";
import { Noto_Sans_JP, Sora } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
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
    default: "Viewtrace — Location-based snapshot records",
    template: "%s | Viewtrace",
  },
  description:
    "Timestamped snapshots of how ads and landing pages rendered in a specific region at a specific time—records for verification and sharing.",
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
    title: "Viewtrace — Location-based snapshot records",
    description:
      "Timestamped snapshots of how ads and landing pages rendered in a specific region at a specific time—records for verification and sharing.",
  },
  twitter: {
    card: "summary",
    title: "Viewtrace — Location-based snapshot records",
    description:
      "Timestamped snapshots of how ads and landing pages rendered in a specific region at a specific time—records for verification and sharing.",
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
