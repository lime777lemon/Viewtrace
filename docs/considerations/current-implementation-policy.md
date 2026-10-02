# 現行の実装方針 — Activation / Observation 本体

- **状態:** Activation 計測は固定。Activation UI は母数が小さいうちはいじらない。Observation の価値を強くする新機能は進めてよい。Verify を成長ループの主役にしない。Phase B（AI）以降は未承認。
- **記録日:** 2026-10-02
- **置き換え:** 新機能を全部止める、ではない。Activation 着地の先回り改修と、Verify / SEO Checker / AI / Scout は止める。
- **一言:** 価値は Observation。流れは Observe → Observe again → Compare → Share。1 Capture = 1 Observation。機能制限より月間 Observation 数で原価を止める。
- **今やること:** Monitor v1（既存 Watch）。Compare の Screenshot 三値で Changed のときだけ通知。保存済み html_signals の表示は常時（選ばせない）。メタ差分メールだけ Watch で選ばせる。Share Collection はまだ急がない。サイト全体 SEO crawler / Score / AI 診断 / Scout には進まない。

各 Phase は「機能が完成したか」ではなく、**次へ進む根拠となる行動データが出たか**で判断する。

## KPI（分ける）

**登録数 → メール確認数 → 初回 Observation → 2回目 Observation**

これで次のどれかが一目で分かる。

- 登録は増えているのに確認されない
- 確認はされるが初回 Observation が作られない
- 初回は作られるがリピートされない

内部アカウントと既知のテストアドレスは「外部」の分母から外す。方法は `ACTIVATION_EXCLUDE_EMAILS`（検証用。管理権限は付かない）、`ADMIN_EMAILS`、`@viewtrace.net`。仕組みを増やさない。リストに無い個人アドレスが1件残ると、n が小さいうちは率を大きく動かす。

確認メールの到達性は、未確認の中に typo・再登録・重複が混ざるうちは調べない。本物と思われる新規が数件〜十数件増え、正常なアドレスでも未確認が続くとき初めて見る。

各ステップの読み方:

- 登録 → 確認 = Auth / メール（入口）
- 確認 → 初回 Observation = Activation
- 初回 → 2回目 Observation = Repeat usage

本番の「外部」数字をローカルと揃えるため、`ACTIVATION_EXCLUDE_EMAILS` は Vercel の Production / Preview / Development にも置く。次のデプロイ以降で本番管理画面に乗る。計測コードの追加デプロイがまだなら、変数だけでは反映されない。

`/verify/[token]` は削除しない。成長ループではなく、**Share の公開サーフェス**。名前を変えるのは利用が確認されてからでよい。

プロダクトの流れ:

**Observe → Observe again → Compare → Share**

Multi-region は Observe の入口。Monitor / Alert / Collection はその先。

$49 / $99 の差は、既存機能を Starter から取り上げるのではなく、**頻度・履歴・自動化・クライアント運用**で後から足す。

## Time Compare と Region Compare

**Time Compare** — 同じ URL 識別子 + 同じ地域 + 時点 A/B → 時間で何が変わったか

**Region Compare** — 同じ URL 識別子 + 地域 A/B + 最も近い時点 → 地域で何が違ったか

URL 識別子は query を残す（`?campaign=A` と `?campaign=B` は別の着地）。Final URL は識別に使わず、比較フィールド。どちらも既存 Observation のみ。比較の撮影原価は増えない。

Changed / Same / Not comparable は事実表示。Improved / Worse は入れない。**観測できた事実以上を断定しない。**

**Screenshot**

- Same → 同じ撮影条件で画像指紋が一致
- Changed → 同じ撮影条件で画像指紋が不一致（= screenshot content differs。Page changed とは言わない）
- Not comparable → 撮影条件が違うので、画像差について結論を出さない

動的コンテンツ、Cookie banner、時刻、広告、アニメーションでも SHA は変わり得る。Title / Description / Canonical などは画像と独立して比較する。

撮影範囲（Full page / Viewport）や viewport サイズが違うときは Not comparable。SHA 差をページ差と読ませない。Side by side は常に見せる。

Monitor / Change Alert もこの三値を再利用する。条件不一致の自動観測を「ページが変わった」と通知しない。

Slider（未実装）も同じ判定を使う。条件一致かつ画像高さが揃うときだけ Slider。条件不一致は Side by side のみ。

## Before / After（未実装・別ページにしない）

Time Compare ですでに左右表示している。追加するなら表示モード:

- Side by side（現行）
- Slider（同じ位置・同じサイズ）

Slider は viewport・画像高さ・full-page 条件が一致するときだけ有効。条件が違うと視覚比較がズレる。Screenshot の Changed 判定と同じ前提。今は作らない。

ロードマップ（Observation 軸）:

1. Time Compare / Region Compare / Public Observation / HTML Signals 差分 — 実装済み
2. **Multi-region Run** — 実装済み
3. **Monitor v1** — 定期 Observation + Screenshot 三値（Compare と同一関数）+ Changed 通知 + Compare 導線
4. HTML Signals の常時表示（3段 / 検索プレビュー / OG プレビュー / Compare メタ差）と、Watch の任意メタ差分メール — 実装済み
5. Share Collection — 複数記録を1リンク。単独の売る理由ではなく作業の楽さ
6. Client / Project grouping、Compare 公開、定期レポート、CSV（Pro 運用）
7. Time Compare の Slider（条件一致時のみ）

今やらない: サイト全体 SEO crawler / broken-link / AI SEO / SEO Score / Scout。Notes/Labels は詳細の注釈として既存。

Activation と反復がデータで正当化されてから B（既存画像AI）→ C（無料1回）→ D（Scout）→ E（Apollo/Outreach）

## 新機能の条件

追加してよいのは、次のいずれかに当てはまるものだけ。

- Observation を作る理由になる
- 2回目の Observation を作る理由になる
- 既存 Observation の価値を強くする

Activation の登録後着地 UI は、母数が小さいうちは変えない。サイト全体 SEO crawler / broken-link checker / AI SEO 診断 / SEO Score、HTML body crawl、Vision AI、Scout は今はやらない。html_signals の商品化（メタデータ表示と差分）は既存データのみなので進めてよい。

## 開発順序

1. Activation の計測（登録 / 確認 / 初回 / 2回目）— 固定。UI 改修しない
2. Time Compare / Region Compare / Public Observation / HTML 差分 — 実装済み
3. Multi-region Run — 実装済み
4. Monitor v1（既存 Watch + Screenshot 三値 + Changed 通知 + 任意のメタ差分メール）
5. Share Collection
6. Time Compare の Slider（条件一致時のみ）
7. AI on existing captures（未承認）
8. Free one-shot / Scout

## いま分かっている2つの問題（別物）

### 1. 登録 → メール確認

未確認が多い。typo・再登録・重複が混ざる。10/18 未確認でも確認メールに問題があるとは言えない。本物と思われる新規が数件〜十数件増え、正常なアドレスでも未確認が続くとき初めて、到達性・文面・再送・登録後画面を見る。

### 2. メール確認 → 初回 Observation

プロダクト UX として重要。確認後の着地は `/dashboard`（概要・プラン・空の一覧）。初回ユーザーに「次に何をすれば価値を体験できるか」が弱い可能性がある。

対象がごく少数のうちは、即 UI 改修しない。今後の新規確認済みユーザーで同じ離脱が続くかを先に見る。

検討案（未実装）: 初回ログイン時だけ、URL × 地域 → Observation 作成を主役にする。

## Observation — 本体

`URL × 地域 × 時点 → 実際の表示を取得 → 記録`

**1 URL × 1 Region × 1 Capture = 1 Observation**

- 手動 1 地域 → 1
- Multi-region 6 地域 → 6
- Watch 1 URL × 1 地域 → 1 / 実行
- Watch 5 URL × 3 地域 → 15 / 実行
- Compare / Share / SHA 判定 → 0

残量が足りなければ開始しない（Multi-region と同じ）。Watch は当該 tick で due な件数を必要数とし、残り < 必要なら **バッチ全体をスキップ**（20 残で 30 必要なら 20 件だけ走らせない）。

月間上限に達したら自動停止。超過従量課金はしない。文言は “You've reached your monthly Observation limit. Upgrade to continue.”

Starter $49 → **500 仮置き維持**。Pro $99 → **1,500 仮置き維持（確定しない）**。**2,000 には戻さない。** 上限の変更より先に、residential が通った Observation の **proxy MB → units → $/Observation** を実測する。`retry_without_proxy` の平均 units は将来原価に使わない（Geo 正常時を過小評価する）。

分布は Observation 単位の `cost_signals` から出す。**C = 1 件の成功 Observation を完成させるための全 billed attempts の総原価**（失敗した州/国試行も含む。各 /screenshot 呼び出しは別セッション）。`duration_ms` / `estimated_time_units` は最終成功だけでなく合計。`attempts_log` に試行ごとの duration / units / proxy_bytes を残す。

`proxy_bytes` は **0 と null を混ぜない**。0 = 転送 0 を観測した。null = 測定できなかった。CSV では null を空欄にする。P50/P75/P90 は測定できた件数を分母にし、その n を別に出す。プロキシ使用試行のどれかが未測定なら合計 `proxy_bytes` も null。

計測項目はこれ以上増やさない。国単位 residential の成功が **20〜50 Observation** 貯まった時点で、次だけを見る。

1. C の P50 / P75 / P90
2. units / Observation の P50 / P75 / P90
3. proxy MB / Observation（測定可能 `n` も併記。null は分母に入れない）
4. fallback 率
5. attempts / Observation
6. Starter 500 / Pro 1,500 を 100% 消費したときの変動費率（対プラン価格）

原価設計は一旦止める。実測前の仮定を別の仮定に置き換えない。Starter 500 / Pro 1,500 を仮置きのまま、国単位 residential を収集する。

20〜50 件が揃ったら分析は2層。CSV を渡して計算する。

**① Unit economics / 上限設計** — P75〜P90 の C。Starter 500 / Pro 1,500 を 100% 使われても変動費率 25% 以内か。超えるプランだけ上限を下げる。

`floor((Plan価格 × 25%) ÷ P75〜P90 の Observation 原価)`

例: P90 の C = $0.020 なら Starter 500 は $10 / $49 = 20.4%（以内）、Pro 1,500 は $30 / $99 = 30.3%（超過）、Pro 1,000 は $20 / $99 = 20.2%（以内）→ その場合は Pro だけ ~1,000 に下げる。**2,000 には戻さない。** `retry_without_proxy` 行は C に使わない。

**② Business economics / 損益分岐** — 実際の平均利用率。Browserless $200 は固定費で C に混ぜない。

`月額売上 − 実利用 Observation 変動費 − 決済手数料 = 1顧客あたり貢献利益`

`月間固定費（Browserless $200 ＋その他）÷ 1顧客あたり貢献利益 = 最低有料顧客数`

Starter / Pro の構成比を入れる（例: Starter 70% / Pro 30% なら損益分岐 ○ 社）。

今は **500 / 1,500 維持 → residential 実測収集**。計測項目は増やさない。

現行 Browserless Cloud は **Starter 180,000 units / $200**。Billing の **超過上限は $20**（ダッシュボードで設定。環境変数ではない）。州の `proxyState` は 401 のため、既定は **国単位 residential**（US-CA は `us`）。**State Geo は Starter では保証しない。** Scale と `VIEWTRACE_BROWSERLESS_PROXY_STATE=1` のときだけ州指定。住宅プロキシが通ると 1 Observation が 1 unit ではなくなる。

フォールバックは **州 → 国 → proxyなしを直列**（並列に投げない）。成功した経路だけを `geo` に書く。US-CA を選んでも `proxyCountry=us` だけで取れた場合、UI は California と書かない。見出しは観測事実（例: United States）。区別が必要なときは **Requested / Observed via**。

Watch 最短頻度: Starter は 1 日 1 回。Pro は 6 時間ごと（daily repeat 最大 4）。Cron は毎時。作成画面に月間予想消費量とプラン枠を出す。

## 公開リンク（現行 `/verify/[token]`）

Observation を他人に見せるページ。再検証エンジンではない。**集客機能ではなく納品・共有機能**。代理店がクライアントへ渡す用途に残す。

画面・観測日時・地域・URL / final URL・ページメタデータ・取得条件・共有URLコピー・PDF保存・Powered by ViewTrace を載せる。成長ループのフォームは足さない。Verify → Observation を北星 KPI にしない。

今すぐ削除しない。Powered by ViewTrace も残す。

`verify_events` は公開リンクの利用ログとして残してよい。新規イベントは増やさない。

## Phase B 以降（未承認）

保存済み Screenshot の Analyze with AI。追加撮影なし。Vision。回数制限。

## ゲート

確認して入った人が Observation を繰り返し使わなければ、Scout を作らない。

公開リンクから新規 Observation が増えても、Activation の代わりにはしない。

## 今追加してよいテーブル

- 既存の `auth.users` / `observations` で Activation は測れる
- `verify_events`（公開リンクの利用。新規イベントは増やさない）
- `ai_analyses`（Phase B 承認後）

大きなスキーマは、Activation の検証の後。

## 既存資産

- Observation の取得・保存・ダッシュボード
- `/verify/[token]` 公開リンク
- レポートの Powered by CTA
