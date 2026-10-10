# 現行の実装方針

- **状態:** Activation 計測は固定。Activation UI は母数が小さいうちはいじらない。Observation の価値を強くする新機能は進めてよい。Verify を成長ループの主役にしない。事実以上は Observation に混ぜず、別商品として足してよい。
- **記録日:** 2026-10-04
- **置き換え:** 新機能を全部止める、ではない。芯は Observation。解釈は上に載せる。
- **一言:** 価値は Observation。流れは Observe → Observe again → Compare → Share。1 Capture = 1 Observation。本番の撮影出口は Browserless。観測記録は事実だけ。事実以上は **AIサイト分析（読み）** として、既存記録の上に売る。
- **今やること:** 既存 Observation の事実レイアウト整理（スコアなし）。読みを差し込める空きを残す。その次が Share Collection。AIサイト分析の実装は、そのあと。

各段階は「機能が完成したか」ではなく、**次へ進む根拠となる行動データが出たか**で判断する。

---

## 1. 固定（プロダクトの芯）

本体は Observation。`URL × 地域 × 時点 → 実際の表示を取得 → 記録`。

**1 URL × 1 Region × 1 Capture = 1 Observation**

プロダクトの流れは一本だけ:

**Observe → Observe again → Compare → Share**

Time Compare と Region Compare は別軸。Before / After は別ページにしない。

- **Time Compare** — 同じ URL 識別子 + 同じ地域 + 時点 A/B → 時間で何が変わったか
- **Region Compare** — 同じ URL 識別子 + 地域 A/B + 最も近い時点 → 地域で何が違ったか

URL 識別子は query を残す（`?campaign=A` と `?campaign=B` は別の着地）。Final URL は識別に使わず、比較フィールド。どちらも既存 Observation のみ。比較の撮影原価は増えない。

**Screenshot は三値のみ:**

- Same → 同じ撮影条件で画像指紋が一致
- Changed → 同じ撮影条件で画像指紋が不一致（= screenshot content differs。Page changed とは言わない）
- Not comparable → 撮影条件が違うので、画像差について結論を出さない

動的コンテンツ、Cookie banner、時刻、広告、アニメーションでも SHA は変わり得る。Title / Description / Canonical などは画像と独立して比較する。撮影範囲（Full page / Viewport）や viewport サイズが違うときは Not comparable。SHA 差をページ差と読ませない。Side by side は常に見せる。Monitor / Change Alert もこの三値を再利用する。条件不一致の自動観測を「ページが変わった」と通知しない。

既存製品の記録面は observational（納品保証ではない）。

### 二層（事実と商品）

芯は変えない。足すのは層です。

**① Observation（記録・無料で付く本体）**  
Requested / Observed / Screenshot 三値 / html_signals / 取得条件。ここには Improved / Worse / スコア / 要対応を書かない。**記録の中では、観測できた事実以上を断定しない。**

**② AIサイト分析（読み・監査・事実以上の商品）**  
既存 Observation の上にだけ載せる。追加撮影しない。Browserless 経路を変えない。Compare / Share / SHA と同じく Observation 消費は 0。AI 原価は別計測。クレジットパックにはしない。

監査は入れてよい。単位はサイト全体ではなく、**今ある 1 Observation、またはその Compare**。未撮影の下層は見に行かない。全体巡回は別アクション（17）で、今は作らない。

画面上は必ず分ける。日本語は **記録** と **監査（AI）**。

- 記録 — 観測できた事実（Requested / Observed / 三値 / html_signals）
- 監査（AI） — その記録を見て書いた指摘。Observed ではない。納品保証ではない

入れてよい監査:

- 画面に何が見えるか（ヒーロー、CTA、言語、通貨、Cookie バナー）
- 地域差・時点差（東京と US でヒーローが違う、Title は変わった）
- このページについての指摘（CTA が埋もれている、言語が地域と食い違う、title が空、など）
- 記録の言い換え（三値とメタ差を短くまとめる）

まだ出さない:

- 測っていない Performance / SEO / Accessibility の数字
- Core Web Vitals / ラボ性能（撮っていない値を作らない）
- 未撮影ページのサイト全体 SEO 監査

Verify / Share に載せるときは、監査を記録の下に置き、AI の推定だと分かるラベルを付ける。成長フォームは足さない。

### KPI（分ける）

**登録数 → メール確認数 → 初回 Observation → 2回目 Observation**

- 登録 → 確認 = Auth / メール（入口）
- 確認 → 初回 Observation = Activation
- 初回 → 2回目 Observation = Repeat usage

これで次のどれかが一目で分かる。登録は増えているのに確認されない / 確認はされるが初回 Observation が作られない / 初回は作られるがリピートされない。

内部アカウントと既知のテストアドレスは「外部」の分母から外す。方法は `ACTIVATION_EXCLUDE_EMAILS`（検証用。管理権限は付かない）、`ADMIN_EMAILS`、`@viewtrace.net`。仕組みを増やさない。リストに無い個人アドレスが1件残ると、n が小さいうちは率を大きく動かす。

確認メールの到達性は、未確認の中に typo・再登録・重複が混ざるうちは調べない。本物と思われる新規が数件〜十数件増え、正常なアドレスでも未確認が続くとき初めて見る。

本番の「外部」数字をローカルと揃えるため、`ACTIVATION_EXCLUDE_EMAILS` は Vercel の Production / Preview / Development にも置く。次のデプロイ以降で本番管理画面に乗る。計測コードの追加デプロイがまだなら、変数だけでは反映されない。

Activation **計測**は固定。Activation **UI**は母数が小さいうちはいじらない。

`/verify/[token]` は削除しない。成長ループではなく、**Share の公開サーフェス**。名前を変えるのは利用が確認されてからでよい。Verify → 次の Observation を北星 KPI にしない。Powered by ViewTrace は残す。`verify_events` は公開リンクの利用ログとして残してよい。新規イベントは増やさない。

### 新機能の条件

追加してよいのは、次のいずれかに当てはまるものだけ。

- Observation を作る理由になる
- 2回目の Observation を作る理由になる
- 既存 Observation の価値を強くする
- 既存 Observation の上に、事実と分けて売る解釈になる

$49 / $99 の差は、既存機能を Starter から取り上げるのではなく、**件数・保存期間・地域・Watch 頻度・CSV / クライアント運用**で付ける。撮影範囲は trial / Starter / Pro ともフルページ。粗利監視は PNG 容量ではなく **Residential 転送 MB / Observation の中央値と P90**。500 回が変動費の防波堤。

---

## 2. 実行計画

番号は社内リスト（1–37）と対応する。上から順に進める。下の段階を先に作らない。

### 今やってよい（見た目だけ）

既存の事実を読みやすくする。新しい判定・新しい原価・新しい出口は足さない。

| # | 方針 | 内容 |
| --- | --- | --- |
| 36 | 進めてよい | 既存 Observation を、事実ブロックとして整列する。記録面に Performance / SEO / Accessibility スコアは出さない。Page Signals は記録の下の参考指標 |
| 40 | 承認 | Page Signals。html_signals だけの減点（重大 -25 / 重要 -10 / 軽微 -3）。Observed ではない。根拠を必ず出す。SEO / Performance / A11y とは書かない |
| 37 | 進めてよい | そのレイアウトを AI に組ませる。レイアウト AI ≠ ページ診断 AI |

36 / 37 は解釈商品そのものではない。保存済みの title / description / canonical / robots / OG / Requested vs Observed / Screenshot 三値を、人が追いやすい順に並べる。解釈ブロックを後から差し込める形にしておく。

### もうある / 出荷済

| # | 方針 | 内容 |
| --- | --- | --- |
| 1 | 出荷済 | Observation（URL × 地域 × 時点） |
| 2 | 出荷済 | Observe again → Compare（Time / Region） |
| 3 | 出荷済 | Screenshot 三値（Same / Changed / Not comparable） |
| 4 | 出荷済 | html_signals（title / description / canonical / robots / OG）常時表示。選ばせない |
| 5 | 出荷済 | Watch（Monitor v1）+ 任意のメタ差分メール。Changed のときだけ Screenshot 通知 |
| 6 | 出荷済 | Multi-region Run |
| 7 | 出荷済 | Verify / 公開シェア。成長ループにはしない |
| 8 | 出荷済 | CSV / 証跡 JSON |
| 9 | 出荷済 | 日本 · 東京（`JP-13`）を地域候補に追加。Requested として出す。Observed は検証できたときだけ東京と書く |

Compare は一旦完成（Slider 以外）。html_signals の商品化は既存データのみなので、表示の整理は続けてよい。

### 次に足す（決めてある）

| # | 方針 | 内容 |
| --- | --- | --- |
| 10 | 次 | Share Collection。複数 Observation を1リンク。単独の売る理由ではなく作業の楽さ |
| 38 | その次（AIサイト分析） | 1 Observation と Compare の監査（AI）。記録と分けて出す。追加撮影なし |
| 19 | 38 の中身 | Vision AI（既存スクショを AI が読む）。「東京と US でヒーローが違う」は可。「Performance が弱い」は不可 |
| 11 | 出荷（条件一致時） | Time Compare の Slider。viewport・画像高さ・full-page が一致するときだけ。条件不一致は Side by side のみ。判定は三値のまま |
| 12 | その先（Pro 運用） | Client / Project まとめ、Compare 公開、定期レポート。CSV は既にある。レポート本文に Interpreted を載せてよい |

11 は Before / After の別ページではない。Time Compare の表示モードを1つ足すだけ。条件不一致は Slider を出さない。

### Geo / 出口（実験。本番 Observation は Browserless）

本番ユーザーの撮影経路は変えない。将来の自社基盤は **Playwright Worker + 外部 Residential IP**。Browserless を前提にした設計にはしないが、**フラグを切るまで本番出口は Browserless**。顧客に SOCKS / IP は売らない。IP pool は Observation 内部だけで使う。

自社で持つもの: Observation Worker、Playwright / Chromium、キュー、タイムアウト、隔離、MB 計測（未測定は null）、Requested の選択、出口 IP の独立検証、スクショ / html_signals 保存。  
外部から買うもの: Residential IP / 帯域。住宅回線の供給網そのものは別事業なので今はやらない。

切替は `VIEWTRACE_CAPTURE_BACKEND=playwright_worker`（Worker URL と secret も必須）。未設定時は Browserless。Browserless への静かなフォールバックはしない。

| # | 方針 | 内容 |
| --- | --- | --- |
| 27 | 本番 | Browserless 内蔵 residential。現行の本番出口 |
| 28 | 予備 | 外部プロキシ（Decodo 等）を Browserless に繋ぐ。必要になるまで使わない |
| 29 | 実験可 | Cloud Run 等の国レベル datacenter Worker |
| 30 | 実験・証明済 | 自社 pull Node（`agent.mjs`）。家庭側のポート開放は不要 |
| 31 | 実験・手元に回線あり | Tokyo Residential Node。同意済み現地回線。本番ルーティングにはまだ繋がない |
| 32 | 実験・証明済 | US 国レベル datacenter Node。Observed は Iowa datacenter として事実記録 |
| 33 | 回線が先 | California 等の州 Residential Node。物理 / residential 出口が無い州は候補に出さない |
| 34 | まだやらない | 自社 50州ネットワーク。州を UI に足すのは各州の出口ができたあと |
| 35 | 商品化は後 | Tokyo Observation を商品として売る（Proxy ではなく記録を売る）。IP 再販ではない |
| 39 | 実験・未接続 | 自社 Observation Worker（`workers/observation-worker`）。Playwright + 外部 residential。Requested と Observed を分ける。本番は 27 のまま |

Requested と Observed は分けて書く。自己申告の Node 所在地を Observed にしない。US-CA を選んでも国単位で取れたら California と表示しない。見出しは観測事実。区別が必要なときは **Requested / Observed via**。

**State Geo は Starter では保証しない。** US 州を選んだ Observation は `proxyState` を先に付ける。拒否・失敗したら国単位へ落とす。フォールバックは **州 → 国 → proxyなしを直列**（並列に投げない）。成功した経路だけを `geo` に書く。US-CA を選んでも国単位で取れたら California と表示しない。無効化は `VIEWTRACE_BROWSERLESS_PROXY_STATE=0`。

### 事実以上の商品（Observation の上に載せる）

撮影出口は Browserless のまま。解釈は既存記録だけを読む。

| # | 方針 | 内容 |
| --- | --- | --- |
| 38 | 承認・後で実装 | AIサイト分析。1ページ（1 Observation）と Compare の読み |
| 19 | 承認・38 に使う | Vision AI。既存スクショのみ。追加撮影なし |
| 12 の読み | 承認・後で実装 | 定期レポート / Share に読みを載せる。記録の下 |
| 40 | 承認 | Page Signals。html_signals だけの減点参考値。記録の下。根拠必須。Watch メールには既存通知へ `92 → 61` を添えるだけ（新通知は増やさない） |
### 記録に混ぜない / 今は本体にしない

| # | 方針 | 理由 |
| --- | --- | --- |
| 13 | 記録に混ぜない | 測っていない Performance / SEO / Accessibility の数字。数字を出すなら実測してから |
| 14 | 監査側に出してよい | この Observation についての指摘。未撮影ページの要対応リストにはしない |
| 15 | 記録に混ぜない | Core Web Vitals / ラボ性能。現場の Observed ではない |
| 16 | 今はやらない | 転送量・JS/CSS 内訳。計測項目を増やし、原価設計を再開してしまう |
| 17 | 後回し | サイト全体 SEO crawler / broken-link。本体が Observation でなくなる |
| 18 | 記録に混ぜない | AI SEO 診断 / 監査要約。38 とは別物 |
| 20 | 未承認 | Free AI Visual Checker。無料入口。Verify を集客にしない |
| 21 | 未承認 | AI Scout。別事業 |
| 22 | 未承認 | Apollo / Outreach。別事業 |
| 23 | しない | Verify を KPI の主役にする |
| 24 | しない | Before / After を別ページにする |
| 25 | しない | クレジットパック販売。月間 Observation 数で止める。解釈もパック販売にしない |
| 26 | しない | Tokyo Residential Proxy の再販（IP を売る） |

ゲート: 確認して入った人が Observation を繰り返し使わなければ、無料入口（20）や Scout（21）は作らない。公開リンクから新規 Observation が増えても、Activation の代わりにはしない。38 / 19 は既存 Observation の価値を強くするので、Repeat 待ちの禁止対象ではない。実装順は 36 → 10 → 38/19。

---

## 3. 課金・原価・Watch（固定）

- 手動 1 地域 → 1
- Multi-region 6 地域 → 6
- Watch 1 URL × 1 地域 → 1 / 実行
- Watch 5 URL × 3 地域 → 15 / 実行
- Compare / Share / SHA 判定 / Interpretation（既存記録を読むだけ） → 0

残量が足りなければ開始しない（Multi-region と同じ）。Watch は当該 tick で due な件数を必要数とし、残り < 必要なら **バッチ全体をスキップ**（20 残で 30 必要なら 20 件だけ走らせない）。

月間上限に達したら自動停止。超過従量課金はしない。文言は “You've reached your monthly Observation limit. Upgrade to continue.”

Starter $49 → **500 仮置き維持**。Pro $99 → **1,500 仮置き維持（確定しない）**。**2,000 には戻さない。** 撮影は trial も含めフルページ。上限の変更より先に、residential が通った Observation の **proxy MB → units → $/Observation** を実測する（PNG MB ではない）。`retry_without_proxy` の平均 units は将来原価に使わない（Geo 正常時を過小評価する）。

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

現行 Browserless Cloud は **Starter 180,000 units / $200**。Billing の **超過上限は $20**（ダッシュボードで設定。環境変数ではない）。住宅プロキシが通ると 1 Observation が 1 unit ではなくなる。

Watch 最短頻度: Starter は 1 日 1 回。Pro は 6 時間ごと（daily repeat 最大 4）。Cron は毎時。作成画面に月間予想消費量とプラン枠を出す。

---

## 4. 公開リンク（現行 `/verify/[token]`）

Observation を他人に見せるページ。再検証エンジンではない。**集客機能ではなく納品・共有機能**。代理店がクライアントへ渡す用途に残す。

画面・観測日時・地域・URL / final URL・ページメタデータ・取得条件・共有URLコピー・PDF保存・Powered by ViewTrace を載せる。Interpreted を載せるときは Recorded の下に置き、推論だと分かるラベルを付ける。成長ループのフォームは足さない。

今すぐ削除しない。Powered by ViewTrace も残す。

---

## 5. いま分かっている2つの問題（別物）

### 1. 登録 → メール確認

未確認が多い。typo・再登録・重複が混ざる。10/18 未確認でも確認メールに問題があるとは言えない。本物と思われる新規が数件〜十数件増え、正常なアドレスでも未確認が続くとき初めて、到達性・文面・再送・登録後画面を見る。

### 2. メール確認 → 初回 Observation

プロダクト UX として重要。確認後の着地は `/dashboard`（概要・プラン・空の一覧）。初回ユーザーに「次に何をすれば価値を体験できるか」が弱い可能性がある。

対象がごく少数のうちは、即 UI 改修しない。今後の新規確認済みユーザーで同じ離脱が続くかを先に見る。

検討案（未実装）: 初回ログイン時だけ、URL × 地域 → Observation 作成を主役にする。

---

## 6. 今追加してよいテーブル

- 既存の `auth.users` / `observations` で Activation は測れる
- `verify_events`（公開リンクの利用。新規イベントは増やさない）
- `geo_nodes` / `geo_node_jobs`（内部実験。RLS で anon / authenticated から隔離。本番 Observation には使わない）
- `ai_analyses`（38 / 19。Observation 本体ではない。Interpreted として保存）

大きなスキーマは、Activation の検証の後。

## 既存資産

- Observation の取得・保存・ダッシュボード
- `/verify/[token]` 公開リンク
- レポートの Powered by CTA
- Watch / Multi-region / Compare / html_signals / CSV / 証跡 JSON
- `JP-13`（日本 · 東京）の Requested 候補
- Geo Node 制御プレーン（実験。本番撮影経路には未接続）
