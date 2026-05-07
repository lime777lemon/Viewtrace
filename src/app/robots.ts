import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const base = new URL(siteOrigin);
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/login", "/checkout", "/auth/", "/api/"],
    },
    sitemap: new URL("/sitemap.xml", base).href,
    host: base.host,
  };
}
