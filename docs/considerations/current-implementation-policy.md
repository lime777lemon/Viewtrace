# 現行の実装方針（13ユーザー地点）— 方針確定・コード未着手

- **状態:** 方針固定。Phase A は計測基盤として実装済み。Phase B 以降は未承認。
- **記録日:** 2026-09-18
- **置き換え:** 先に `ai_analyses / geo_comparisons / scout_profiles / scout_candidates / scout_signals / queues` を全部作る案は、今はやらない。
- **一言:** Phase A はセミそのものではなく、セミが次のユーザーを連れてきたかを測る神経系。
- **今やること:** 本番で `Observation A → Verify → Visitor B → Signup → Observation B` が `verify_events` に残るか確認する。AI・無料ツール・Scout には進まない。

各 Phase は「機能が完成したか」ではなく、**次へ進む根拠となる行動データが出たか**で判断する。

Phase A の最初の判定材料: Verify から CTA クリック・URL 入力・Observation B が実際に発生するか。

ロードマップ（固定）: **A（計測）→ B（既存画像AI）→ C（無料1回＝セミ①）→ D（Scout＝セミ②）→ E（Apollo/Outreach）**

既存の `/verify/[token]` と `Powered by ViewTrace` は捨てない。そこを獲得ループに変える。新しい Scout 基盤は先に作らない。

## 開発順序（固定）

1. 既存 Verify 改善
2. AI on existing captures
3. Free one-shot AI/Geo tool
4. Scout Discovery
5. enrichment / Apollo
6. automated outreach

## Phase A — Verify をループにする

`/verify/[token]` の下部に **“Check your own website with ViewTrace”** を置く。

クリック → URL入力 → Signup / Observation まで計測する。

見る数字:

**Verify閲覧数 → CTAクリック率 → URL入力率 → Signup率 → First Observation率**

## Phase B — 保存済み Screenshot だけ Analyze with AI

既存キャプチャに **“Analyze with AI”**。追加撮影なし。

返すもの（この時点）:

- 良い点
- 問題候補
- CTA visibility
- visual hierarchy

Vision API。ユーザーごとに実行回数を制限する。

見る数字:

**AI Analysis実行率 → 2回目のAI利用率**

## ゲート

この数字が動かなければ Scout を作らない。

クライアントに共有された Verify から、新しい URL 入力が継続するなら、Product Loop がある証拠。

その次に無料 AI Checker を1回だけ開放する。それでも新規利用が増えるなら Scout。

## 今追加してよいテーブル

- `verify_events`（閲覧・CTA・入力・signup までの計測）
- `ai_analyses`（既存キャプチャの Vision 結果・回数制限の根拠）

それ以外の大きなスキーマは、この検証の後。

## 既存資産

- `/verify/[token]` 公開検証
- レポートの Powered by CTA
- Capture → Observation 保存

新しい公開レポート基盤 `/report/xxxxx` を先に作らなくてよい。Verify を強くする。
