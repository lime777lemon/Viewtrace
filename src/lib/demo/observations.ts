export type ObservationStatus = "success" | "failure" | "pending";

export type ObservationHistoryEvent = {
  at: string;
  kind: "capture" | "status" | "processing";
  label: string;
  detail?: string;
};

export type Observation = {
  id: string;
  url: string;
  /** 例: `US-WA`。DB などの保存用の地域値 */
  regionValue?: string;
  regionLabel: string;
  capturedAt: string;
  status: ObservationStatus;
  note?: string;
  /** 取得時点のページタイトル（OG / title 要素） */
  pageTitle?: string;
  /** プレビュー用画像 URL（OG 等）。本番ではフルキャプチャの CDN URL に置き換え */
  snapshotImageUrl?: string;
  /** ステータス・取得の履歴（デモはサンプル、本番はイベントログ） */
  events?: ObservationHistoryEvent[];
};

export const demoObservations: Observation[] = [
  {
    id: "obs_7k2m",
    url: "https://example.com/campaign/summer-sale",
    regionLabel: "US · California",
    capturedAt: "2026-05-04T14:32:00.000Z",
    status: "success",
    pageTitle: "Summer Sale — Example (demo)",
    snapshotImageUrl: "https://picsum.photos/seed/viewtrace-obs7k2m/1200/756",
    events: [
      {
        at: "2026-05-04T14:31:12.000Z",
        kind: "processing",
        label: "観測を開始",
        detail: "プロキシ: US-CA",
      },
      {
        at: "2026-05-04T14:31:48.000Z",
        kind: "capture",
        label: "フルページレンダリング完了",
        detail: "ビューポート 1440×900",
      },
      {
        at: "2026-05-04T14:32:00.000Z",
        kind: "status",
        label: "スナップショット保存",
        detail: "成功 · checksum a1b2…",
      },
    ],
  },
  {
    id: "obs_9p1q",
    url: "https://brand.example/lp/geo-promo",
    regionLabel: "US · New York",
    capturedAt: "2026-05-03T09:15:00.000Z",
    status: "success",
    pageTitle: "Geo promo LP",
    snapshotImageUrl: "https://picsum.photos/seed/viewtrace-obs9p1q/1200/756",
    events: [
      {
        at: "2026-05-03T09:14:20.000Z",
        kind: "processing",
        label: "観測を開始",
        detail: "プロキシ: US-NY",
      },
      {
        at: "2026-05-03T09:15:00.000Z",
        kind: "capture",
        label: "キャプチャ完了",
        detail: "差分用に前回スナップショットと比較可能",
      },
    ],
  },
  {
    id: "obs_3n8r",
    url: "https://track.ads.example/r?cid=8821",
    regionLabel: "US · Texas",
    capturedAt: "2026-05-02T18:00:00.000Z",
    status: "failure",
    note: "タイムアウト（取得時点）",
    pageTitle: "Ad redirect",
    events: [
      {
        at: "2026-05-02T17:59:30.000Z",
        kind: "processing",
        label: "観測を開始",
        detail: "プロキシ: US-TX",
      },
      {
        at: "2026-05-02T18:00:00.000Z",
        kind: "status",
        label: "取得失敗",
        detail: "タイムアウト（取得時点）",
      },
    ],
  },
  {
    id: "obs_1a4b",
    url: "https://shop.example.com/pages/state-tx",
    regionLabel: "US · Texas",
    capturedAt: "2026-05-01T11:20:00.000Z",
    status: "success",
    snapshotImageUrl: "https://picsum.photos/seed/viewtrace-obs1a4b/1200/756",
    events: [
      {
        at: "2026-05-01T11:19:40.000Z",
        kind: "processing",
        label: "観測を開始",
        detail: "プロキシ: US-TX",
      },
      {
        at: "2026-05-01T11:20:00.000Z",
        kind: "capture",
        label: "スナップショット保存",
        detail: "成功",
      },
    ],
  },
  {
    id: "obs_5c6d",
    url: "https://saas.example/pricing?region=jp",
    regionLabel: "US · Washington",
    capturedAt: "2026-04-30T08:45:00.000Z",
    status: "pending",
    events: [
      {
        at: "2026-04-30T08:44:50.000Z",
        kind: "processing",
        label: "観測をキューに投入",
        detail: "待機中…",
      },
      {
        at: "2026-04-30T08:45:00.000Z",
        kind: "status",
        label: "処理中",
        detail: "レンダリング待ち",
      },
    ],
  },
];

export function getObservationById(id: string): Observation | undefined {
  return demoObservations.find((o) => o.id === id);
}
