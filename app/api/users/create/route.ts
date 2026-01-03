import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role to bypass RLS
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, email, name, plan, billingPeriod } = body

    if (!userId || !email || !name) {
      return NextResponse.json(
        { error: 'userId, email, and name are required' },
        { status: 400 }
      )
    }

    // First, verify that the user exists in auth.users
    // This is required because public.users has a foreign key constraint to auth.users(id)
    // Use admin API to check (requires Service Role Key)
    try {
      const { data: authUser, error: authCheckError } = await supabase.auth.admin.getUserById(userId)
      
      if (authCheckError || !authUser?.user) {
        // If user doesn't exist in auth.users, wait and retry multiple times (for timing issues)
        console.warn('User not found in auth.users, waiting and retrying...', userId, authCheckError)
        
        let retryCount = 0
        const maxRetries = 5
        let authUserFound = false
        
        while (retryCount < maxRetries && !authUserFound) {
          await new Promise(resolve => setTimeout(resolve, 500)) // Wait 500ms between retries
          retryCount++
          
          const { data: retryAuthUser, error: retryError } = await supabase.auth.admin.getUserById(userId)
          if (!retryError && retryAuthUser?.user) {
            authUserFound = true
            console.log(`User found in auth.users after ${retryCount} retry(ies)`)
            break
          }
        }
        
        if (!authUserFound) {
          console.error(`User still not found in auth.users after ${maxRetries} retries:`, userId)
          // In dev mode, continue anyway (user might be created later, or we'll handle the FK error)
          if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
            console.warn('Dev mode: Continuing despite auth user check failure - will attempt upsert anyway')
          } else {
            return NextResponse.json(
              { error: 'User not found in auth system. Please ensure the user is created first.' },
              { status: 400 }
            )
          }
        }
      }
    } catch (adminError: any) {
      // If admin API fails, log but continue (might be permission issue)
      console.warn('Could not verify auth user (continuing anyway):', adminError)
    }

    // Use service role key to bypass RLS
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email,
        name,
        plan: plan || 'starter',
        billing_period: billingPeriod || 'monthly',
        subscription_status: process.env.NEXT_PUBLIC_DEV_MODE === 'true' ? 'active' : 'inactive',
        observations_limit: plan === 'pro' ? 200 : 50,
        observations_used: 0,
      }, {
        onConflict: 'id'
      })
      .select()

    if (error) {
      console.error('Error creating user profile:', error)
      
      // If it's a foreign key constraint error, provide helpful message
      if (error.code === '23503') {
        if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
          console.warn('Dev mode: Foreign key constraint error - user will be created on next login')
          return NextResponse.json(
            { warning: 'User profile creation delayed due to foreign key constraint. Will be created on next login.' },
            { status: 200 } // Return 200 to allow client to proceed
          )
        } else {
          return NextResponse.json(
            { error: 'User must be created in auth system first. Please try signing up again.' },
            { status: 400 }
          )
        }
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, user: data[0] })
  } catch (error: any) {
    console.error('User creation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


