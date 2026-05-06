// Backward-compatible alias for Stripe Webhook endpoint.
// Some configs may point to /api/webhook/stripe; the canonical endpoint is /api/stripe/webhook.
//
// Important: define runtime locally (re-exporting runtime is not recognized by Next.js).
import { POST as stripeWebhookPost } from "@/app/api/stripe/webhook/route";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return stripeWebhookPost(req);
}

