/** Unicode hyphen / minus（メール折り返し・スマート置換など）を ASCII の `-` に寄せる */
const UNICODE_TO_ASCII_HYPHEN =
  /[\u2010\u2011\u2012\u2013\u2014\u2212\u2E17\u301C\uFE58\uFE63\uFF0D]/g;

/** 見えない制御・双方向書字マーカーなど（メールが URL に混入させることがある） */
const INVISIBLE_AND_FORMATTING_CHARS =
  /[\u00AD\u061C\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g;

/**
 * メールクライアント（特にモバイル）が URL にゼロ幅文字や末尾ゴミを付ける場合の対策。
 */
export function sanitizeObservationRouteId(raw: unknown): string {
  if (typeof raw !== "string") return "";
  let s = raw.trim();
  /** まれにリンク全体や角括弧付きで渡る */
  s = s.replace(/^[<([{"'`]+/, "").replace(/[>)\]}"'`]+$/, "");

  let prev = "";
  while (prev !== s) {
    prev = s;
    s = s.replace(INVISIBLE_AND_FORMATTING_CHARS, "");
    s = s.replace(UNICODE_TO_ASCII_HYPHEN, "-");

    /** まれに複数エンコード（%252d 等）になる（壊れた % があると例外なので無視して打ち切る） */
    while (true) {
      if (!/%[0-9a-f]{2}/i.test(s)) break;
      let nextTry = s;
      try {
        nextTry = decodeURIComponent(s);
      } catch {
        break;
      }
      if (nextTry === s) break;
      s = nextTry;
      if (/[:/?#]$/.test(s)) break;
    }
  }

  /** iOS で稀に末尾に句読点・括弧だけ付く（URL の一部として解釈されない単位） */
  s = s.replace(/[)>.,;:]+$/g, "");

  /**
   * 改行などは削除（メール由来の複数ライン URL）。
   * グループの先頭桁は標準 RFC + 変種を広く許容してメール混入で落とさない。
   */
  const compact = s.replace(/\s+/g, "");
  const uuidRe =
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
  const m = compact.match(uuidRe);
  const id = (m ? m[0] : compact).toLowerCase();
  return id.length <= 128 ? id : id.slice(0, 128);
}

/**
 * 「記録へ飛ぶ」相対パス内の observation id だけ補正（例: `/login?next=/dashboard/observations/{id}`）。
 * `/api/open/observation?id=` のクエリもメール由来で壊れる場合に備え補正する。
 */
export function sanitizeDashboardObservationHrefPath(path: string): string {
  let out = path.replace(
    /\/dashboard\/observations\/([^/?#]+)/g,
    (matched, idRaw: string) => {
      const c = sanitizeObservationRouteId(idRaw);
      return c ? `/dashboard/observations/${c}` : matched;
    },
  );

  const marker = "/api/open/observation?";
  const idx = out.indexOf(marker);
  if (idx !== -1) {
    try {
      const qs = out.slice(idx + marker.length);
      const sp = new URLSearchParams(qs);
      const raw = sp.get("id");
      if (raw) {
        const c = sanitizeObservationRouteId(raw);
        if (c) {
          sp.set("id", c);
          out = `${out.slice(0, idx + marker.length)}${sp.toString()}`;
        }
      }
    } catch {
      /* leave out unchanged */
    }
  }

  return out;
}
