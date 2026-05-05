import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
  const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  const hasStripeSecretKey = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  const hasStripeWebhookSecret = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());

  return NextResponse.json({
    ok: true,
    env: {
      hasSupabaseUrl,
      hasAnonKey,
      hasServiceRoleKey,
      hasStripeSecretKey,
      hasStripeWebhookSecret,
    },
  });
}

