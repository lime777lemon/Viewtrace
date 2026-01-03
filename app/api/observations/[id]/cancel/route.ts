import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both sync and async params (Next.js 14 vs 15)
    const resolvedParams = await Promise.resolve(params)
    const observationId = resolvedParams.id
    
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

    // Check if observation can be cancelled
    if (observation.status === 'completed' || observation.status === 'cancelled') {
      return NextResponse.json(
        { error: `Cannot cancel observation with status: ${observation.status}` },
        { status: 400 }
      )
    }

    // Update observation status to cancelled
    const { data: updated, error: updateError } = await supabase
      .from('observations')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', observationId)
      .select()
      .single()

    if (updateError) {
      console.error('Error cancelling observation:', updateError)
      return NextResponse.json(
        { error: 'Failed to cancel observation' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      observation: updated,
    })
  } catch (error) {
    console.error('Cancel observation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

