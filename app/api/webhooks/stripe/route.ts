import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

// Use service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      
      // Get Supabase user ID from metadata or client_reference_id
      const userId = session.metadata?.userId || session.client_reference_id
      const customerId = session.customer as string // Stripe Customer ID
      const subscriptionId = session.subscription as string // Stripe Subscription ID
      const plan = session.metadata?.plan || 'starter'
      const billing = session.metadata?.billing || 'monthly'

      console.log('Checkout completed:', {
        sessionId: session.id,
        customerId,
        subscriptionId,
        userId,
        plan,
        billing,
      })

      if (!userId || !customerId || !subscriptionId) {
        console.error('Missing required data:', { userId, customerId, subscriptionId })
        return NextResponse.json({ error: 'Missing required data' }, { status: 400 })
      }

      // Get subscription details from Stripe
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const priceId = subscription.items.data[0]?.price.id || ''

      // Update user with stripe_customer_id and stripe_subscription_id
      const { error: userError } = await supabase
        .from('users')
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_status: 'active',
          plan: plan,
          billing_period: billing,
          observations_limit: plan === 'pro' ? 200 : 50,
        })
        .eq('id', userId)

      if (userError) {
        console.error('Error updating user:', userError)
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
      }

      // Create or update subscription record
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          stripe_subscription_id: subscriptionId,
          stripe_price_id: priceId,
          plan: plan,
          billing_period: billing,
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end || false,
        }, {
          onConflict: 'stripe_subscription_id'
        })

      if (subError) {
        console.error('Error creating subscription:', subError)
        // Don't fail the webhook if subscription record creation fails
      }

      console.log('Successfully processed checkout.session.completed')
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      
      console.log('Subscription updated:', subscription.id)

      // Find user by stripe_subscription_id
      const { data: subscriptionData, error: findError } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subscription.id)
        .single()

      if (findError || !subscriptionData) {
        console.error('Subscription not found:', findError)
        break
      }

      // Update subscription record
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end || false,
        })
        .eq('stripe_subscription_id', subscription.id)

      if (updateError) {
        console.error('Error updating subscription:', updateError)
      }

      // Update user subscription status
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          subscription_status: subscription.status === 'active' ? 'active' : 
                              subscription.status === 'canceled' ? 'canceled' : 'canceling',
        })
        .eq('id', subscriptionData.user_id)

      if (userUpdateError) {
        console.error('Error updating user subscription status:', userUpdateError)
      }

      break
    }

    case 'customer.subscription.deleted': {
      const deletedSubscription = event.data.object as Stripe.Subscription
      
      console.log('Subscription canceled:', deletedSubscription.id)

      // Find user by stripe_subscription_id
      const { data: subscriptionData, error: findError } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', deletedSubscription.id)
        .single()

      if (findError || !subscriptionData) {
        console.error('Subscription not found:', findError)
        break
      }

      // Update subscription record
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
        })
        .eq('stripe_subscription_id', deletedSubscription.id)

      if (updateError) {
        console.error('Error updating subscription:', updateError)
      }

      // Update user subscription status
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          subscription_status: 'canceled',
        })
        .eq('id', subscriptionData.user_id)

      if (userUpdateError) {
        console.error('Error updating user subscription status:', userUpdateError)
      }

      break
    }

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}

