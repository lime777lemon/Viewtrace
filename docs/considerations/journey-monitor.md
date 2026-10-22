# Journey Monitor

- **状態:** 最初のスライスだけ出荷（安全クリック 1〜3。既存 15d の再利用）。Login / カート / 決済 / Watch 自動 / SSL・DNS 網は未実装。今の順（36 → 41 → 42 → 38/19 → 12）より上げない。
- **記録日:** 2026-10-20
- **意図:** Datadog Browser Test 互換の Synthetics 一式は作らない。ViewTrace は **Region + Browser Journey + Visual Evidence** に絞る。Observation 思想を壊さず、「この URL はこの地域でどう見えるか」の上に「この操作はこの地域で最後まで動くか」を載せる。

---

## 1. 何を候補にするか

**Journey Observation** は別エンジンではない。親はこれまで通り Observation（`URL × 地域 × 時点`）。配下の測定が Visual だけでなく、ステップ列になる。

```text
Observation（親セッション）
  → Step: Open page
  → Step: Click Login
  → Step: Fill / Sign in   ← 資格情報は後相。今の合成では禁止
  → Step: Click Pricing
  → Step: Assert
  → Visual / HTTP / Network / Console（ステップごと。全部は最初から取らない）
```

Time Compare × Region Compare × Journey Compare は、既存の Time / Region 軸に **同じシナリオのステップ差** を足す。Before / After の別ページは作らない。Screenshot 三値は壊さない。Page changed とは言わない。記録の中では観測できた事実以上を断定しない。

Agency 用途の楔:

**広告 LP・CTA・フォーム・購入導線が、指定地域で最後まで動くか。**

SSL / DNS / TCP / UDP / ICMP / gRPC / Mobile App / 全世界ロケーション網は、この楔ではない。小型 Datadog にしない。

---

## 2. 地域は2種類。混ぜない

| 種類 | 何をするか | ViewTrace での位置 |
| --- | --- | --- |
| エミュレーション | Playwright の `geolocation` / locale / timezone / viewport | デバイス見た目。広告 LP の Geo 価格・CDN・リダイレクトの Observed にはしない |
| 実行出口 | その地域の Residential IP / 実行 Node からブラウザがサイトへ行く | 現行 Observation と同じ。Requested ≠ Observed。US-CA を選んでも国単位なら California と書かない |

Datadog の Managed Location と同じく、**出口が地域**である。`geolocation = California` だけの Browser Test は ViewTrace の Geo 商品にしない。

本番出口は Browserless。自社 Playwright Worker はフラグがあるときだけ。顧客に proxy は売らない。

---

## 3. 今あるものと衝突するもの

出荷済の合成操作（15d）:

- 安全なクリック 1〜3。Field INP ではない。Observed ではない
- 購入・送信・削除・ログアウト・カート・決済・パスワード欄は押さない
- Watch では自動実行しない。毎回の Observation には載せない
- trial 2 / Starter 10 / Pro 30

そのため、例の **Purchase Flow（Login → Add to cart → Checkout）は現行合成では実行できない。** 資格情報の保存、カート追加、決済画面は別承認が要る。最初のスライスにするなら **公開 CTA / 価格ページまでの安全クリック** だけ。ログイン必須のジャーニーは後相。

Heartbeat / HTTP health（45 / 46）は Rejected。Journey の失敗理由に `POST /api/cart → 403` を書くのは、ステップの観測事実としてよい。Uptime 商品にはしない。

Network / Console をステップごとに全部保存すると、Browserless 時間と residential MB が増える。最初はステップの pass/fail + 最終 Visual。HTTP は取れたときだけ。連続ショットは使わない。

---

## 4. 課金

1 地域 × 1 Journey 実行 = 1 Observation。複数地域は件数分。残量不足なら部分実行せずスキップ。Watch の 6 時間ごと（Pro の 4 回/日）に乗せるなら、合成の毎回自動実行禁止を先に解く必要がある。解かない。Journey Watch は 12 と合成枠のあとで別承認。

超過従量・クレジットパックにはしない。$15 / $39 は動かさない。

---

## 5. 最初のスライス（出荷）

追加の撮影エンジンは増やさない。既存の合成操作（15d）を押した件数だけ実行する。trial 2 / Starter 10 / Pro 30。Watch では自動実行しない。$15 / $39 は動かさない。

1. 既存 15d を **Journey として Region Compare に載せる**（安全クリックのみ。資格情報なし）
2. ステップ結果を Measurements の子にする（Visual / HTTP。Network / Console は未測定のまま）
3. 資格情報付き Purchase / Login は、保管・破壊操作・ToS を決めてから（まだしない）

AI 要約（「California だけで購入できない」）は 38 の読み。Observed ではない。

---

## 6. 今やらない

- HTTP / SSL / DNS / TCP / UDP / ICMP / gRPC を Journey より先に商品化
- Playwright geolocation だけでの「地域テスト」
- ログイン・カート・決済の自動操作
- Watch での Journey 毎回実行
- 50 州自社網、Mobile 実機、Private Location 再販
- 連続ショットによるステップ動画の代わりのバースト撮影（ライブ確認と短い動画の方針は別）
