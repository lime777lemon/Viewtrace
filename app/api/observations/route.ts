import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { bypassSubscriptionCheck, useMockWorker } from '@/lib/dev-bypass'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { url, region } = body

    if (!url || !region) {
      return NextResponse.json(
        { error: 'URL and region are required' },
        { status: 400 }
      )
    }

    // Development mode: bypass subscription check
    if (!bypassSubscriptionCheck()) {
      // Check user's observation limit
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('observations_used, observations_limit, subscription_status')
        .eq('id', user.id)
        .single()

      if (userError || !userData) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      if (userData.subscription_status !== 'active') {
        return NextResponse.json(
          { error: 'Active subscription required' },
          { status: 403 }
        )
      }

      if (userData.observations_used >= userData.observations_limit) {
        return NextResponse.json(
          { error: 'Observation limit reached' },
          { status: 403 }
        )
      }
    }

    // Create observation record
    const { data: observation, error: obsError } = await supabase
      .from('observations')
      .insert({
        user_id: user.id,
        url,
        region,
        status: 'pending',
      })
      .select()
      .single()

    if (obsError) {
      console.error('Error creating observation:', obsError)
      return NextResponse.json(
        { error: 'Failed to create observation' },
        { status: 500 }
      )
    }

    // Development mode: Use actual Playwright for screenshot capture and Storage upload
    if (useMockWorker()) {
      // Run Playwright in background (non-blocking)
      setTimeout(async () => {
        let browser = null
        try {
          // Import Playwright dynamically
          const { chromium } = await import('playwright')
          
          // Use service role key for Storage upload
          const { createClient } = await import('@supabase/supabase-js')
          const serviceSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          )
          
          // 1. Launch browser and capture screenshot
          browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
          })
          
          const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            locale: region === 'US-CA' ? 'en-US' : 'en-US',
            timezoneId: region === 'US-CA' ? 'America/Los_Angeles' : 'America/New_York',
          })
          
          const page = await context.newPage()
          
          // Navigate to URL
          await page.goto(url, {
            waitUntil: 'networkidle',
            timeout: 30000,
          })
          
          // Wait for page to fully load
          await page.waitForTimeout(2000)
          
          // Capture screenshot as PNG
          const screenshotBuffer = await page.screenshot({
            type: 'png',
            fullPage: false, // Viewport only
          })
          
          // Get page title before closing browser
          const pageTitle = await page.title()
          await browser.close()
          browser = null // Mark as closed
          
          // 2. Upload to Storage
          const fileName = `${observation.id}-${Date.now()}.png`
          const { data: uploadData, error: uploadError } = await serviceSupabase.storage
            .from('screenshots')
            .upload(fileName, screenshotBuffer, {
              contentType: 'image/png',
              upsert: false,
            })
          
          if (uploadError) {
            console.error('Storage upload error:', uploadError)
            
            // Check if bucket doesn't exist
            const errorMessage = uploadError.message || ''
            const isBucketNotFound = errorMessage.includes('Bucket not found') || 
                                   errorMessage.includes('bucket') && errorMessage.includes('not found') ||
                                   (uploadError as any).status === 404 ||
                                   (uploadError as any).statusCode === '404'
            
            if (isBucketNotFound) {
              console.error('⚠️ Storage bucket "screenshots" not found!')
              console.error('Please create the bucket in Supabase Dashboard:')
              console.error('1. Go to Supabase Dashboard > Storage > Buckets')
              console.error('2. Click "Create bucket"')
              console.error('3. Name: screenshots')
              console.error('4. Public bucket: Yes')
              console.error('5. Click "Create bucket"')
              
              // Update observation with error status
              await serviceSupabase
                .from('observations')
                .update({
                  status: 'failed',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', observation.id)
              
              return // Exit early, don't throw
            }
            
            throw new Error(`Storage upload failed: ${uploadError.message}`)
          }
          
          // 3. Get Public URL
          const { data: { publicUrl } } = serviceSupabase.storage
            .from('screenshots')
            .getPublicUrl(fileName)
          
          console.log('Storage upload successful, Public URL:', publicUrl)
          
          // 4. Save Public URL to database
          // Determine result status based on page content (simple check)
          const resultStatus = pageTitle ? 'observed' : 'no_issues'
          const { data: updated, error: updateError } = await serviceSupabase
            .from('observations')
            .update({
              status: 'completed',
              screenshot_url: publicUrl, // Public URL from Storage
              result_status: resultStatus,
              captured_at: new Date().toISOString(),
            })
            .eq('id', observation.id)
            .select()
          
          if (updateError) {
            console.error('Database update error:', updateError)
          } else {
            console.log('Observation updated with Storage URL:', updated)
          }
        } catch (error: any) {
          console.error('Playwright worker error:', error)
          
          // Close browser if still open
          if (browser) {
            try {
              await browser.close()
            } catch (closeError) {
              // Ignore close errors
            }
          }
          
          // Update observation with error status
          try {
            const { createClient } = await import('@supabase/supabase-js')
            const serviceSupabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!
            )
            await serviceSupabase
              .from('observations')
              .update({
                status: 'failed',
                updated_at: new Date().toISOString(),
              })
              .eq('id', observation.id)
          } catch (updateError) {
            console.error('Failed to update observation status:', updateError)
          }
        }
      }, 100) // Small delay to allow API response to return first
    } else {
      // Production: Trigger real worker
      const workerUrl = process.env.WORKER_URL || 'https://worker.viewtrace.net'
      const workerResponse = await fetch(`${workerUrl}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.WORKER_SECRET || ''}`,
        },
        body: JSON.stringify({
          observationId: observation.id,
          url,
          region,
        }),
      })

      if (!workerResponse.ok) {
        // Update observation status to failed
        await supabase
          .from('observations')
          .update({ status: 'failed' })
          .eq('id', observation.id)
        
        return NextResponse.json(
          { error: 'Failed to trigger worker' },
          { status: 500 }
        )
      }
    }

    // Increment observations_used (only if not in dev mode)
    if (!bypassSubscriptionCheck()) {
      const { data: userData } = await supabase
        .from('users')
        .select('observations_used')
        .eq('id', user.id)
        .single()

      if (userData) {
        await supabase
          .from('users')
          .update({ observations_used: (userData.observations_used || 0) + 1 })
          .eq('id', user.id)
      }
    }

    return NextResponse.json({
      success: true,
      observation: {
        id: observation.id,
        status: 'pending',
      },
    })
  } catch (error) {
    console.error('Observation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's observations
    const { data: observations, error } = await supabase
      .from('observations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching observations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch observations' },
        { status: 500 }
      )
    }

    return NextResponse.json({ observations })
  } catch (error) {
    console.error('Observations API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

