import { contactEmail, siteOrigin } from "@/lib/site";

export const dynamic = "force-static";

/**
 * /humans.txt — humanstxt.org の慣習。サイトを作っている人・会社を示す。
 */
export function GET(): Response {
  const base = siteOrigin.replace(/\/$/, "");
  const body = [
    "/* TEAM */",
    "Company: The Establish LLC (The Establish合同会社)",
    "Site: Viewtrace",
    "From: Tokyo, Japan",
    `Contact: ${contactEmail}`,
    `Contact: ${base}/contact`,
    "Company site: https://theestablish.jp",
    "",
    "/* SITE */",
    "Last update: 2026/10/05",
    "Language: English / Japanese",
    "Doctype: HTML5",
    "Standards: HTML5, CSS3",
    "Components: Next.js, React, Supabase, Vercel",
    `Canonical: ${base}/humans.txt`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
