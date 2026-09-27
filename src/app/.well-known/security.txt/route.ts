import { contactEmail, siteOrigin } from "@/lib/site";

export const dynamic = "force-static";

/**
 * RFC 9116 security.txt。報奨金は約束しない。
 * 正式パスは /.well-known/security.txt（/security.txt はリダイレクト）。
 */
export function GET(): Response {
  const base = siteOrigin.replace(/\/$/, "");
  const body = [
    "Contact: mailto:" + contactEmail,
    "Contact: " + `${base}/contact`,
    "Expires: 2027-09-27T00:00:00.000Z",
    "Preferred-Languages: ja, en",
    "Canonical: " + `${base}/.well-known/security.txt`,
    "",
    "# Vulnerability reports only. This is not a bug bounty.",
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
