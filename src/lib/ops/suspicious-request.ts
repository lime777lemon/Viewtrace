/** Heuristic probe / scanner paths (Edge-safe, no secrets). */
const SUSPICIOUS =
  /(wp-admin|wp-login|phpmyadmin|\.env|\.git\/|cgi-bin|union\s+select|\/etc\/passwd|phpinfo\(|base64_decode|\.\.\/\.\.|vendor\/phpunit|\+CSCOE\+)/i;

export function isSuspiciousRequestUrl(pathname: string, search: string): boolean {
  return SUSPICIOUS.test(`${pathname}${search}`);
}
