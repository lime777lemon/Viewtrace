# Regional Interaction Check

- **状態:** 共通エンジン。課金は **1 Region × 1 Check セッション = 合成 1**（タイプごとではない）。同じ Browserless セッションで User interactions / Motion / Media を Detect → Execute → Verify。GSAP があるだけでは Working にしない。Canvas / WebGL / Lottie は短いフレーム差分のみ（動画は保存しない）。Form は submit しない。Journey（Navigation / CTA）とは別。今の順より上げない。
- **記録日:** 2026-10-20
- **楔:** Does this website actually behave the same way in every region?
- **意図:** スクリーンショットの地域比較に、「その地域でページが実際にどう動くか」を足す。東京専用の Scroll 検証にしない。全選択地域で同じ Interaction を実行する。Detected（ページに検証対象がある）と Working（その地域の実ブラウザで操作して描画が変わった）を混ぜない。小型 Datadog にはしない。連続ショットは使わない。

---

## 1. 今回の HTML が何か

AMI の value 節は静止画ギャラリーではない。

- 高さ `300svh`、内側は `sticky top-0 h-svh`
- 写真は `will-change: transform`。スクロール量で `translate` / `scale`
- コピーは初期 `opacity: 0; visibility: hidden`
- その下に `canvas`（OUR STEPS）、末尾に Subscribe フォーム

これは **スクロールにピンした scrub**。1 枚のスクリーンショットは、そのスクロール位置の1フレームだけ。Page changed とは言わない。

---

## 2. 二段階（自動発見 ≠ 実行検証）

```text
Page inspection
  → Scroll-linked behavior detected（検証対象になり得る）
  → 各地域の実ブラウザで同じ操作
       Tokyo / California / London / …
  → Working / No rendered state change observed / Not measured
```

「アニメーションがある、検証できた→ Working」にする。Detected は Regional verification available まで。Working はその地域で 0→25→50→75→100% を回し、transform / opacity / visibility / position が変わったときだけ。

Regional Interaction Check は **選択した Region でのみ実行する。** 基本は今の Observation の 1 地域。複数 Region を選んだ場合は、Region ごとに独立した Check として起動する（別エンジンの「全地域一括」は作らない）。

**1 Region × 1 Regional Interaction Check = 1 synthetic run。** Scroll / Hover / Modal を別セッションにしない。同じ Browserless セッションで安全に検証できるタイプを順に回す。タイプの間は restore（Escape・scroll 0・video pause。URL が変わったら goto）。残量が地域件数に足りなければ一件も実行しない。Watch では自動実行する。選べるのは、この URL の Observation が既にある地域だけ。

| Type | 操作 | Working |
| --- | --- | --- |
| Scroll | 0→25→50→75→100% | transform / opacity / visibility / position |
| Hover | hover | style / visibility / position / DOM |
| Carousel | 安全な Next/Prev | active slide / transform / position |
| Menu | trigger click | visible/open |
| Modal | 安全な trigger click | dialog visible/open |
| Accordion | heading click | expanded + content |
| Tabs | 安全な click | selected + panel visibility |
| Tooltip | hover / focus | popup visibility / geometry |
| Video | play | paused=false、currentTime が進む |
| Form | focus → 試験入力 → value → clear | 入力が載る。**submit しない** |
| Load / CSS / JS animation | Wait | 時間経過で rendered state が変化。ライブラリ名だけでは Working にしない |
| Scroll reveal / Lazy-load | Scroll + Wait | hidden→visible、画像が描画される |
| Canvas / WebGL / Lottie | 3〜5 フレーム差分 | frame delta。画像・動画は保存しない |
| Embedded video | 安全な Play | player / frame。外部制約時は Execution error |
| Drag / Swipe / Cursor-follow | 安全な pointer | position / transform。Purchase / Login には使わない |

Submit / Login / Purchase / Add to cart / Subscribe / 破壊操作はしない。Navigation / CTA は Journey。

Regional Interaction Check = 選択した地域の実ブラウザで、そのページに存在する安全な Interaction を実際に操作し、正常に反応するか検証する。

## 3. Detected と Working

| ラベル | 意味 | 今の製品でやってよいか |
| --- | --- | --- |
| Detected | sticky / 長いセクション / transform / canvas / フォームが DOM にある | HTML を切れば言える。動いたとは言わない |
| Working | その地域のブラウザでスクロール（またはクリック等）し、前後で CSS/画面が変わった | 実セッションが要る。測ってない項目は未測定 |

`Scroll animation: ✓ Working` は次を実行したときだけ書く。

スクロール前 → スクロール → DOM/CSS の変化 → 画面上の変化

コードに GSAP がある、だけでは Working にしない。

---

## 4. Observation の中の位置

別エンジンにしない。親は Observation（`URL × 地域 × 時点`）。

```text
Observation
  → Visual
  → HTTP / Page Signals
  → Interactions（任意。押した件数だけ）
       Scroll animation
       Sticky
       Navigation / CTA（既存 15d = Journey）
       Hover / Form / Video / Modal / Carousel（後相）
```

Performance / Network は測っていなければ未測定のまま。記録の Observed に混ぜない。

出荷済の Journey（安全クリック 1〜3）は、この表の **Navigation / CTA** の最初のスライス。Regional Interaction Check は同じセッションで Scroll / Hover / Menu / Modal / Accordion / Carousel / Video / Form を検証する。Working は Detected → Execute → Verify のあとだけ。

Region Compare は既存の地域軸に、同じ Interaction 行の Working / No rendered state change observed / Not detected / Blocked for safety / Execution error / Not measured を並べる。Before / After の別ページは作らない。Screenshot 三値は壊さない。

楔の一文:

**Does this website actually behave the same way in every region?**

Verify that animations, buttons, forms, navigation, and other interactive elements work correctly from each monitored region.

出口は Residential。Playwright の `geolocation` だけでは Geo にしない。Requested ≠ Observed。

---

## 5. 今ある手段との対応

| 見たいこと | 今 |
| --- | --- |
| 人がその地域で 300svh をスクロールして見る | ライブ確認（保存なし） |
| 短い動画として残す | share_clip（約12秒。ページを少しスクロールする。300svh の全程は保証しない） |
| Navigation / CTA が押せる | Journey（安全クリック。Login / カート / 送信は禁止） |
| Scroll / Hover / Menu / Modal / Accordion / Carousel / Video / Form を Working と自動判定 | 出荷。同一 Browserless `/function` セッション。画像は保存しない。Detected だけでは Working にしない。window.scrollY だけでは Working にしない。Form は送信しない |
| Subscribe フォーム | 現行合成は `submit` を押さない |
| Canvas / WebGL / Lottie | 3〜5 フレームの hash / pixel delta。動画は保存しない |

連続ショットは使わない。Watch では自動実行する。$49 / $99 は動かさない。クレジットパックにはしない。

---

## 6. 今やらない

- Animation Detection（DOM にアニメがある、だけを商品にする）
- Detected だけの Working
- Detected だけの別撮影（追加 Browserless）
- Observation が無い地域をここで作って回すこと
- 別エンジンとしての「全地域一括検証」
- 「アニメーションがある」を Working と書くこと
- Login / カート / 決済 / メール購読の自動送信
- SSL / DNS / TCP / UDP / ICMP / gRPC / Mobile
- Playwright geolocation だけでの地域テスト
- 今の順（36 → 41 → 42 → 38/19 → 12）より上げること

---

## 7. Action primitives / Evidence / Fixture

操作は名前を増やすより、次の primitives の組み合わせにする。

```text
LOAD WAIT SCROLL HOVER MOUSE_MOVE SAFE_CLICK FOCUS INPUT PLAY DRAG SWIPE
```

Working の Verify は DOM だけにしない。Evidence は DOM/Render（transform / opacity / visibility / display / rect / computedStyle / class / aria-expanded / aria-selected / hidden / mutation）、Media（paused / currentTime / readyState）、Visual（frame hash / pixel delta）、Resource（image complete / naturalWidth / request）。WebGL は DOM が変わらなくても T0/T1/T2 の frame hash が違えば Working。

Accordion は trigger と `aria-controls` の panel を対応付ける。Scroll reveal / Lazy-load は候補まで scrollIntoView してから再測定する。Load animation は要素単位の T0→T1。Cookie banner の display 変化は Delayed content であり Hero Load Animation ではない。

`/tests/interactions/{kind}?mode=working|broken|absent|unsafe` はプレビューではない。fixture だから Working にはしない。本番と同じ Browserless 地域セッション（US-CA / US-FL / JP-13 など）で Execute → Verify する。顧客サイトに無いタイプは Not detected で正しい。能力の証明は fixture の True Positive で行う。

完成条件: 各タイプ Detect / Execute / Verify / Evidence / Cleanup / Safety と、working / broken / absent fixture、および実 Browserless 地域ラン。
