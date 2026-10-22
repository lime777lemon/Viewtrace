# 現行の実装方針

- **状態:** 大規模機能は止めない。次に足す順は **36 → 41 → 42 → 38/19 → 12**。カテゴリーは Website Monitoring for Digital Agencies。Activation 計測は残す。Activation UI はいじらない。Verify を成長ループの主役にしない。
- **記録日:** 2026-10-13
- **置き換え:** 「30 日は大規模な新機能を止める」は撤回。Observation の価値を強くする新機能は進めてよい。Agency Monitor → Watch → Alert → Compare も磨く。Scout / RUM / 50 州 / クレジットは今は作らない。
- **カテゴリー:** Website Monitoring for Digital Agencies（Geo-aware Website QA）。Screenshot SaaS / Visualping 互換 / AI Website Audit にはしない。
- **一文:** Know which client websites need attention before your clients do.
- **下の説明:** Monitor visual changes, SEO issues and regional differences across all your client websites from one dashboard.
- **一言（実装）:** エンジンは Observation（`URL × 地域 × 時点`）。顧客が毎日見るのは Agency Monitor。AI は最後の読み。Requested と Observed は混ぜない。$15 / $39 は動かさない。
- **今やること:** 36 事実レイアウト。隣に 41（既存ハッシュの見せ方）。次に 42（Changed の下のメタ差）。38 の構造化監査（What changed / Impact / Evidence）は Observation 詳細に載せる。19（Vision）は 38 の中。37（レイアウト AI）は 41 より先にしなくてよい。12（Client / Project / Agency 価格）は 38 のあと。Agency Monitor も磨く。50 州ネットワーク・RUM・Scout はしない。

各段階は「機能が完成したか」ではなく、**次へ進む根拠となる行動データが出たか**で判断する。

---

## 1. 固定（プロダクトの芯）

本体は Observation。`URL × 地域 × 時点 → 実際の表示を取得 → 記録`。

**1 URL × 1 Region × 1 Capture = 1 Observation**

エンジンの流れは一本:

**Observe → Observe again → Compare → Share**

顧客が買う流れは一本:

**Agency Monitor → Watch → Alert → Compare**

代理店担当者は Observation を作りたいのではない。欲しいのは **Which clients need my attention today?** エンジン（Observation）は見せすぎない。Monitor から Compare へ落ちる。

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

### 三層（エンジン・読み・毎日見る面）

芯の記録モデルは変えない。売る単位を変える。

**① Observation Engine（裏側）**  
`URL × Location × Time`。Browserless / Screenshot 三値 / html_signals / Final URL / HTTP / Canonical / Noindex / Lang / Requested と Observed。顧客にはあまり見せなくてよい。ここには Improved / Worse / 要対応を書かない。**記録の中では、観測できた事実以上を断定しない。**

**② Intelligence（読み）**  
Changed / Broken / 地域差 / 想定外リダイレクト / CTA 欠落 などは、①の事実から変換する。推定とラベルする。Page changed とは言わない。AI はここ。**AI が価値なのではなく Observation Data が価値。** 「AI がサイトを監査します」とは言わない。

**③ Agency Monitor（毎日見る面）**  
Need attention / Opportunities / Healthy。クリックして「どのクライアントの、どの地域の、何が昨日と違うか」→ Compare。方向は正しい。本体の Observation 詳細より、こちらを商品として磨く。

普通の **AI Website Audit** にはしない。Visualping 互換の機能一覧にもしない。楔は **顧客より先に、どのクライアントサイトを見るべきかが分かること**。Geo（広告 LP・地域価格・consent・キャンペーン）は捨てない。50 州自社網は PMF ではないので今は作らない。

普通の **AI Website Audit**（SEO / Performance / A11y / サイト採点）にはしない。Semrush / Ahrefs / $5〜$50 級の監査 SaaS と同じ土俵に乗らない。楔は **いつ・どの地域で・スクショとメタのどれが違い・それがなぜ重要か**。商品名は **AI Change Audit**（1 件を読む監査は残してよいが、先に出すのは変化側）。

監査は入れてよい。単位はサイト全体ではなく、**今ある 1 Observation、またはその Compare**。サイト全体巡回は別アクション（17）で、今は作らない。下層は **スクショなし・同じホスト最大 N件・プラン内オプション** だけ。記録の Observed には混ぜない。

画面上は必ず分ける。日本語は **記録** と **監査（AI）**。順は **記録 → 検出した事実 → 監査（AI）**。

- 記録 — 観測できた事実（Requested / Observed / Screenshot 三値 / html_signals / ハッシュ）
- 検出した事実 — SHA ではなく、title / canonical / robots / OG などの差。Changed の下。Page changed とは書かない
- 監査（AI） — その記録を見て書いた指摘。Observed ではない。納品保証ではない

入れてよい監査:

- What changed（スクショ上で何が見える差か。ヒーロー・CTA・言語・通貨。推定とラベルする）
- Potential impact（High 等。スコア 72/100 は出さない。根拠になった信号へ戻れる）
- Why this matters / Recommended check（確認してよいことまで。Google Ads 等の利用を断定しない）
- 地域差・時点差の言い換え（東京と US でヒーローが違う、Title は X → Y）

まだ出さない:

- 測っていない Performance / SEO / Accessibility の数字（測ったラボ CWV と CrUX フィールドは記録の下のオプションに出す。混ぜない）
- ラボ INP（Lighthouse には操作が無いのでフィールドデータなし。失敗ではない）
- 未撮影ページのサイト全体 SEO 監査・全件クロール
- AI Score / UX Score / AI Readiness などの総合点
- Page changed（三値の Changed は screenshot content differs のまま）

画素差の百分率は、撮影条件が揃ったときだけ事実として出してよい。ページが N% 変わった、とは書かない。

Verify / Share に載せるときは、監査を記録の下に置き、AI の推定だと分かるラベルを付ける。成長フォームは足さない。Watch の毎回・全件には自動で走らせない。Changed のとき、利用者が押した件数だけ。

### KPI（分ける）

入口の計測は残す（母数が小さいうち UI はいじらない）:

**登録数 → メール確認数 → 初回 Observation → 2回目 Observation**

事業の北星は登録数ではない。入口と別に追う:

**Demo → Pilot → Client added → Alert viewed → Compare viewed → Week-2 active → Paid**

対象は Performance / PPC / SEO / Web Agency。目標はデモ約 20、pilot 3。Signup だけ追うのはやめる。売却を考えるときも、機能数より ICP と 3〜5 社の pilot・継続利用の方が評価される。

内部アカウントと既知のテストアドレスは「外部」の分母から外す。方法は `ACTIVATION_EXCLUDE_EMAILS`（検証用。管理権限は付かない）、`ADMIN_EMAILS`、`@viewtrace.net`。仕組みを増やさない。リストに無い個人アドレスが1件残ると、n が小さいうちは率を大きく動かす。

確認メールの到達性は、未確認の中に typo・再登録・重複が混ざるうちは調べない。本物と思われる新規が数件〜十数件増え、正常なアドレスでも未確認が続くとき初めて見る。

本番の「外部」数字をローカルと揃えるため、`ACTIVATION_EXCLUDE_EMAILS` は Vercel の Production / Preview / Development にも置く。次のデプロイ以降で本番管理画面に乗る。計測コードの追加デプロイがまだなら、変数だけでは反映されない。

Activation **計測**は固定。Activation **UI**は母数が小さいうちはいじらない。

`/verify/[token]` は削除しない。成長ループではなく、**Share の公開サーフェス**。名前を変えるのは利用が確認されてからでよい。Verify → 次の Observation を北星 KPI にしない。Powered by ViewTrace は残す。`verify_events` は公開リンクの利用ログとして残してよい。新規イベントは増やさない。

### 新機能の条件

大規模機能は止めない。次に足す順は **36 → 41 → 42 → 38/19 → 12**。

足してよい条件:

- Observation を作る理由、2回目を作る理由、Observation の価値を強くする
- 既存 Observation の上に、事実と分けて売る解釈になる（AI を前面に出さない）
- 今日見るクライアントが分かることになる
- Watch / Alert を開く理由になる
- Compare まで落ちて判断できる

追加 Observation が 0。根拠なしのスコアを出さない。Scout / RUM / 50 州 / クレジットパックは今は作らない。

$15 / $39 は動かさない。表の主役を「500 Observations」から **Small agencies / Growing agencies（何社見られるか）** へ寄せる余地はある。Observation は内部の原価単位のまま。Change Audit は **AI を使ったから値上げ**しない。クレジットパックにはしない。Starter でも検出した事実（メタ差）は出す。Agency 利用と「Compare を毎回目視しなくて済んだ」が確認できてから **Agency $149〜$199** を試す余地がある。撮影範囲は trial / Starter / Pro ともフルページ。粗利監視は PNG 容量ではなく **Residential 転送 MB / Observation の中央値と P90**。500 回が変動費の防波堤。

---

## 2. 実行計画

番号は社内リスト（1–37）と対応する。次に足す順は **36 → 41 → 42 → 38/19 → 12**。Agency Monitor → Watch → Alert → Compare も磨く。下の段階（Scout、RUM、50 州、クレジット）を先に作らない。

### 今やってよい

既存の事実を読みやすくする。解釈（38 / 19）は 42 のあと。Monitor の「今日見るクライアント」が短くなる変更も進めてよい。

| # | 方針 | 内容 |
| --- | --- | --- |
| 36 | 今やる | 既存 Observation を、事実ブロックとして整列する。記録面に Performance / SEO / Accessibility スコアは出さない。Page Signals は記録の下の参考指標 |
| 41 | 36 の隣 | 既存の `snapshot_sha256` / `content_hash` / 記録 ID / 確認記録シールを、記録面に統合して見せる。Python 必須ではない。SHA は「同じか違うか」まで。何が変わったかは 42 |
| 42 | 36 の次 | Compare の Changed の下に、既にある title / canonical / robots / OG などの差を事実で並べる。三値は壊さない |
| 40 | 承認・出荷済 | Page Signals。html_signals だけの減点（重大 -25 / 重要 -10 / 軽微 -3）。Observed ではない。根拠を必ず出す。SEO / Performance / A11y とは書かない |
| 37 | 36 のあとでよい | そのレイアウトを AI に組ませる。レイアウト AI ≠ ページ診断 AI。41 / 42 を待つ必要はないが、37 を 41 より先にしなくてよい |

36 / 37 / 41 / 42 は解釈商品そのものではない。保存済みの title / description / canonical / robots / OG / Requested vs Observed / Screenshot 三値 / ハッシュを、人が追いやすい順に並べる。解釈ブロック（38）を後から差し込める形にしておく。

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
| 10 | 出荷済 | Share Collection。複数 Observation を1リンク |
| 11 | 出荷済（条件一致時） | Time Compare の Slider。viewport・画像高さ・full-page が一致するときだけ。条件不一致は Side by side のみ。判定は三値のまま |
| 40 | 出荷済 | Page Signals（html_signals 減点の参考値） |

html_signals の商品化は既存データのみなので、表示の整理は続けてよい。11 は Before / After の別ページではない。

### 次に足す（決めてある）

| # | 方針 | 内容 |
| --- | --- | --- |
| 36 → 41 → 42 | 今 | 事実レイアウト、既存ハッシュの見せ方、Changed の下のメタ差 |
| 38 | 実装（構造） | Compare（先）と 1 Observation の監査。What changed / Impact / Evidence / Recommended check。追加撮影なし。希望した件数だけ。月あたり一定回数は Pro で検証 |
| 19 | 38 の中身 | Vision AI（既存スクショを AI が読む）。「東京と US でヒーローが違う」は可。「Performance が弱い」は不可。推定とラベルする |
| 12 | 38 のあと（Pro / Agency 運用） | Client / Project まとめ、Compare 公開、定期レポート。CSV は既にある。レポート本文に Interpreted を載せてよい。Agency $149〜$199 は価値確認後 |

実装順は **36 → 41 → 42 →（37 がまだ必要なら）→ 38 / 19 → 12**。10 は出荷済なので間に入れない。

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

**State Geo は Starter では保証しない。** US 州を選んだ Observation は、REST `/screenshot` で同じ州の代表都市 `proxyCity` を先に付ける（Scale 未満は 401 になり得る）。失敗したら国単位。都市マップが無いときだけ `proxyState` を試す。フォールバックは **都市 → 州 → 国 → proxyなしを直列**（並列に投げない）。成功した経路だけを `geo` に書く。US-CA を選んでも国単位で取れたら California と表示しない。無効化は `VIEWTRACE_BROWSERLESS_PROXY_STATE=0`。

### 事実以上の商品（Observation の上に載せる）

撮影出口は Browserless のまま。解釈は既存記録だけを読む。

| # | 方針 | 内容 |
| --- | --- | --- |
| 38 | 実装（構造） | AI Change Audit。What changed / Potential impact / Recommended check。Impact は根拠信号へ戻る。点数・円グラフなし。Compare があるとき先に読む。記録の下。Observed ではない |
| 19 | 承認・38 に使う | Vision AI。既存スクショのみ。追加撮影なし |
| 12 の読み | 承認・38 のあと | 定期レポート / Share に読みを載せる。記録の下 |
| 40 | 承認・出荷済 | Page Signals。html_signals だけの減点参考値。記録の下。根拠必須。Watch メールには既存通知へ `92 → 61` を添えるだけ（新通知は増やさない） |
| 15 オプション | 実装 | ラボ CWV。記録の下。押した件数だけ。プラン内回数。LCP / CLS / TBT。ラボ INP は出さない |
| 15b オプション | 完成 | フィールド CWV（CrUX）。ラボと別セクション。INP / LCP / CLS。URL → Origin → no_data。no_data も正常。CrUX の代替測定は作らない |
| 15d オプション | 実装 | 合成操作テスト。安全なクリック 1〜3。Field INP と呼ばない。任意 URL。Watch では自動実行しない |
| 15c | 後回し。優先しない | ViewTrace RUM。自サイトに script を置いた実ユーザー。第三者サイトには置けない。今は上げない |
| 17 一部 | 実装 | 下層 html_signals 採点。スクショなし。同じホスト最大 N |

操作応答は層を混ぜない。

| 層 | 指標 | 実ユーザー | 対象 | 今 |
| --- | --- | --- | --- | --- |
| ラボ（Lighthouse） | LCP / CLS / TBT / FCP。INP は出ない | いいえ | 任意 URL | 実装済 |
| 合成操作 | Click response。**INP と呼ばない** | いいえ | 任意 URL | 実装済。安全な 1〜3 クリック |
| フィールド（CrUX） | INP / LCP / CLS | はい | CrUX 掲載時 | **完成**。no_data は正常 |
| ViewTrace RUM | 実ユーザー INP | はい | **自サイトだけ** | 作らない。優先しない |

第三者は、CrUX に載っていれば Field、無ければ Field なし。合成は補完であり Field INP ではない。RUM script は置けない。CrUX に数字を出させる機能は足さない。

### 記録に混ぜない / 今は本体にしない

| # | 方針 | 理由 |
| --- | --- | --- |
| 13 | 記録に混ぜない | 測っていない Performance / SEO / Accessibility の数字。数字を出すなら実測してから |
| 14 | 監査側に出してよい | この Observation についての指摘。未撮影ページの要対応リストにはしない |
| 15 | 記録に混ぜない。プラン内オプション | ラボ Core Web Vitals（Browserless `/performance`）。Observed ではない。毎回は走らせない。Starter 月 10 / Pro 月 30 / trial 月 2。$15 / $39 は動かさない。クレジットパックにしない。Watch では自動実行しない |
| 15b | 記録に混ぜない。プラン内オプション。**完成** | フィールド CWV（CrUX API）。ラボと混ぜない。Lab LCP ≠ Field LCP。URL 単位 → Origin 単位 → no_data。no_data も正常な保存結果。再取得は手動の補助（数分では変わらない）。ラボ実行で既に保存済みなら CrUX を取り直さない。毎回の Observation には自動で載せない（枠は trial 10 / Starter 50 / Pro 150）。撮影・AI なし。Watch では自動実行しない。CrUX の代替測定は作らない |
| 15d | 記録に混ぜない。プラン内オプション | 合成操作テスト（Browserless で安全なクリック 1〜3）。任意 URL。Field INP と呼ばない。表示は Interaction latency / Synthetic。購入・送信・削除・ログアウトは押さない。trial 月 2 / Starter 月 10 / Pro 月 30。Watch では自動実行しない。毎回の Observation には載せない |
| 15c | 後回し。優先しない | ViewTrace RUM（自サイトへ `rum.js` を置く実ユーザー INP）。CrUX の穴埋めではない。第三者サイトには設置できない。本体は Agency Monitor / 外部 Observation なので今は上げない。合成操作を Field INP と呼ばない |
| 16 | 今はやらない | 転送量・JS/CSS 内訳。計測項目を増やし、原価設計を再開してしまう |
| 17 | 後回し（全体）/ 一部オプション | サイト全体 SEO crawler は作らない。下層はスクショなし・同じホスト最大 trial 3 / Starter 5 / Pro 10。html_signals 採点のみ。Observation は消費しない |
| 18 | 記録に混ぜない | AI SEO 診断 / 監査要約。38 とは別物 |
| 20 | 未承認 | Free AI Visual Checker。無料入口。Verify を集客にしない |
| 21 | 未承認 | AI Scout。別事業 |
| 22 | 未承認 | Apollo / Outreach。別事業 |
| 23 | しない | Verify を KPI の主役にする |
| 24 | しない | Before / After を別ページにする |
| 25 | しない | クレジットパック販売。月間 Observation 数で止める。解釈もパック販売にしない |
| 26 | しない | Tokyo Residential Proxy の再販（IP を売る） |

ゲート: 確認して入った人が Observation を繰り返し使わなければ、無料入口（20）や Scout（21）は作らない。公開リンクから新規 Observation が増えても、Activation の代わりにはしない。38 / 19 は既存 Observation の価値を強くするので、Repeat 待ちの禁止対象ではない。実装順は **36 → 41 → 42 → 38/19**。10 は出荷済。

---

## 3. 課金・原価・Watch（固定）

- 手動 1 地域 → 1
- Multi-region 6 地域 → 6
- Watch 1 URL × 1 地域 → 1 / 実行
- Watch 5 URL × 3 地域 → 15 / 実行
- Compare / Share / SHA 判定 / Interpretation（既存記録を読むだけ） → 0

残量が足りなければ開始しない（Multi-region と同じ）。Watch は当該 tick で due な件数を必要数とし、残り < 必要なら **バッチ全体をスキップ**（20 残で 30 必要なら 20 件だけ走らせない）。

月間上限に達したら自動停止。超過従量課金はしない。文言は “You've reached your monthly Observation limit. Upgrade to continue.”

Starter $15 → **500 仮置き維持**。Pro $39 → **1,500 仮置き維持（確定しない）**。**2,000 には戻さない。** 撮影は trial も含めフルページ。上限の変更より先に、residential が通った Observation の **proxy MB → units → $/Observation** を実測する（PNG MB ではない）。`retry_without_proxy` の平均 units は将来原価に使わない（Geo 正常時を過小評価する）。

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

例: P90 の C = $0.020 なら Starter 500 は $10 / $15 = 66.7%、Pro 1,500 は $30 / $39 = 76.9%。価格を $15 / $39 にしたあとは、100%消費で変動費 25% の目安を超える。件数はまだ動かさない。**2,000 には戻さない。** `retry_without_proxy` 行は C に使わない。

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
- Share Collection / Time Compare Slider（条件一致時）/ Page Signals / 確認後の Product tour

---

## 7. 41–51 と実行基盤（採用）

Mac は開発機。Linux は将来の worker 実行基盤。Python は **撮影後の抽出**。本番の撮影出口を Linux Playwright に移す話とは別。切替は `VIEWTRACE_CAPTURE_BACKEND=playwright_worker` のみ。

Linux / Python が効く場所は **A**（hash / parse / diff / classify / 統計）。**B**（heartbeat / HTTP health）と **C**（Browserless 撮影）は混ぜない。41 / 42 の第一歩はいまの Node。Python は 43 / 44 / 48 で HTML を切るとき。全文 HTML は今保存していない。

採用条件は一本: **追加 Observation が 0 か。記録と解釈が分かれているか。根拠なしのスコアを出さないか。**

| # | 状態 | 内容 |
| --- | --- | --- |
| 41 | Next（36 の隣） | Evidence hash の表示統合。既存 SHA / content_hash / 記録 ID / 確認記録シール |
| 42 | Next（36 の次） | Change classification。三値は壊さない。Changed の下に何が変わったかを事実で並べる |
| 47 | Later（条件つき） | Redirect chain。`final_url` はある。同じ撮影でホップが取れるときだけ。追加撮影になるならやらない |
| 43 | Later（条件つき） | DOM structure。HTML か構造スナップショットを撮影時に保存しているときだけ。全文 HTML は前提にしない |
| 44 | Later（条件つき） | Third-party。「存在した / 消えた」まで。GTM が動いたとは言わない |
| 48 | Later（条件つき） | Content fingerprint。`content_hash` はある。本文正規化は HTML 保存が先 |
| 49 | Later | Magnitude。三値の代わりにしない。Minor / Major は根拠必須 |
| 50 | Later | Anomaly。10 件未満では出さない。Activation UI もいじらない |
| 51 | Experimental（内部） | Capture diagnostics。顧客画面ではなく原価用。C に $200 を混ぜない。`proxy_bytes` の 0/null は既存方針 |
| 45 | Rejected（今は） | Heartbeat。Observation 商品の外。36 / 42 / 38 より先にしない |
| 46 | Rejected（今は） | HTTP health。Watch の添え書き以上にしない。Uptime 商品にしない |
| 52 | Later（12 のあと。最初のスライスのみ） | Journey は既存 15d（安全クリック 1〜3）を地域つきで見せる。追加エンジンなし。小型 Datadog（SSL/DNS/TCP/UDP/ICMP/gRPC/Mobile）にはしない。Playwright の geolocation だけでは Geo にしない。出口は現行どおり Residential。Login / カート / 決済 / Watch 自動は禁止のまま。今の順（36 → 41 → 42 → 38/19 → 12）より上げない。詳細は `docs/considerations/journey-monitor.md` |
| 53 | Later（12 のあと） | Regional Interaction Check は共通エンジン。1 Region × 1 Check セッション = 合成 1。タイプごとには課金しない。同じセッションで User interactions / Motion / Media を Detect → Execute → Verify。Detected だけでは Working にしない。Verify は DOM だけでなく frame hash / media / resource。Accordion は trigger と panel。Scroll reveal / Lazy-load は candidate まで scroll。Load は要素単位。Cookie は Delayed。`/tests/interactions` fixture は本番 Browserless で回す（fixture だから Working にはしない）。Form は submit しない。Journey とは別。今の順より上げない。詳細は `docs/considerations/regional-interaction-check.md` |
