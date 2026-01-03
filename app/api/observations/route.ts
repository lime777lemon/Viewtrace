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
    const { url, region, regions } = body

    // Support both single region (backward compatibility) and multiple regions
    const regionsToProcess = regions && Array.isArray(regions) ? regions : (region ? [region] : [])
    
    if (!url || regionsToProcess.length === 0) {
      return NextResponse.json(
        { error: 'URL and at least one region are required' },
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

      // Check if user has enough quota for all regions
      const totalNeeded = regionsToProcess.length
      if (userData.observations_used + totalNeeded > userData.observations_limit) {
        return NextResponse.json(
          { error: `Observation limit reached. You need ${totalNeeded} observations but only have ${userData.observations_limit - userData.observations_used} remaining.` },
          { status: 403 }
        )
      }
    }

    // Create observation records for each region
    const observationsToCreate = regionsToProcess.map(region => ({
      user_id: user.id,
      url,
      region,
      status: 'pending',
    }))

    const { data: observations, error: obsError } = await supabase
      .from('observations')
      .insert(observationsToCreate)
      .select()

    if (obsError) {
      console.error('Error creating observations:', obsError)
      return NextResponse.json(
        { error: 'Failed to create observations' },
        { status: 500 }
      )
    }

    if (!observations || observations.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create observations' },
        { status: 500 }
      )
    }

    // Use first observation for backward compatibility
    const observation = observations[0]

    // Development mode: Use actual Playwright for screenshot capture and Storage upload
    if (useMockWorker()) {
      const observationIds = observations.map(o => o.id).join(', ')
      const observationUrls = observations.map(o => o.url).join(', ')
      const observationRegions = observations.map(o => o.region).join(', ')
      
      console.log(`[API] Creating ${observations.length} observation(s) and starting background worker`)
      console.log(`[API] Observation IDs:`, observationIds)
      console.log(`[API] URLs:`, observationUrls)
      console.log(`[API] Regions:`, observationRegions)
      
      // Run Playwright in background (non-blocking)
      // Execute immediately but don't await to return response quickly
      void (async () => {
        console.log(`[Worker] ========================================`)
        console.log(`[Worker] Background task started for ${observations.length} observation(s)`)
        console.log(`[Worker] Observation IDs:`, observations.map(o => o.id).join(', '))
        console.log(`[Worker] ========================================`)
        try {
          // Import Playwright dynamically
          console.log(`[Worker] Step 1: Importing Playwright...`)
          const { chromium } = await import('playwright')
          console.log(`[Worker] ✅ Playwright imported successfully`)
          
          // Use service role key for Storage upload
          const { createClient } = await import('@supabase/supabase-js')
          const serviceSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          )
          
          // Get timezone based on region
          const getTimezone = (region: string) => {
            // Map common US regions to timezones
            const timezoneMap: Record<string, string> = {
              'US-CA': 'America/Los_Angeles',
              'US-NY': 'America/New_York',
              'US-TX': 'America/Chicago',
              'US-FL': 'America/New_York',
              'US-AZ': 'America/Phoenix',
            }
            return timezoneMap[region] || 'America/New_York'
          }
          
          // Process each observation
          for (const obs of observations) {
            // Check if observation was cancelled before processing
            const { data: currentObs } = await serviceSupabase
              .from('observations')
              .select('status')
              .eq('id', obs.id)
              .single()
            
            if (!currentObs || currentObs.status === 'cancelled') {
              console.log(`[Worker] Skipping cancelled observation ${obs.id}`)
              continue
            }
            
            // Update status to running
            console.log(`[Worker] Starting processing for observation ${obs.id}`)
            const startTime = Date.now()
            await serviceSupabase
              .from('observations')
              .update({ status: 'running', updated_at: new Date().toISOString() })
              .eq('id', obs.id)
            
            let browser = null
            try {
              console.log(`[Worker] Launching browser for observation ${obs.id}`)
              
              // Add timeout for browser launch (30 seconds)
              browser = await Promise.race([
                chromium.launch({
                  headless: true,
                  args: ['--no-sandbox', '--disable-setuid-sandbox'],
                }),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Browser launch timeout')), 30000)
                ) as Promise<any>
              ])
              
              console.log(`[Worker] Browser launched for observation ${obs.id}`)
              
              const context = await browser.newContext({
                viewport: { width: 1920, height: 1080 },
                locale: 'en-US',
                timezoneId: getTimezone(obs.region),
              })
          
              const page = await context.newPage()
              
              // Check again if cancelled after browser launch
              const { data: checkObs } = await serviceSupabase
                .from('observations')
                .select('status')
                .eq('id', obs.id)
                .single()
              
              if (!checkObs || checkObs.status === 'cancelled') {
                console.log(`Observation ${obs.id} was cancelled, closing browser`)
                await browser.close()
                continue
              }
              
              // Navigate to URL with timeout handling
              console.log(`Navigating to ${obs.url} for observation ${obs.id}`)
              try {
                await page.goto(obs.url, {
                  waitUntil: 'domcontentloaded',
                  timeout: 30000, // Increased to 30s for reliability
                })
                console.log(`Page loaded for observation ${obs.id}`)
              } catch (gotoError: any) {
                console.error(`[Worker] Page navigation failed for observation ${obs.id}:`, gotoError?.message)
                throw new Error(`Failed to navigate to URL: ${gotoError?.message || 'Timeout'}`)
              }
              
              // Extract text content and capture screenshot in parallel for speed
              console.log(`Capturing screenshot for observation ${obs.id}`)
              let screenshotBuffer: Buffer
              let textContent: string
              let pageTitle: string
              
              try {
                [screenshotBuffer, textContent, pageTitle] = await Promise.all([
                  // Screenshot with timeout
                  page.screenshot({
                    type: 'png',
                    fullPage: true,
                    timeout: 30000, // Increased to 30s
                  }),
                  // Text extraction - simplified for speed
                  page.evaluate(() => {
                    const scripts = document.querySelectorAll('script, style, noscript')
                    scripts.forEach(el => el.remove())
                    return document.body.innerText.replace(/\s+/g, ' ').trim()
                  }),
                  // Page title
                  page.title(),
                ])
              } catch (screenshotError: any) {
                console.error(`[Worker] Screenshot capture failed for observation ${obs.id}:`, screenshotError?.message)
                throw new Error(`Failed to capture screenshot: ${screenshotError?.message || 'Timeout'}`)
              }
              console.log(`Screenshot captured for observation ${obs.id}, size: ${screenshotBuffer.length} bytes`)
              
              // Close browser before upload to free resources
              await browser.close()
              browser = null // Mark as closed
              console.log(`[Worker] Browser closed for observation ${obs.id}`)
              
              // 2. Upload to Storage
              console.log(`[Worker] Uploading screenshot to storage for observation ${obs.id}`)
              const fileName = `${obs.id}-${Date.now()}.png`
              
              // Add timeout wrapper for upload
              const uploadPromise = serviceSupabase.storage
                .from('screenshots')
                .upload(fileName, screenshotBuffer, {
                  contentType: 'image/png',
                  upsert: false,
                })
              
              // Add timeout to upload (60 seconds)
              const uploadTimeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Storage upload timeout')), 60000)
              )
              
              const { data: uploadData, error: uploadError } = await Promise.race([
                uploadPromise,
                uploadTimeout,
              ]) as any
            
              if (uploadError) {
                console.error(`Storage upload error for observation ${obs.id}:`, uploadError)
                
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
                    .eq('id', obs.id)
                  
                  continue // Skip to next observation
                }
                
                throw new Error(`Storage upload failed: ${uploadError.message}`)
              }
              
              // 3. Get Public URL
              const { data: { publicUrl } } = serviceSupabase.storage
                .from('screenshots')
                .getPublicUrl(fileName)
              
              console.log(`[Worker] Storage upload successful for observation ${obs.id}, Public URL:`, publicUrl)
              
              // 4. Save Public URL and text content to database
              // Determine result status: if we successfully captured screenshot and content, it's 'observed'
              // 'no_issues' is only for when we detect no problems, but we always want to mark as 'observed' if capture succeeded
              const hasContent = screenshotBuffer && screenshotBuffer.length > 0 && textContent && textContent.length > 0
              const resultStatus = hasContent ? 'observed' : 'no_issues'
              
              console.log(`[Worker] Setting result_status to '${resultStatus}' for observation ${obs.id}`)
              console.log(`[Worker] Screenshot size: ${screenshotBuffer.length} bytes, Text length: ${textContent?.length || 0} chars, Page title: '${pageTitle || '(empty)'}'`)
              
              // Try to update with text_content, but fallback if column doesn't exist
              let updateData: any = {
                status: 'completed',
                screenshot_url: publicUrl,
                result_status: resultStatus,
                captured_at: new Date().toISOString(),
              }
              
              // Check if text_content column exists by trying to update it
              // If it fails with PGRST204, we'll retry without text_content
              const { data: updated, error: updateError } = await serviceSupabase
                .from('observations')
                .update({
                  ...updateData,
                  text_content: textContent, // Try to include text_content
                })
                .eq('id', obs.id)
                .select()
              
              if (updateError) {
                // Check if error is due to missing text_content column
                const isTextContentError = updateError.code === 'PGRST204' && 
                                         updateError.message?.includes('text_content')
                
                if (isTextContentError) {
                  console.warn(`[Worker] ⚠️ text_content column not found, updating without it for observation ${obs.id}`)
                  console.warn(`[Worker] Please run the migration: supabase/add_text_content_column.sql`)
                  
                  // Retry without text_content
                  const { data: updatedRetry, error: retryError } = await serviceSupabase
                    .from('observations')
                    .update(updateData) // Without text_content
                    .eq('id', obs.id)
                    .select()
                  
                  if (retryError) {
                    console.error(`[Worker] ❌ Database update error (retry) for observation ${obs.id}:`, retryError)
                    throw new Error(`Failed to update observation: ${retryError.message}`)
                  } else {
                    console.log(`[Worker] ✅ Observation ${obs.id} completed successfully (without text_content) with URL:`, publicUrl)
                    console.log(`[Worker] ✅ Status: completed, Result status: ${resultStatus}`)
                  }
                } else {
                  console.error(`[Worker] ❌ Database update error for observation ${obs.id}:`, updateError)
                  throw new Error(`Failed to update observation: ${updateError.message}`)
                }
              } else {
                console.log(`[Worker] ✅ Observation ${obs.id} completed successfully with URL:`, publicUrl)
                console.log(`[Worker] ✅ Status: completed, Result status: ${resultStatus}`)
              }
            } catch (error: any) {
              console.error(`[Worker] ========================================`)
              console.error(`[Worker] ⚠️ ERROR for observation ${obs.id}`)
              console.error(`[Worker] URL: ${obs.url}`)
              console.error(`[Worker] Region: ${obs.region}`)
              console.error(`[Worker] Error type: ${error?.constructor?.name || 'Unknown'}`)
              console.error(`[Worker] Error message:`, error?.message || 'No error message')
              console.error(`[Worker] Error code:`, error?.code || 'N/A')
              console.error(`[Worker] Error stack:`, error?.stack || 'No stack trace')
              console.error(`[Worker] ========================================`)
              
              // Close browser if still open (with timeout)
              if (browser) {
                try {
                  await Promise.race([
                    browser.close(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Browser close timeout')), 5000))
                  ])
                  console.log(`[Worker] Browser closed for observation ${obs.id}`)
                } catch (closeError) {
                  console.error(`[Worker] Error closing browser for observation ${obs.id}:`, closeError)
                  // Force kill browser process if needed
                  try {
                    await Promise.race([
                      browser.close(),
                      new Promise((_, reject) => setTimeout(() => reject(new Error('Force close timeout')), 1000))
                    ])
                  } catch (e) {
                    // Ignore - browser may already be closed
                  }
                }
              }
              
              // Update observation with error status (with retry)
              let updateSuccess = false
              for (let retry = 0; retry < 3; retry++) {
                try {
                  const updateResult = await serviceSupabase
                    .from('observations')
                    .update({
                      status: 'failed',
                      updated_at: new Date().toISOString(),
                    })
                    .eq('id', obs.id)
                    .select()
                  
                  if (updateResult.error) {
                    console.error(`[Worker] Failed to update observation ${obs.id} status (attempt ${retry + 1}):`, updateResult.error)
                    if (retry < 2) {
                      await new Promise(resolve => setTimeout(resolve, 1000))
                      continue
                    }
                  } else {
                    console.log(`[Worker] ✅ Updated observation ${obs.id} to failed status`)
                    updateSuccess = true
                    break
                  }
                } catch (updateError) {
                  console.error(`[Worker] Exception updating observation ${obs.id} status (attempt ${retry + 1}):`, updateError)
                  if (retry < 2) {
                    await new Promise(resolve => setTimeout(resolve, 1000))
                    continue
                  }
                }
              }
              
              if (!updateSuccess) {
                console.error(`[Worker] ❌ CRITICAL: Failed to update observation ${obs.id} status after 3 attempts`)
              }
            }
            
            const elapsedTime = Date.now() - startTime
            console.log(`[Worker] ✅ Observation ${obs.id} processing completed in ${elapsedTime}ms`)
          }
        } catch (error: any) {
          console.error('[Worker] ========================================')
          console.error('[Worker] ❌ FATAL ERROR processing observations')
          console.error('[Worker] Error type:', error?.constructor?.name || 'Unknown')
          console.error('[Worker] Error message:', error?.message || 'No error message')
          console.error('[Worker] Error code:', error?.code || 'N/A')
          console.error('[Worker] Error stack:', error?.stack || 'No stack trace')
          console.error('[Worker] Affected observations:', observations.map(o => o.id).join(', '))
          console.error('[Worker] ========================================')
          
          // Update all observations to failed status
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
              .in('id', observations.map(o => o.id))
            
            console.log(`[Worker] Updated ${observations.length} observations to failed status`)
          } catch (updateError) {
            console.error('[Worker] Failed to update observation statuses:', updateError)
          }
        }
      })() // Execute immediately (IIFE - Immediately Invoked Function Expression)
      
      console.log(`[API] Background worker started (non-blocking)`)
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
          observationIds: observations.map(o => o.id),
          url,
          regions: regionsToProcess,
        }),
      })

      if (!workerResponse.ok) {
        // Update all observations status to failed
        await supabase
          .from('observations')
          .update({ status: 'failed' })
          .in('id', observations.map(o => o.id))
        
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
          .update({ observations_used: (userData.observations_used || 0) + observations.length })
          .eq('id', user.id)
      }
    }

    return NextResponse.json({
      success: true,
      observations: observations.map(o => ({
        id: o.id,
        region: o.region,
        status: o.status,
      })),
      observation: observations[0], // For backward compatibility
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
    console.log('[GET /api/observations] Request received')
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('[GET /api/observations] Unauthorized')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log(`[GET /api/observations] Fetching observations for user ${user.id}`)

    // Get user's observations
    const { data: observations, error } = await supabase
      .from('observations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[GET /api/observations] Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch observations', details: error.message },
        { status: 500 }
      )
    }

    console.log(`[GET /api/observations] Found ${observations?.length || 0} observations`)
    return NextResponse.json({ observations: observations || [] })
  } catch (error) {
    console.error('[GET /api/observations] Exception:', error)
    console.error('[GET /api/observations] Error stack:', error instanceof Error ? error.stack : 'No stack')
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

