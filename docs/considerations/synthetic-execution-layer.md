# Synthetic execution layer

Regional Interaction Check は **Browserless 必須ではない**。実行は `SyntheticBrowserProvider` 経由に統一する。

## 現状（Phase ①）

```text
Watch / manual / monitoring run
        ↓
runRegionalSyntheticCheck()
        ↓
resolveRegionRoute()  →  proxy（Browserless Geo と分離）
        ↓
getSyntheticBrowserProvider()  (+ optional fallback)
        ↓
RegionalInteractionCheckV1  (+ optional execution {})
```

| パス | 役割 |
|------|------|
| `src/lib/synthetic/browser-provider.ts` | Provider 型・session params |
| `src/lib/synthetic/run-regional-synthetic-check.ts` | 単一入口・OTel・fallback |
| `src/lib/synthetic/providers/browserless-provider.ts` | 既存 `/function` + `buildInteractionFunctionCode` を Adapter |
| `src/lib/synthetic/providers/self-hosted-playwright-provider.ts` | Worker 未接続時は stub エラー |
| `src/lib/synthetic/region-route.ts` | `resolveGeoProxyUrl` ラップ |

Detection / Execute / Verify の本体はまだ `browserless-interaction-function.ts`（生成 JS）内。**Phase ②** で `interaction-engine/` + `InteractionPage` に抽出する。

## 環境変数

| 変数 | 意味 |
|------|------|
| `VIEWTRACE_SYNTHETIC_BROWSER_PROVIDER` | `browserless`（default） \| `self_hosted` |
| `SYNTHETIC_BROWSER_PROVIDER` | 上記のエイリアス |
| `VIEWTRACE_SYNTHETIC_BROWSER_FALLBACK` | `browserless` \| `none`（primary 失敗時） |
| `VIEWTRACE_SYNTHETIC_WORKER_URL` | 自社 Worker の interaction エンドポイント（Phase ③） |
| `VIEWTRACE_SYNTHETIC_WORKER_SECRET` | Worker 認証 |

Observation 撮影は引き続き `VIEWTRACE_CAPTURE_BACKEND`（本番 default Browserless）。Synthetic と Capture は別 Worker でもよい。

## 実装順（合意）

1. Provider interface + Watch / manual 切替 — **進行中**
2. Shared interaction engine（TS 関数、文字列生成は Browserless adapter のみ）
3. Playwright self-hosted provider（Vercel 外 Worker）
4. Proxy / region  resolver の拡張
5. Fallback + `execution` on `RegionalInteractionCheckV1`
6. Journey を同じ Provider 境界へ

## 原則

- Browserless = optional infrastructure provider
- ViewTrace Synthetic Engine = 自社 IP（Detect → Execute → Verify）
- Requested ≠ Observed（region / proxy も同様）
- Vercel は orchestration のみ。長時間 Chromium は Worker
