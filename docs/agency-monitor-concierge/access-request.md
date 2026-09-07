# 権限依頼 & メール文面（開始時に使う）

読み取り専用（閲覧のみ）で始めるのが鉄則。**広告費・設定には触れない**＝相手のリスクをゼロにして「試すハードル」を下げる。

---

## 1. もらう権限（どれか1つでOK・ハードルの低い順）

1. **週次CSVエクスポート**（最も低ハードル）
   - Google Ads / GA4 の必要指標を相手がCSVで送るだけ。権限付与不要。まずはこれで十分。
2. **GA4 Viewer**（閲覧者）
   - GA4 プロパティに「閲覧者」で招待してもらう。
3. **Google Ads 読み取り**
   - 口座に「読み取り専用」で招待、または MCC 単位で閲覧。
4. **観測対象URL**（Viewtrace 用・必須）
   - 出稿先LPのURLをもらい、Viewtrace に登録して観測開始。

> 「変更・課金権限は一切不要です。見るだけです」と明言するのがコツ。

---

## 2. キックオフメール（申し出）

### 日本語版
```
件名：広告アカウントの"異常検知"を2週間・無料で（見るだけ／設定は触りません）

{担当者名} さん

{代理店名} さんは複数のGoogle Ads口座を運用されていると思います。
毎日1口座ずつ確認する作業を減らすお手伝いを、2週間・無料でさせてください。

やること：3〜5口座を私が裏側でモニタリングし、毎週「今日見るべき口座 / 原因 / 推奨」を
1通のレポートでお送りします。加えて、出稿先LPが実際にどう表示されていたかを
"改ざん耐性のある記録"付きで確認します（広告は回っているのに成果が落ちる原因の切り分けに有効です）。

・費用：無料（2週間）
・権限：閲覧のみ（設定・入札・予算には一切触れません）。CSVを毎週送っていただく形でもOK
・お渡し：見つかった異常と推奨はそのままお使いいただけます

「やってみる」とだけご返信いただければ、対象口座の選定からご案内します。

— {あなたの名前} / Viewtrace · viewtrace.net
```

### English version
```
Subject: Free 2-week anomaly monitoring for your ad accounts (read-only, we touch nothing)

Hi {name},

I imagine {agency} runs several Google Ads accounts. I'd like to take some of the daily
account-checking off your plate — free, for 2 weeks.

What I do: I monitor 3–5 of your accounts in the background and send you one weekly report —
"which accounts need attention today, why, and what I'd recommend." I also verify how each
landing page was actually rendering, with a tamper-evident record — useful when ads are
running fine but results drop.

• Cost: free (2 weeks)
• Access: read-only. I never touch bids, budgets, or settings. Weekly CSV exports work too.
• Yours to keep: every anomaly and recommendation I find

Just reply "in" and I'll help you pick the accounts.

— {Your name} / Viewtrace · viewtrace.net
```

---

## 3. 週次配信メール
→ 本文の雛形は `weekly-report-template.md` を使用（日英あり）。

---

## 4. 断られた/権限が渋い場合の代替
- 「CSVを毎週送るだけ」に落とす（権限付与ゼロ）。
- まず**1口座だけ**で試す（相手の心理的負担を最小化）。
- 過去データ1週間分だけもらい、**サンプルレポートを先に作って見せる**（価値の実演）。
