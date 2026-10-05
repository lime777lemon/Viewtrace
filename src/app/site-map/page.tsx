import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocShell } from "@/components/legal/LegalDocShell";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { publicSitemapSections } from "@/lib/seo/public-sitemap";

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const ja = locale === "ja";
  return {
    title: ja ? "サイトマップ" : "Site map",
    description: ja
      ? "Viewtrace の公開ページ一覧です。"
      : "A list of public Viewtrace pages.",
    alternates: { canonical: "/site-map" },
    robots: { index: true, follow: true },
  };
}

export default async function SiteMapPage() {
  const locale = await getRequestLocale();
  const ja = locale === "ja";
  const sections = publicSitemapSections(locale);

  return (
    <LegalDocShell locale={locale} title={ja ? "サイトマップ" : "Site map"}>
      <p className="text-sm leading-relaxed text-ink-muted">
        {ja
          ? "検索エンジン向けの XML は sitemap.xml です。こちらは人が辿る公開ページの一覧です。"
          : "The XML sitemap for crawlers is sitemap.xml. This page lists the public URLs people can open."}{" "}
        <Link href="/sitemap.xml" className="font-medium text-accent hover:text-accent-hover">
          sitemap.xml
        </Link>
      </p>
      <div className="mt-8 space-y-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-xs font-semibold tracking-[0.14em] text-accent uppercase">
              {section.title}
            </h2>
            <ul className="mt-3 space-y-2">
              {section.links.map((link) => (
                <li key={link.path}>
                  <Link
                    href={link.path}
                    className="text-sm font-medium text-ink hover:text-accent"
                  >
                    {link.label}
                  </Link>
                  <span className="ml-2 font-mono text-xs text-ink-muted">{link.path}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </LegalDocShell>
  );
}
