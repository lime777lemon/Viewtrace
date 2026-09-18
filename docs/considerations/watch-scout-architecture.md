# Watch + Scout 拡張 — 検討中（未実装）

- **状態:** 検討中。実装しない。着手は明示指示があるまで禁止。
- **記録日:** 2026-09-18
- **意図:** 現構成をなるべく壊さず、Shareable Report → AI Visual Review → AI Scout まで拡張できる設計案の保管。巨大な AI システムを最初から作らず、AI を取り替えても ViewTrace 本体が壊れない構造を目指す。

---

はい。ViewTraceの現在の構成をなるべく壊さず、**「Shareable Report → AI Visual Review → AI Scout」まで拡張できる設計**にします。

重要なのは、最初から巨大なAIシステムを作らず、**AIを取り替えてもViewTrace本体が壊れない構造**にすることです。Supabase Edge Functionsは外部LLMのオーケストレーション用途を想定しており、Cron + Queuesでバックグラウンド処理も組めます。

## 全体アーキテクチャ

```text
                    VIEWTRACE
                       │
              User enters URL
                       │
                       ▼
                 OBSERVATION
                       │
              Geo Capture Engine
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
     Screenshot                 Metadata
                                  │
          └────────────┬────────────┘
                       ▼
                AI ANALYSIS
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
   Visual Review              Geo Comparison
          │                         │
          └────────────┬────────────┘
                       ▼
                 AI REPORT
                       │
              Shareable URL
                       │
        viewtrace.net/r/abc123
                       │
          "Analyze your own URL"
                       │
                       ▼
                  NEW USER ♻️


────────────────────────────────────────


                  AI SCOUT
                       │
              User's website
                       │
                AI understands
                 the product
                       │
                       ▼
                 ICP PROFILE
                       │
                       ▼
             DISCOVERY SOURCES
                       │
              500 candidates
                       │
                 Cheap filter
                       │
              50 candidates
                       │
                AI scoring
                       │
             10 strong matches
                       │
                       ▼
              SCOUT DASHBOARD
```

---

# 1. DBテーブル

既存の`users / observations / captures`などがあるなら、それらは残します。

追加するのは基本的に以下です。

### `ai_analyses`

AIがスクリーンショットを分析した結果。

```sql
ai_analyses

id                  uuid
user_id             uuid
observation_id      uuid
capture_id          uuid

analysis_type       text
-- visual_review
-- geo_comparison
-- anomaly_detection

status              text
-- queued / processing / completed / failed

overall_score       integer
visual_hierarchy    integer
cta_visibility      integer
readability         integer

strengths           jsonb
issues              jsonb
recommendations     jsonb

model               text
prompt_version      text

input_tokens        integer
output_tokens       integer
estimated_cost      numeric

created_at          timestamptz
```

ここで大事なのが、

`prompt_version`

です。

将来AIの指摘方法を変更したとき、

> v1の分析
> v2の分析

を比較できます。

---

### `geo_comparisons`

地域間の違い。

```sql
geo_comparisons

id
observation_id

baseline_capture_id
comparison_capture_id

baseline_location
comparison_location

difference_score

visual_differences jsonb
content_differences jsonb
potential_issues jsonb

severity
-- low / medium / high

created_at
```

例えば、

```json
{
  "potential_issues": [
    {
      "type": "cta_missing",
      "severity": "high",
      "location": "US-TX",
      "description": "Primary CTA is not visible in initial viewport"
    }
  ]
}
```

とします。

---

# 2. Shareable Report

これは最初に実装します。

### `reports`

```sql
reports

id
user_id
observation_id

public_token
title

is_public
expires_at

view_count
unique_view_count

branding_enabled
cta_enabled

created_at
```

URLは、

`viewtrace.net/r/{public_token}`

にします。

UUIDそのままではなく、推測しにくいランダムtokenにします。

Reportには、

```text
Landing Page Verification

example.com

California
✓ Captured Sep 18, 2026 10:31
✓ Integrity verified

Texas
✓ Captured Sep 18, 2026 10:33
⚠ AI detected a visual difference

──────────────────

AI Visual Analysis

✓ Strong primary CTA
✓ Clear hero hierarchy

⚠ Pricing differs between regions
⚠ Texas CTA appears below fold

──────────────────

Analyzed by ViewTrace

[ Analyze Your Own Website ]
```

と表示。

最後のCTAが**Cicada Loop**になります。

---

# 3. Report Analytics

ここは絶対に入れます。

### `report_events`

```sql
report_events

id
report_id

event_type
-- view
-- cta_click
-- signup
-- analysis_started

anonymous_session_id
referrer
utm_source
utm_campaign

created_at
```

これによって、

**Report生成 → Client閲覧 → CTAクリック → Signup**

が追えます。

つまり、

> Report #123
> 17 views
> 4 CTA clicks
> 2 signups

まで分かる。

この数字が出ないと「セミが人を呼んだか」が判断できません。

---

# 4. AI API

AI部分はViewTrace本体から直接呼ばないようにします。

必ず、

**Frontend → Edge Function → AI API**

です。

API keyをブラウザに出してはいけません。

OpenAIのResponses APIは現在、画像を入力してテキスト/JSONを出力できるので、この用途に使えます。Structured OutputsでJSON Schemaに固定して返させることもできます。

例えば、

```text
analyze-capture
```

というEdge Functionを作ります。

処理は、

```text
POST /analyze-capture

capture_id
      ↓
SupabaseからCapture取得
      ↓
Screenshot取得
      ↓
AI API
      ↓
JSON
      ↓
validate
      ↓
ai_analyses INSERT
      ↓
Frontendへ返す
```

です。

---

# 5. AIに返させるJSON

AIに自由作文させない方がいいです。

必ず構造化します。

```json
{
  "overall_score": 78,

  "strengths": [
    {
      "category": "cta",
      "description": "Primary CTA has strong visual prominence"
    }
  ],

  "issues": [
    {
      "category": "visual_hierarchy",
      "severity": "medium",
      "description": "Secondary navigation competes with the primary CTA"
    }
  ],

  "attention_prediction": [
    {
      "element": "hero_headline",
      "score": 92
    },
    {
      "element": "primary_cta",
      "score": 87
    }
  ],

  "recommendations": [
    {
      "priority": 1,
      "description": "Reduce visual competition around the primary CTA"
    }
  ]
}
```

ただしUIでは、

**AI-predicted attention**

と明記します。

実際のeye-trackingではないからです。

---

# 6. Edge Functions

最初はこれくらいで十分です。

```text
create-report
analyze-capture
compare-captures

scout-profile
scout-discover
scout-qualify

process-ai-queue
process-scout-queue

stripe-webhook
```

特に重要なのが、

`process-ai-queue`

です。

---

# 7. Queueを入れる

AI処理をFrontendから全部同期実行すると、

**ユーザーが待つ → timeout → 再実行 → 二重課金**

などが起きます。

そこで、

```text
User clicks
"Analyze with AI"
        ↓
ai_jobs queue
        ↓
UI
"Analyzing..."
        ↓
Worker
        ↓
AI API
        ↓
DB
        ↓
Completed
```

にします。

Supabase Queuesでは、Edge Functionがメッセージを取得して処理し、成功後に削除する構成が公式にサポートされています。失敗した処理を再取得する設計にもできます。

---

# 8. AI Scout DB

ここから「24時間ユーザーを探すセミ」です。

### `scout_profiles`

ユーザーが何を売っているか。

```sql
scout_profiles

id
user_id

website_url

company_name
product_summary

target_industries jsonb
target_company_sizes jsonb
target_countries jsonb
target_titles jsonb

problem_keywords jsonb
intent_signals jsonb

status
-- active / paused

daily_scan_limit
monthly_scan_limit

created_at
updated_at
```

最初はAIにURLを読ませ、

> What does this company sell?
> Who is likely to buy it?
> What problems indicate buying intent?

を生成します。

---

# 9. `scout_candidates`

発見した企業。

```sql
scout_candidates

id
scout_profile_id

company_name
domain

source
source_url

industry
employee_range
country

discovered_text

account_fit_score
intent_score
final_score

reason
status
-- discovered
-- qualified
-- rejected
-- saved
-- contacted

first_seen_at
last_seen_at
```

例えばViewTrace自身なら、

```text
Company:
ABC Performance Marketing

Account Fit: 87

Intent: 91

Why found:
Agency manages international PPC campaigns.

Signal:
Recent public content discusses problems
checking localized landing pages.

AI reason:
Strong match for ViewTrace Geo Monitoring.
```

とDashboardに出します。

---

# 10. Buying Signalも別テーブルにする

これ重要です。

同じ会社から複数signalが出るからです。

### `scout_signals`

```sql
scout_signals

id
candidate_id

source
source_url

signal_type

text_excerpt

relevance_score
intent_score

detected_at
```

例えば、

```text
ABC Agency

Sep 12
"We've been having issues with localized
landing pages."

Sep 16
"We manage campaigns across 12 countries."

Sep 18
"Looking for better QA workflow."
```

なら、

**Intent Score ↑**

です。

---

# 11. AI Scoutの24時間処理

ここでCronを使います。

Supabase CronはEdge Functionを定期的に起動できます。公式ドキュメントでも`pg_cron + pg_net`による定期Edge Function呼び出しが案内されています。

例えば1時間ごと。

```text
Cron
Every 1 hour
       ↓
scout-discover
       ↓
Active Scout Profiles取得
       ↓
Search
       ↓
Raw candidates
       ↓
Queue
       ↓
Cheap Filter
       ↓
AI Qualification
       ↓
Score
       ↓
scout_candidates
```

ただし**ユーザー1人につき毎時AIを呼ばない**設計にします。

Batch処理します。

---

# 12. Scout Score

ここもAI任せにしません。

例えば、

```text
Account Fit             40%
Buying Intent           40%
Recency                  10%
Contactability           10%
```

で計算。

ViewTrace自身なら、

```text
PPC Agency                    +20
Paid Media services           +20
International campaigns       +15
10–200 employees              +10

Mentions geo/LP problem        +20
Recent problem signal          +10

Relevant decision maker       +5
Business contact available    +5
```

のようにできます。

AIは、

**文章 → signal classification**

を担当。

最終score計算はViewTraceコードで行います。

そうするとAIモデルを変更してもscoreロジックが安定します。

---

# 13. ここで初めてApollo

Apolloは最初から全企業に使いません。

```text
1,000 discovered
       ↓
300 rule filter
       ↓
100 AI qualified
       ↓
20 score > 80
       ↓
Apollo
       ↓
Decision maker
Email
```

とします。

つまりApolloの有料処理は**最後の20社だけ**。

これでランニングコストを抑えます。

---

# 14. 課金設計

AI Scoutは無制限にしない方がいいです。

例えば概念として、

```text
FREE

AI Visual Review
3 analyses / month

Scout
Preview only


PRO

100 AI analyses
250 Scout scans


AGENCY

500 AI analyses
1,000 Scout scans
Geo comparison
AI monitoring
Shareable reports


EXTRA CREDITS

追加購入
```

とします。

内部的には、

### `usage_ledger`

```sql
id
user_id

usage_type
-- capture
-- ai_analysis
-- scout_scan
-- enrichment

quantity

estimated_cost

reference_id
created_at
```

を作ります。

これ、かなり重要です。

将来的に、

> Agencyプラン $299
> 売上 $299
> AI/API原価 $18.72

のように**ユーザー単位の粗利**を出せます。

---

# 15. セキュリティ

この設計では、

**OpenAI API key
Search API key
Apollo API key
Resend API key**

などはすべてserver-side secretsに置きます。

SupabaseもEdge Functionsの認証、rate limiting、secret管理を想定しており、秘密情報は環境変数/Secretsで扱えます。

さらに、

**RLSを全ユーザーテーブルに設定**

します。

ユーザーAがユーザーBの、

`scout_candidates / ai_analyses / reports`

を読めないようにします。

Public Reportだけは**専用public token経由**です。

---

# 16. 実装順序

ここが一番重要です。全部同時に作らないです。

**Week 1 — Cicada Loop**

`reports`
`report_events`
`create-report`
Public Report UI
`Analyze your own URL` CTA

↓

**Week 2 — AI**

`ai_analyses`
`ai_jobs`
`analyze-capture`
AI Visual Review
AI strengths/issues
AI-predicted attention

↓

**Week 3 — Geo AI**

`geo_comparisons`
`compare-captures`
Geo anomaly detection
AI alert

↓

**Week 4 — Scout MVP**

`scout_profiles`
`scout_candidates`
`scout_signals`
`scout-discover`
`scout-qualify`
Dashboard

↓

**その後**

Cron → Queue → Search API → Apollo → Email/CRM → Stripe credits

です。

---

## 最終的なViewTrace

これが完成すると、ViewTraceは単なるScreenshot SaaSではなくなります。

```text
                VIEWTRACE AI

                    URL
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
     WATCH MY SITE         FIND MY MARKET
          │                     │
   Geo Monitoring            AI Scout
   Visual QA                ICP Discovery
   AI Analysis              Intent Signals
   Change Detection         Prospect Score
          │                     │
          └──────────┬──────────┘
                     ▼
                 AI REPORT
                     │
                     ▼
                 SHARE ♻️
                     │
                     ▼
                 NEW USER
```

私はこれを**「Watch」と「Scout」の2本柱**にします。

**Watch = 自分のWebを24時間見張る。
Scout = 自分の市場を24時間見張る。**

この構造なら、ViewTraceという名前とも自然につながります。

そして技術面でも、今のSupabase中心の構成を捨てる必要はありません。Supabase自身も、大量バックグラウンド処理についてCron → Queue → Edge Function workerという分割パターンを案内しています。

最初に実装すべき範囲は**Week 1〜2まで**です。そこで「ShareされたReportから新しい人がURLを入力する」「AI Reviewをもう一度使う」という行動が出るかを測り、出たらScoutへ投資する、というゲートを置くのが合理的です。

## 参考リンク（原案）

- https://supabase.com/docs/guides/queues/consuming-messages-with-edge-functions
- https://developers.openai.com/api/reference/cli/resources/responses/methods/create
- https://supabase.com/docs/guides/functions/schedule-functions
- https://supabase.com/docs/guides/functions
- https://supabase.com/blog/processing-large-jobs-with-edge-functions
