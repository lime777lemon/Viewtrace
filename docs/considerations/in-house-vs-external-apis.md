# 自社開発 vs 外部API、MVP 3 Phase — 検討中（未実装）

- **状態:** 検討中。実装しない。着手は明示指示があるまで禁止。
- **記録日:** 2026-09-18
- **関連:** `docs/considerations/watch-scout-architecture.md`、`docs/considerations/cicada-running-costs-and-order.md`
- **原則:** 「自社開発」と「外部API不要」は別。独自ロジック・UI・スコアリング・レポートは自社、AI推論・検索データ・Geo接続など必要な部分だけAPI。価値そのものをAPI会社に依存させない。
- **独自モデル訓練は最初不要。** 既存AIモデル + ViewTrace独自データ + 独自判定ロジック + 自動実行。

---

はい。かなりの部分を自社開発できます。むしろViewTraceの場合、全部を外部SaaSに依存する必要はありません。

ただし「自社開発」と「外部API不要」は別です。ViewTrace独自のロジック・UI・スコアリング・レポートは自社開発し、AI推論・検索データ・Geo接続など必要な部分だけAPIを使うのが現実的です。

今の構成を前提にすると、こう整理できます。

| 機能 | 自社開発 | 外部API | 必要度 |
|---|---|---|---|
| ③ Shareable Report | ◎ | 基本不要 | ★★★★★ |
| AI Visual Review | ◎ | AI Vision API | ★★★★★ |
| AI Geo Comparison | ◎ | AI Vision + 現在のGeo Capture基盤 | ★★★★★ |
| AI ScoutのICP判定 | ◎ | LLM API | ★★★★☆ |
| Web上の企業発見 | △ | Search/Data API | ★★★★☆ |
| 担当者・Email発見 | △ | Apollo等 | ★★★☆☆ |
| 24時間自動実行 | ◎ | 基本不要 | ★★★★★ |
| 自動メール送信 | ◎ | Resend等 | 必要なら |

## ① Shareable AI Geo Report

これはほぼ完全に自社開発できます。

現在のViewTraceが持っているCapture結果をSupabaseに保存して、

`viewtrace.net/report/8dH32k`

のような公開URLを発行するだけです。

そこに、

Analyzed by ViewTrace  
Try your own website →

を入れる。

**AIすら必須ではありません。**

したがって、最初の「セミ」を作るのに新しい外部APIは基本的に必要ありません。

## ② AI Visual Review

ここはAI APIを使うのが合理的です。

ViewTraceが取得したScreenshotをAI Visionに渡して、構造化JSONを返させる。

```text
Screenshot
    ↓
AI Vision
    ↓
{
  "visual_hierarchy": 82,
  "cta_visibility": 91,
  "readability": 73,
  "issues": [
     "CTA partially below fold",
     "Low contrast secondary text"
  ],
  "strengths": [
     "Clear hero headline",
     "Primary CTA has strong visual prominence"
  ]
}
```

それをViewTrace側で綺麗なレポートにします。

画像入力に対応するAI APIは現在普通に利用でき、画像サイズ・モデル・detail設定によって入力コストが変わる。

つまりここで外部に任せるのは、**「画像を見て判断するAI」だけ。**

何を評価するか、どうスコアリングするか、Geo間でどう比較するか、どうレポートするかはViewTraceの独自ロジックにできます。

## ③ AI Geo Comparison

これはViewTraceと特に相性がいいです。

例えば同じURLを、

```text
California screenshot ─┐
Texas screenshot ──────┼→ AI
New York screenshot ───┤
UK screenshot ─────────┘
             ↓
"UK version differs significantly"
CTA: missing
Price: £79 vs $79
Hero: different
Cookie banner: obstructing CTA
Layout: abnormal
```

と比較させる。

ここも必要なのは基本的にVision対応AI APIだけです。

Geo Captureそのものを既にViewTrace側で実装できているなら、その部分を再構築する必要もありません。

## ④ AI Scout

ここから少し複雑になります。

「このURLを必要としている会社をAIが探してくる」は、**AI APIだけではできません。**

AIには「考える部分」を担当させて、情報を取ってくる部分が別途必要です。

```text
ViewTrace URL
     ↓
AI
「これはGeo Landing Page Monitoring SaaS」
     ↓
ICP生成
「PPC Agency / Paid Media / DTC」
     ↓
Search/Data source
     ↓
500 companies/signals
     ↓
AI relevance filter
     ↓
50 relevant
     ↓
AI score
     ↓
10 High Intent
     ↓
ViewTrace dashboard
```

ここで必要になる可能性があるのが、

Search API / Company database / Apollo等のPeople data

です。

## ⑤ 24時間稼働する部分は自社開発できる

ここはAI APIではありません。

ViewTraceがすでにSupabaseを使っているなら、Supabase Cron + Edge Functionsでかなりできます。

例えば、

```text
Every 1 hour

Supabase Cron
      ↓
Scout Edge Function
      ↓
Search new signals
      ↓
Filter
      ↓
AI classification
      ↓
Score
      ↓
Supabase
      ↓
ViewTrace dashboard
```

処理量が増えてきたらQueueを分離する（Discovery → Qualification → Capture → AI Analysis → Enrichment）。

**「24時間動くから特別なAIサービスが必要」ではありません。** スケジューラーを自分たちで組めます。

## 外部APIを最小化した場合の箱

```text
                    VIEWTRACE

┌─────────────────────────────────┐
│ 自社開発                         │
│ Capture Engine                  │
│ Geo Comparison                  │
│ AI scoring logic                │
│ Prospect scoring                │
│ Report Generator                │
│ Shareable Reports               │
│ User Dashboard                  │
│ Credits                         │
│ Scheduler                       │
│ Analytics                       │
└─────────────────────────────────┘
              │ 必要な時だけ
              ↓
┌─────────────────────────────────┐
│ External APIs                   │
│ AI Vision / LLM                 │
│ Search API                      │
│ Apollo ← 必要なProspectだけ     │
│ Resend ← Outreachする場合       │
│ Geo Proxy ← 必要なら            │
└─────────────────────────────────┘
```

## 今は全部作らなくていい — MVP 3機能

### Phase 1 — Share Report

Observation結果にボタンを追加。

- 公開Report URL生成
- Analyzed by ViewTrace
- Analyze your own URL

**AI API不要。**

### Phase 2 — Analyze with AI

- ScreenshotをVision AIへ
- Strengths / Problems / CTA visibility / Visual hierarchy / Geo differences

ここで初めてAI APIを入れる。

### Phase 3 — AI Scout — Find companies that may need this

- URLからICP生成
- Search
- AI relevance score
- 10 prospects/day
- Dashboard

ここでSearch APIを追加。

**Apolloはそのさらに後でもいい。**

最初は、

Company / Website / Why it's relevant / Buying signal / AI score

までViewTraceが発見して、人間がLinkedIn等で確認するだけでもPMFテストはできます。

## ゲート（原案のまま・未着手）

- 最初のセミは Phase 1。新しい外部APIは基本不要
- 独自AIモデルの訓練はしない
- 「何のAPIを契約するか」より先に、DBテーブル → Edge Functions → AI API → Report → Scout の具体設計（設計も明示指示があるまで作らない）
- 最初のセミなら 1〜2週間程度のMVPに小さく切れる、という見積もりは検討メモであり着手指示ではない
- 既存 `/verify/[token]` は Phase 1 の `/report/...` とは別物として検討
