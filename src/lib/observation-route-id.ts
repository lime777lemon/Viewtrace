/**
 * メールクライアント（特にモバイル）が URL にゼロ幅文字や末尾ゴミを付ける場合の対策。
 */
export function sanitizeObservationRouteId(raw: unknown): string {
  if (typeof raw !== "string") return "";
  let s = raw.trim().replace(/[\u200B-\u200D\uFEFF\u2060]/g, "");
  if (s.includes("%")) {
    try {
      s = decodeURIComponent(s);
    } catch {
      /* メール経由で壊れた % エンコードに備える */
    }
  }
  /** iOS で稀に末尾に句読点・括弧だけ付く（URL の一部として解釈されない単位） */
  s = s.replace(/[)>.,;:]+$/g, "");

  const compact = s.replace(/\s+/g, "");
  const uuidRe =
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
  const m = compact.match(uuidRe);
  const id = (m ? m[0] : compact).toLowerCase();
  return id.length <= 128 ? id : id.slice(0, 128);
}
