# Market Watch / Scout エージェント — 検討中（未実装）

- **状態:** 検討中。実装しない。着手は明示指示があるまで禁止。
- **記録日:** 2026-09-18
- **関連:**
  - `docs/considerations/watch-scout-architecture.md`
  - `docs/considerations/discovery-free-tools.md`
  - `docs/considerations/cicada-acquisition-loops.md`
- **正確な定義:** 「AIがインターネット上の人を魔法のように ViewTrace へ連れてくる」ではない。24時間動く **Prospect Discovery + Intent Detection + Personalized Outreach** エージェント。
- **探索の正確な言い方:** AIが24時間Web全体を巡回、ではなく、**AIが24時間、許可された複数の情報源から Buying Signals を監視**。

---

はい、作れます。ただし「AIがインターネット上の人を魔法のようにViewTraceへ連れてくる」ではなく、24時間動く Prospect Discovery + Intent Detection + Personalized Outreach エージェントとして設計すると現実的です。

イメージはこれです。

```text
ユーザーがViewTraceにURLを登録
          ↓
AIがそのURL・会社・サービスを理解
          ↓
「誰がこれを必要とするか」を生成
          ↓
24時間、公開Web上のシグナルを探索
          ↓
関連する企業・担当者・投稿・検索意図を発見
          ↓
Buying Intentを判定
          ↓
相手ごとに「なぜ関連するか」を生成
          ↓
見込み客としてViewTraceに表示
          ↓
許可されたチャネルで接触
          ↓
URL / Reportを見てもらう
          ↓
返信・訪問・Trial・Paid
          ↓
AIが反応データからターゲットを改善
```

例えばViewTrace自身に使うと、AIにViewTraceを読ませると、

- Product: Geo landing-page monitoring
- Problem: Advertisers don't know how LPs actually render in different locations
- Likely buyers: PPC agencies, paid-media teams, international SaaS/DTC teams

のようなICPを作ります。

その後、24時間のScoutが公開Webや許可されたデータソースから、

- “How can I check a landing page from another state?”
- “Client's geo landing page is showing the wrong offer.”
- “Managing Google Ads campaigns across multiple countries.”
- “Need a way to QA localized landing pages.”

のような Buying Signals を探す。

ここで単純なキーワード検索にしないのがAIを使う意味です。

例えば、

“Our client noticed the wrong pricing page in Canada again.”

という文章には geo screenshot も landing page monitoring も含まれていません。

でもAIなら、

- ViewTrace relevance: HIGH
- Problem: localized LP inconsistency
- Potential buyer: PPC agency
- Reason: client discovered regional pricing discrepancy

と**意味で判定**できます。

これが**「オンライン上に散らばっている word を拾う」**にかなり近いです。

## 「企業を連れてくる」部分

ここも自動化できます。

ただ見込み客を一覧にするだけでは弱いので、AIが相手企業向けに専用のViewTrace体験を作ります。

例えば Agency X を発見したら、その会社の公開LPについて許容される範囲で、

ViewTrace AI found this company → 公開LPを分析 → Geo Capture → AI QA → Personalized Report

まで生成。

そして適切な接触手段がある場合、

We checked one of your public landing pages from three U.S. locations.  
Here's the report →

という形で相手自身に関係するURLを見てもらう。

普通の「ViewTraceというサービスがあります」よりはるかに具体的です。

## 「課金すると24時間動く」は商品にできる

これはViewTraceの別機能として成立します。

例えば **ViewTrace Scout**

Freeでは、

- 3 potential buyers found
- 🔒 Company
- 🔒 Contact
- 🔒 Buying signal

だけ見せる。

有料化すると、

```text
AI Scout — ON 🟢
Searching 24/7
143 sources/signals analyzed
18 companies found
7 high-intent prospects
3 new today
```

というDashboardにする。

つまりユーザーはViewTraceに自分のURLを登録するだけ。

AIに、

**Find people and companies that may need what I sell.**

を任せる。

これは以前話していた Apollo Prospecting より一段上です。

Apolloは基本的に「この条件の会社を探して」ですが、このアイデアは「これが私のWebサイト。これを必要としていそうな人を継続的に探して」だからです。

## 重要な技術的制約

「インターネット全体を24時間検索」は現実的ではありません。

実装するときは探索対象を決めます。

Google/Bing等の検索API・公開Webページ・ニュース・企業サイト・許可されたコミュニティ/API・Apollo等の企業/人物データ・自社で許可されたcrawl対象などを組み合わせます。

また、LinkedInやRedditなどは利用規約/API制約があります。無許可スクレイピングや大量自動DMを前提にはしない方がいいです。

だから、

- ❌ AIが24時間Web全体を巡回
- ✅ AIが24時間、許可された複数の情報源からBuying Signalsを監視

と設計するのが正確です。

## これでViewTraceの方向性を変えられる候補

現在のViewTraceが「Webページを観測する」製品だとすると、これを

**ViewTrace watches the web for you.**

という上位概念にできます。

そして2種類のWatchを提供する。

**Website Watch**  
自分・クライアントのページを24時間監視  
→ Geo / Visual / Change / AI QA

**Market Watch**  
自分の商品を必要としていそうな市場を24時間監視  
→ Company / Intent / Problem / Prospect

この2つが同じ「Trace」というブランド概念に入ります。

さらに両方をつなげると、

AI discovers company → analyzes its public web presence → identifies relevant opportunity → generates prospect report → human approves outreach → outcome feeds scoring

というループを作れます。

これは単なる「AI機能をViewTraceに追加」ではなく、**新しいViewTraceのコア機能候補**です。

そして今ユーザーが13人なら、いきなり巨大な24/7 crawlerを開発する必要はありません。まず

**1ユーザーにつき1 URL → AIがICP生成 → 毎日複数ソースを検索 → 10件のProspect/Signalを返す MVP**

で十分です。そこで13人のうち何人が毎日Scout結果を確認し、何人がこの機能に実際に課金したいかを見るべきです。

このMVPなら、既存のVercel/Supabase系のViewTraceにも比較的小さく追加できる設計にできます。

## ゲート（原案のまま・未着手）

- 探索は許可されたソースのみ。無許可スクレイピング・大量自動DMはしない
- 接触は人間承認（human approves outreach）を前提
- 公開LPの Capture は許容範囲・公開情報のみ
- 観測前提は維持（問題候補であり配信保証ではない）
- 13人向けMVP: 1 URL → 日次10件の Prospect/Signal。巨大 crawler は作らない
- Apollo は条件検索の後段（enrichment）であり、ICP生成＋意味判定の本体ではない
