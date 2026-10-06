export const dynamic = "force-static";

/**
 * Chrome Privacy Preserving Prefetch Proxy が読む Traffic Advice。
 * 公開ページのプリフェッチを許可する（404 だと毎回オリジンまで来る）。
 * https://github.com/WICG/nav-speculation/blob/main/traffic-advice.md
 */
export function GET(): Response {
  const body = JSON.stringify([
    {
      user_agent: "prefetch-proxy",
      fraction: 1.0,
    },
  ]);

  return new Response(body, {
    headers: {
      "Content-Type": "application/trafficadvice+json",
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
