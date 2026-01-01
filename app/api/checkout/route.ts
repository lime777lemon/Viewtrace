import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
})

const plans = {
  starter: {
    monthly: process.env.STRIPE_PRICE_ID_STARTER_MONTHLY || 'price_starter_monthly',
    annual: process.env.STRIPE_PRICE_ID_STARTER_ANNUAL || 'price_starter_annual',
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_ID_PRO_MONTHLY || 'price_pro_monthly',
    annual: process.env.STRIPE_PRICE_ID_PRO_ANNUAL || 'price_pro_annual',
  },
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const plan = searchParams.get('plan') || 'starter'
    const email = searchParams.get('email') || ''
    const billing = searchParams.get('billing') || 'monthly' // monthly or annual

    const priceId = plans[plan as keyof typeof plans]?.[billing as 'monthly' | 'annual'] || plans.starter.monthly

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${request.nextUrl.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/signup?plan=${plan}`,
      metadata: {
        plan,
        billing,
      },
    })

    return NextResponse.redirect(session.url || '/signup')
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.redirect('/signup?error=checkout_failed')
  }
}

