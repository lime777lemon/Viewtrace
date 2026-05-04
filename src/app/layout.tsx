import type { Metadata } from "next";
import { Noto_Sans_JP, Sora } from "next/font/google";
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
  title: "Viewtrace — 地域ターゲット向けビジュアル記録",
  description:
    "特定の地域・時刻における広告とLPの表示を、タイムスタンプ付きで記録。参照用のスナップショットです。",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "/",
    siteName: "Viewtrace",
    title: "Viewtrace",
    description:
      "Geo-targeted campaigns: timestamped visual records of ads and landing pages.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${notoSansJp.variable} ${sora.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
