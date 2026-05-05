/** Supabase クライアント用のベース URL（誤って /rest/v1 を付けた場合も吸収） */
export function normalizeSupabaseUrl(raw: string): string {
  let u = raw.trim().replace(/\/+$/, "");
  u = u.replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
  return u;
}
