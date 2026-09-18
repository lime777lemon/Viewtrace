# Discovery（検索で見つかる入口）— 検討中（未実装）

- **状態:** 検討中。実装しない。着手は明示指示があるまで禁止。
- **記録日:** 2026-09-18
- **関連:** `docs/considerations/watch-scout-architecture.md`（Shareable Report / AI Visual Review / AI Scout）
- **意図:** 広告で ViewTrace という名前を知ってもらうより、ユーザーがすでに検索・閲覧している問題に引っ掛ける。SEO / programmatic SEO / free-tool marketing / PLG の組み合わせ。

## 現状（記録時点・実装しないためのメモ）

既にあるのは説明・ガイド寄りのトピックページ（`/tools/[slug]`）とキーワード一覧。URL を貼った瞬間に動く無料ツールではない。比較ページ（vs Stillio 等）と Free AI Visual Checker も未実装。

既存トピック例: geo screenshot tool / website screenshot from another country / ad verification / localized QA / geo testing / how to check website from another country / landing page QA / proof for ad agencies。

キーワードは `src/lib/seo/site-keywords.ts`。

---

いわゆる**「Discovery（発見される仕組み）」を意図的に作る**方法です。

ViewTraceの場合、広告を出して「ViewTraceを知ってもらう」より、ユーザーがすでに検索・閲覧している問題にViewTraceを引っ掛ける方が合う可能性があります。

例えば「ViewTrace」という名前を検索する人はほぼいません。でも、

- view website from another country
- test website from different location
- geo screenshot tool
- check landing page mobile
- landing page checker
- website visual checker

のような問題そのものを検索する人はいます。

そこでViewTrace内に、検索目的ごとの無料ツールページを作ります。

**Google検索 → 無料ツール → URL入力 → 即結果 → ViewTrace登録**

という導線です。

さらに、AIを使うともっと「引っ掛かり」を作れます。例えば、

**Free AI Website Visual Checker**

にして、

Enter your URL  
↓  
AI captures your page  
↓  
「CTAはかなり目立っています」  
「Hero headlineの視認性が弱いです」  
「Pricingが発見しにくい可能性があります」  
「MobileではCTAがfirst viewportにありません」

まで無料で返す。

結果ページを共有できるようにして、

“ViewTrace AI Visual Report for example.com”

のような公開URLを生成すると、その結果ページ自体が外部に広がる可能性も作れます。

もう一つはComparison系ページです。

- ViewTrace vs Stillio
- ViewTrace vs PagePixels
- ViewTrace vs Visualping
- ViewTrace vs AdsChecks

のようなページを作る。競合製品を調べている＝比較的購入意欲が高い人を拾うためです。ただし、比較内容は正確かつ更新できるようにします。

さらにテンプレート/ユースケース検索も取れます。

- Landing Page QA for PPC Agencies
- Geo Testing for Google Ads
- Multi-location Landing Page Monitoring
- Shopify Geo Testing
- International Landing Page Testing

のように、「機能」ではなく**仕事（job）**単位でページを作る。

つまり、ViewTraceをオンライン上で見つけてもらう入口を1個ではなく、

```text
                    ViewTrace
                       ↑
        ┌──────────────┼──────────────┐
        ↑              ↑              ↑
   Free Tools      Problem SEO    Comparison
        ↑              ↑              ↑
 AI Visual Check   Geo Testing    vs Stillio
 Geo Screenshot    Landing QA     vs AdsChecks
 Mobile Check      PPC QA         vs Visualping
        ↑              ↑              ↑
      Google / Bing / AI search / LinkedIn / Reddit
```

のように何十個も作るイメージです。

そして今ならGoogleだけを考えない方がいいです。検索されるページをきちんと構造化しておけば、Google/Bingだけでなく、ChatGPTなどのAI検索・回答で参照される可能性を作ることにもつながります。

ViewTraceの場合、特に**「無料ツールを大量に作る」のではなく、最初に3つだけ作って需要を測る**のがいいと思います。

1. Free Geo Screenshot Tool
2. Free AI Website Visual Checker
3. Free Landing Page QA Checker

この3ページです。

それぞれ「説明記事」ではなく、URLを貼った瞬間に使える本物のツールにします。

これなら「ViewTraceを買ってください」ではなく、ユーザーが自分のサイトを調べるためにViewTraceへ来る理由を作れます。

これを一般にSEO、programmatic SEO、free-tool marketing、product-led growthなどを組み合わせた獲得戦略として考えられます。

もし狙うなら、次はViewTraceがGoogle/AI検索で引っ掛かる可能性がある検索ワードを実際に調査して、「検索ワード → 作る無料ツール → ページタイトル → CTA」まで20個くらい設計するのが有効です。これはWeb検索して実データ寄りに候補を絞れます。

## ゲート（原案のまま・未着手）

- 無料ツールは最初3ページだけ需要を測る（大量の programmatic は後）
- 本物の URL 入力ツールにする（説明記事で終わらせない）
- 公開結果URLは Cicada Loop / Shareable Report 案と接続しうる
- 無料の無制限キャプチャ＋AIは原価リスクがある（住宅プロキシの多地点は無料に出さない、等は別途検討）
- キーワード20個の調査は、明示指示があるまで実行しない
