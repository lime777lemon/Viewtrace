import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { useMockWorker } from '@/lib/dev-bypass'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both sync and async params (Next.js 14 vs 15)
    const resolvedParams = await Promise.resolve(params)
    const observationId = resolvedParams.id
    
    console.log(`[Retry] Retrying observation ${observationId}`)
    
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the observation
    const { data: observation, error: obsError } = await supabase
      .from('observations')
      .select('*')
      .eq('id', observationId)
      .eq('user_id', user.id)
      .single()

    if (obsError || !observation) {
      return NextResponse.json(
        { error: 'Observation not found' },
        { status: 404 }
      )
    }

    // Check if observation can be retried
    if (observation.status === 'pending' || observation.status === 'running') {
      return NextResponse.json(
        { error: `Cannot retry observation with status: ${observation.status}. Observation is already being processed.` },
        { status: 400 }
      )
    }

    if (observation.status === 'completed') {
      return NextResponse.json(
        { error: `Cannot retry observation with status: ${observation.status}. Observation already completed successfully.` },
        { status: 400 }
      )
    }

    // Reset observation status to pending for retry
    const { data: updated, error: updateError } = await supabase
      .from('observations')
      .update({
        status: 'pending',
        screenshot_url: null, // Clear previous screenshot
        text_content: null, // Clear previous text content
        result_status: null, // Clear previous result status
        captured_at: null, // Clear previous capture time
        updated_at: new Date().toISOString(),
      })
      .eq('id', observationId)
      .select()
      .single()

    if (updateError) {
      console.error('[Retry] Error updating observation:', updateError)
      return NextResponse.json(
        { error: 'Failed to retry observation' },
        { status: 500 }
      )
    }

    console.log(`[Retry] Observation ${observationId} reset to pending status`)

    // Trigger processing if in dev mode
    if (useMockWorker()) {
      // Import and trigger worker processing
      const { chromium } = await import('playwright')
      const { createClient } = await import('@supabase/supabase-js')
      const serviceSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      // Get timezone based on region
      const getTimezone = (region: string) => {
        const timezoneMap: Record<string, string> = {
          'US-CA': 'America/Los_Angeles',
          'US-NY': 'America/New_York',
          'US-TX': 'America/Chicago',
          'US-FL': 'America/New_York',
          'US-AZ': 'America/Phoenix',
        }
        return timezoneMap[region] || 'America/New_York'
      }

      // Process the observation
      (async () => {
        console.log(`[Retry Worker] Starting retry processing for observation ${observationId}`)
        try {
          // Update status to running
          await serviceSupabase
            .from('observations')
            .update({ status: 'running', updated_at: new Date().toISOString() })
            .eq('id', observationId)

          let browser = null
          try {
            console.log(`[Retry Worker] Launching browser for observation ${observationId}`)
            browser = await chromium.launch({
              headless: true,
              args: ['--no-sandbox', '--disable-setuid-sandbox'],
            })
            console.log(`[Retry Worker] Browser launched for observation ${observationId}`)

            const context = await browser.newContext({
              viewport: { width: 1920, height: 1080 },
              locale: 'en-US',
              timezoneId: getTimezone(observation.region),
            })

            const page = await context.newPage()

            // Check if cancelled
            const { data: checkObs } = await serviceSupabase
              .from('observations')
              .select('status')
              .eq('id', observationId)
              .single()

            if (!checkObs || checkObs.status === 'cancelled') {
              console.log(`[Retry Worker] Observation ${observationId} was cancelled, closing browser`)
              await browser.close()
              return
            }

            // Navigate to URL
            console.log(`[Retry Worker] Navigating to ${observation.url} for observation ${observationId}`)
            await page.goto(observation.url, {
              waitUntil: 'domcontentloaded',
              timeout: 10000,
            })
            console.log(`[Retry Worker] Page loaded for observation ${observationId}`)

            // Capture screenshot and extract text
            console.log(`[Retry Worker] Capturing screenshot for observation ${observationId}`)
            const [screenshotBuffer, textContent, pageTitle] = await Promise.all([
              page.screenshot({
                type: 'png',
                fullPage: true,
                timeout: 5000,
              }),
              page.evaluate(() => {
                const scripts = document.querySelectorAll('script, style, noscript')
                scripts.forEach(el => el.remove())
                return document.body.innerText.replace(/\s+/g, ' ').trim()
              }),
              page.title(),
            ])

            await browser.close()
            browser = null
            console.log(`[Retry Worker] Screenshot captured for observation ${observationId}, size: ${screenshotBuffer.length} bytes`)

            // Upload to Storage
            console.log(`[Retry Worker] Uploading screenshot to storage for observation ${observationId}`)
            const fileName = `${observationId}-${Date.now()}.png`
            const { data: uploadData, error: uploadError } = await serviceSupabase.storage
              .from('screenshots')
              .upload(fileName, screenshotBuffer, {
                contentType: 'image/png',
                upsert: false,
              })

            if (uploadError) {
              throw new Error(`Storage upload failed: ${uploadError.message}`)
            }

            const { data: { publicUrl } } = serviceSupabase.storage
              .from('screenshots')
              .getPublicUrl(fileName)

            console.log(`[Retry Worker] Storage upload successful for observation ${observationId}, Public URL:`, publicUrl)

            // Update observation
            const resultStatus = pageTitle ? 'observed' : 'no_issues'
            const { error: updateError } = await serviceSupabase
              .from('observations')
              .update({
                status: 'completed',
                screenshot_url: publicUrl,
                text_content: textContent,
                result_status: resultStatus,
                captured_at: new Date().toISOString(),
              })
              .eq('id', observationId)

            if (updateError) {
              console.error(`[Retry Worker] Database update error for observation ${observationId}:`, updateError)
            } else {
              console.log(`[Retry Worker] ✅ Observation ${observationId} retry completed successfully with URL:`, publicUrl)
            }
          } catch (error: any) {
            console.error(`[Retry Worker] Error for observation ${observationId}:`, error)
            console.error(`[Retry Worker] Error stack:`, error?.stack)

            if (browser) {
              try {
                await browser.close()
              } catch (closeError) {
                console.error(`[Retry Worker] Error closing browser:`, closeError)
              }
            }

            // Update to failed
            await serviceSupabase
              .from('observations')
              .update({
                status: 'failed',
                updated_at: new Date().toISOString(),
              })
              .eq('id', observationId)
          }
        } catch (error: any) {
          console.error(`[Retry Worker] Fatal error:`, error)
          await serviceSupabase
            .from('observations')
            .update({
              status: 'failed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', observationId)
        }
      })()
    }

    return NextResponse.json({
      success: true,
      observation: updated,
      message: 'Observation queued for retry',
    })
  } catch (error) {
    console.error('[Retry] API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

