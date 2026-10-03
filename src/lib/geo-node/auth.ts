export function geoNodeSecret(): string {
  return process.env.VIEWTRACE_GEO_NODE_SECRET?.trim() || "";
}

export function authorizeGeoNode(req: Request): boolean {
  const secret = geoNodeSecret();
  if (!secret) return false;
  const h = req.headers.get("authorization")?.trim() ?? "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return Boolean(m && m[1] === secret);
}
