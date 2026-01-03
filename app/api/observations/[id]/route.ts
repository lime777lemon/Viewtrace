import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both sync and async params (Next.js 14 vs 15)
    const resolvedParams = await Promise.resolve(params)
    const observationId = resolvedParams.id
    
    console.log(`[GET /api/observations/${observationId}] Fetching observation`)
    
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log(`[GET /api/observations/${observationId}] Unauthorized`)
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

    if (obsError) {
      console.error(`[GET /api/observations/${observationId}] Database error:`, obsError)
      return NextResponse.json(
        { error: 'Observation not found', details: obsError.message },
        { status: 404 }
      )
    }
    
    if (!observation) {
      console.log(`[GET /api/observations/${observationId}] Observation not found in database`)
      return NextResponse.json(
        { error: 'Observation not found' },
        { status: 404 }
      )
    }
    
    console.log(`[GET /api/observations/${observationId}] Found observation with status: ${observation.status}`)

    // Get other observations with the same URL (for region comparison)
    const { data: relatedObservations, error: relatedError } = await supabase
      .from('observations')
      .select('*')
      .eq('user_id', user.id)
      .eq('url', observation.url)
      .order('region', { ascending: true })
      .order('created_at', { ascending: false })

    if (relatedError) {
      console.error('Error fetching related observations:', relatedError)
    }

    // Get history observations (same URL and region, ordered by date)
    const { data: historyObservations, error: historyError } = await supabase
      .from('observations')
      .select('*')
      .eq('user_id', user.id)
      .eq('url', observation.url)
      .eq('region', observation.region)
      .neq('id', observationId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (historyError) {
      console.error('Error fetching history observations:', historyError)
    }

    return NextResponse.json({
      observation,
      relatedObservations: relatedObservations || [],
      historyObservations: historyObservations || [],
    })
  } catch (error) {
    console.error('Observation detail API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

