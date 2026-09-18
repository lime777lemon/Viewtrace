# セミ型獲得（3 Cicadas）— 検討中（未実装）

- **状態:** 検討中。実装しない。着手は明示指示があるまで禁止。
- **記録日:** 2026-09-18
- **関連:**
  - `docs/considerations/watch-scout-architecture.md`
  - `docs/considerations/discovery-free-tools.md`
- **芯の一文:** ViewTrace should not just wait for users. Every observation should have a chance to create the next user.

---

できます。しかも、その「セミ型」の考え方はViewTraceにはかなり面白いです。

ただし、AIが勝手にネット上を歩き回って顧客を連れてくるというより、ViewTrace自身に「見込み客がViewTraceを発見する原因」を自動生成させます。

例えば、こうです。

ViewTrace AI Scout を作ります。

ユーザーが何もしていない間も、AIが公開Web上から「ViewTraceで検査する意味がありそうな公開LP」を見つける。そして公開情報の範囲でページを分析して、

⚠️ We detected a possible visual difference between the US and UK versions of your landing page.

のような具体的な発見を作る。

ここから重要です。

単なる営業メールではなく、

We checked your landing page from 3 locations.  
View your free report →

として、相手専用のViewTrace Reportに誘導する。

つまり、

**AI → 見込みサイト発見 → ViewTraceでCapture → AIが問題候補を検出 → Report生成 → 適切な連絡先へ届ける → 相手が自分のサイトを見る → Signup**

です。

これならViewTraceそのものが営業材料を作ります。

さらに「AIがAIを呼ぶ」も、別の意味では実現できます。

今後は人間だけではなく、ChatGPTや他のAI検索・エージェントにViewTraceを発見してもらう設計が重要になります。

例えばViewTraceに、

- Free Geo Screenshot Tool
- AI Landing Page Checker
- Landing Page QA Tool
- Website Visual Comparison Tool

などの公開ツールを置き、それぞれに明確な説明、FAQ、実例、構造化されたページを持たせる。

すると、

User → AI：「海外から自分のサイトがどう見えるか確認できるツールある？」

という質問に対して、検索可能な公開情報としてViewTraceが候補になる可能性を作れます。

つまり、

**ViewTrace → Web上に有用な情報/ツールを出す → Search/AIが発見 → AIがユーザーに提示 → ViewTrace**

という循環です。

ただ、さらに一段進めたいです。

## ViewTraceの「セミ」を3匹作る

### ① Free Tool Cicada

URLを入力するだけで、

- AI Visual Review
- Geo Screenshot
- Landing Page QA

を無料提供。

検索・SNS・AI検索から人を呼ぶ。

### ② AI Scout Cicada

公開情報からICP候補を探す。

この会社は複数地域で広告展開している可能性がある  
↓  
LPをCapture  
↓  
AI QA  
↓  
問題候補発見  
↓  
Personalized report

まで自動生成する。

### ③ Shareable Report Cicada

これが特に面白い候補。

AgencyがViewTraceでクライアントAをチェックすると、

`viewtrace.net/report/xxxxx`

という綺麗なレポートを生成する。

Agency担当者がそれをクライアントに送る。

クライアントが開くと、

**Verified by ViewTrace**

が表示される。

そのクライアントが、「これ何？」となってViewTraceを知る。

つまり、

1 Agency  
→ 10 clientsにReport送信  
→ 10社がViewTraceを見る  
→ その中から新規ユーザー  
→ またReportを共有

というループを狙えます。

これは広告より強い可能性があります。利用行為そのものが次のユーザー獲得につながる Product Loop だからです。

---

「セミ」の比喩をViewTraceのプロダクト戦略に置き換えると、

**ViewTrace should not just wait for users. Every observation should have a chance to create the next user.**

です。

これなら「マーケティングを頑張り続けないとユーザーが来ないSaaS」から、使われるほど次のユーザーに露出するSaaSへ変えられます。

ViewTraceの場合、最初に実装するなら **Shareable AI Geo Report → “Verified/Analyzed by ViewTrace” → Try your own URL** のループを有力候補として検証します。既存のCapture機能をそのまま獲得チャネルに変えられるからです。

## ゲート（原案のまま・未着手）

- 最初に検証するのは ③ Shareable Report Cicada（既存 Capture → 公開レポート → Try your own URL）
- ① は Discovery 無料ツール3ページ案と接続しうる（無制限無料キャプチャは原価リスク）
- ② Scout は公開情報の範囲・連絡手段・スパムにならない届け方を先に決めてから
- 観測前提は維持する（「possible visual difference」であり、配信保証ではない）
- `/verify/[token]` の既存公開検証＋ Powered by CTA は既にある。本案の綺麗な `/report/xxxxx` とは別物として検討
