const WEBHOOK_URL_MAX = 500;

export function normalizeObservationWebhookUrl(raw: string | undefined | null): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return null;
  if (trimmed.length > WEBHOOK_URL_MAX) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export type ObservationWebhookPayload = {
  event: "observation.auto_saved";
  observationId: string;
  url: string;
  region: string;
  capturedAt: string;
  status: "success" | "failure";
  snapshotUrl?: string;
  snapshotSha256?: string;
  diffRatio?: number;
  recordUrl: string;
};

/** Slack / Teams / Zapier / Make 等の incoming webhook 向け JSON POST（失敗しても throw しない） */
export async function postObservationWebhook(
  webhookUrl: string,
  payload: ObservationWebhookPayload,
): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}
