// Backward-compatible alias for Stripe Webhook endpoint.
// Some docs/configs may point to /api/webhook/stripe; the canonical endpoint is /api/stripe/webhook.
export { POST, runtime } from "@/app/api/stripe/webhook/route";

