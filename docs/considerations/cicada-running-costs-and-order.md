# 3 Cicadas のランニングコストと実装順 — 検討中（未実装）

- **状態:** 検討中。実装しない。着手は明示指示があるまで禁止。
- **記録日:** 2026-09-18
- **関連:** `docs/considerations/cicada-acquisition-loops.md`
- **結論:** ③ はほぼ追加コストなし、① は低コスト、② は設計次第で最も高い。実装順は **③ Shareable Report → ① Free AI Visual Checker → ② AI Scout**。

---

はい。ただし、3つでランニングコストがかなり違います。

結論からいうと、③ Shareable Report Cicada はほぼ追加コストなし、① Free Tool は低コスト、② AI Scout は設計次第で最もコストがかかります。

| 機能 | ランニングコスト | 主なコスト |
|---|---|---|
| ① Free Tool Cicada | 低〜中 | Capture、Proxy、AI画像解析 |
| ② AI Scout Cicada | 中〜高 | Web検索、企業探索、AI判定、Capture、Enrichment |
| ③ Shareable Report Cicada | 非常に低い | DB・Storage・Hosting程度 |

## ① Free Tool Cicada

例えば、

URL入力 → Screenshot → AIが見栄えを分析

なら、実行されるたびに、

Capture/Browser → Proxy（Geoの場合） → AI Vision → DB/Storage

が動きます。

ただし無料ユーザーを、

**1日1回まで / 1 location / 1 screenshot / AI analysis 1回**

にすれば、かなり制御できます。

さらにAIも毎回最高性能モデルを使う必要はありません。

最初に安価なモデルで、

- CTA visibility
- visual hierarchy
- broken elements
- readability
- possible layout problems

をJSONで返させればいい。

そして無料ユーザーには1地域、有料ユーザーには、

**5 locations × 毎日 × AI analysis**

とする。

こうすると使われれば使われるほど課金につながる構造にできます。

## ② AI Scout Cicada

これが一番注意です。

先ほど話した、

AI → 企業を探す → LP発見 → Capture → AI分析 → 問題発見 → 担当者特定 → Report

を24時間実行すると、それぞれに費用が発生する可能性があります。

特に、

Search API / crawling + proxy + AI tokens + AI Vision + Apollo等のenrichment

です。

だから「24時間無制限でWebを探し続ける」はやらない方がいいです。

代わりに、

- Starter: 50 companies scanned/month
- Pro: 250 companies/month
- Agency: 1,000 companies/month

のように **Scan Credit 制** にします。

さらにAIに全部読ませる必要もありません。

```text
10,000候補URL
       ↓
安いルール判定
       ↓
1,000社
       ↓
軽量AIでICP判定
       ↓
200社
       ↓
Capture
       ↓
50社
       ↓
AI Vision Analysis
       ↓
10 High-intent prospects
       ↓
必要な10社だけEnrichment
```

こうするとコストが劇的に下がります。

高価な処理を最後の少数だけに使うのがポイントです。

## ③ Shareable Report Cicada

これはかなり安いです。

すでにViewTraceが、

Capture → Observation → Result

を持っているなら、その結果を、

`viewtrace.net/report/abc123`

として公開できるようにするだけです。

追加されるのは主に、

Report page + database record + screenshot storage + page views

程度。

そして、

Analyzed by ViewTrace  
Check your own website →

を付ける。

例えばAgencyが1回Captureするのに既にViewTrace側でコストが発生しているなら、その結果を10人が閲覧してもCaptureを10回追加実行する必要はありません。

同じ保存済み結果を10人に表示するだけだからです。

つまり、

**1回のCaptureコスト → 10人、100人にマーケティング**

ができます。

これが③の強いところです。

## 実装順序

今のViewTraceなら、

**③ Shareable Report → ① Free AI Visual Checker → ② AI Scout**

の順です。

特に最初の③は、

```text
User creates observation
        ↓
Share Report
        ↓
Client opens report
        ↓
"Analyzed by ViewTrace"
        ↓
"Check your own URL"
        ↓
New visitor
        ↓
New observation
        ↓
Share
        ↓
♻️
```

という低コストの Product Loop を作れます。

これが本当に「セミ」に一番近いです。

①もかなり面白いですが、無料ユーザーが増えるほど AI/Proxy コストも増えます。

②はさらに強力ですが、ユーザーが13人の段階で24時間 Scout インフラを先に作るのは重いです。

まず③で「ViewTraceの結果を人に見せたとき、その人も自分のURLを試すか」を確認する方がいいです。

その後①を入れて、**「無料AI診断が新規ユーザーを連れてくるか」**を確認。これが機能したら②に進む。

この順番なら、ほぼ固定費だけの獲得ループ → AI従量課金型の獲得ループ → 24時間自動Prospectingと、ランニングコストを段階的に増やせます。

## ゲート（原案のまま・未着手）

- ③の検証指標: レポートを見せた相手が自分のURLを試すか
- ①は日次1回・1地点・安価モデル。無制限無料 Geo+Vision はしない
- ②は Scan Credit。漏斗の後ろだけ Capture / Vision / Enrichment
- 既存 `/verify/[token]` は③の綺麗な `/report/...` とは別物として検討
