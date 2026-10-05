import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site";
import { PUBLIC_SITEMAP_ENTRIES } from "@/lib/seo/public-sitemap";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteOrigin.replace(/\/$/, "");
  return PUBLIC_SITEMAP_ENTRIES.map((entry) => ({
    url: `${base}${entry.path === "/" ? "" : entry.path}`,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
    lastModified: new Date(),
  }));
}
