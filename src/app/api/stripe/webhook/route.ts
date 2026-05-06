import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Stripe Webhook（例: checkout.session.completed）。
 * Dashboard → Developers → Webhooks に `https://<本番ドメイン>/api/stripe/webhook` を登録し、
 * `STRIPE_WEBHOOK_SECRET` に Signing secret を設定してください。
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret) {
    return NextResponse.json(
      {
        ok: false,
        error: "webhook_not_configured",
        hasStripeSecretKey: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
        hasWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
      },
      { status: 503 },
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ ok: false, error: "missing_signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (e) {
    const message = e instanceof Error ? e.message : "invalid signature";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  // Idempotency: Stripe は同じイベントを複数回配信することがあるため、event.id を保存して重複処理を防ぐ。
  // ここで弾けると、下の DB 更新（ユーザー更新・subscriptions upsert）が二重実行されない。
  const adminForIdempotency = createSupabaseAdminClient();
  if (!adminForIdempotency) {
    console.warn(
      "[stripe webhook] supabase admin not configured; cannot enforce idempotency (SUPABASE_SERVICE_ROLE_KEY missing)",
    );
  } else {
    const { error: evtErr } = await adminForIdempotency.from("stripe_webhook_events").insert({
      event_id: event.id,
      event_type: event.type,
    });
    if (evtErr) {
      // Unique violation → already processed
      if (evtErr.code === "23505") {
        // Allow safe re-processing on retries/resends.
        // This is important when prior deliveries happened while the server was misconfigured
        // (e.g. missing SUPABASE_SERVICE_ROLE_KEY), so the event was recorded but side-effects
        // (user metadata / subscriptions upsert) did not apply.
        console.info("[stripe webhook] duplicate event id; re-processing", {
          event_id: event.id,
          event_type: event.type,
        });
      } else {
        console.error("[stripe webhook] failed to record event id", evtErr);
        // Fail closed: if we cannot guarantee idempotency, better to retry later
        return NextResponse.json({ ok: false, error: "idempotency_write_failed" }, { status: 503 });
      }
    }
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const planId = session.metadata?.plan_id ?? "";
      const userId = session.metadata?.user_id ?? "";
      const customerEmail = session.customer_email ?? session.customer_details?.email ?? "";
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : "";
      console.info("[stripe webhook] checkout.session.completed", {
        id: session.id,
        plan_id: planId,
        user_id: userId,
        customer_email: customerEmail,
        subscription: session.subscription,
      });

      // IMPORTANT: success_url ではなく webhook で確定させる（フロント依存にしない）
      // Supabase Auth の user_metadata を更新するには service_role が必要。
      const admin = createSupabaseAdminClient();
      if (!admin) {
        console.warn("[stripe webhook] supabase admin not configured (SUPABASE_SERVICE_ROLE_KEY missing)");
        break;
      }
      if (!userId || !planId) {
        console.warn("[stripe webhook] missing metadata", { userId, planId });
        break;
      }

      // Fetch subscription snapshot for auditing (optional)
      let status: string | null = null;
      try {
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          status = (sub as unknown as Stripe.Subscription).status ?? null;
        }
      } catch (e) {
        console.warn("[stripe webhook] failed to retrieve subscription", subscriptionId, e);
      }

      const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
        user_metadata: {
          plan: planId,
          trial_active: false,
          stripe_customer_id: session.customer ?? null,
          stripe_subscription_id: subscriptionId || null,
          stripe_checkout_session_id: session.id,
        },
      });
      if (updErr) {
        console.error("[stripe webhook] failed to update user metadata", updErr);
      }

      // Write audit row into public.subscriptions (best-effort)
      if (subscriptionId) {
        // subscriptions テーブルは stripe_price_id / plan / billing_period / status が NOT NULL のため、
        // subscription を取得して必要項目を埋めて保存する。
        let stripePriceId: string | null = null;
        let billingPeriod: string | null = null;
        let currentPeriodStart: string | null = null;
        let currentPeriodEnd: string | null = null;
        let cancelAtPeriodEnd: boolean | null = null;
        /** Stripe Subscription.created（購入日・サブスク開始の公式時刻） */
        let subscriptionCreatedAt: string | null = null;

        try {
          // Stripe types can differ by API version; treat as unknown and narrow by usage.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sub: any = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ["items.data.price"],
          });
          const firstItem = sub.items.data[0];
          const price = firstItem?.price as Stripe.Price | undefined;
          stripePriceId = price?.id ?? null;
          billingPeriod = price?.recurring?.interval ?? null;
          currentPeriodStart = sub.current_period_start
            ? new Date(sub.current_period_start * 1000).toISOString()
            : null;
          currentPeriodEnd = sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null;
          cancelAtPeriodEnd = sub.cancel_at_period_end ?? null;
          status = sub.status ?? status;
          if (typeof sub.created === "number" && Number.isFinite(sub.created) && sub.created > 0) {
            subscriptionCreatedAt = new Date(sub.created * 1000).toISOString();
          }
        } catch (e) {
          console.warn("[stripe webhook] failed to retrieve subscription details for db upsert", subscriptionId, e);
        }

        const { error: subErr } = await admin
          .from("subscriptions")
          .upsert(
            {
              user_id: userId,
              // keep both columns for compatibility with existing schema
              plan_id: planId,
              plan: planId,
              stripe_customer_id: session.customer ?? null,
              stripe_subscription_id: subscriptionId,
              stripe_price_id: stripePriceId ?? "unknown",
              billing_period: billingPeriod ?? "month",
              stripe_checkout_session_id: session.id,
              status: status ?? "unknown",
              current_period_start: currentPeriodStart,
              current_period_end: currentPeriodEnd,
              cancel_at_period_end: cancelAtPeriodEnd,
              mode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test",
              ...(subscriptionCreatedAt ? { created_at: subscriptionCreatedAt } : {}),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "stripe_subscription_id" },
          );
        if (subErr) {
          console.error("[stripe webhook] failed to upsert public.subscriptions", subErr);
        }
      } else {
        console.warn("[stripe webhook] missing subscription id; skip subscriptions upsert", {
          sessionId: session.id,
        });
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
