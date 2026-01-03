import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { diffWords, diffChars, Change } from 'diff'

interface TextComparisonResult {
  hasChanges: boolean
  changeScore: number
  changeSeverity: 'none' | 'low' | 'medium' | 'high'
  addedText: string
  removedText: string
  changes: Array<{
    value: string
    added?: boolean
    removed?: boolean
  }>
  statistics: {
    totalWords: number
    addedWords: number
    removedWords: number
    changedWords: number
  }
}

function compareTexts(text1: string, text2: string): TextComparisonResult {
  // Normalize whitespace
  const normalized1 = text1.replace(/\s+/g, ' ').trim()
  const normalized2 = text2.replace(/\s+/g, ' ').trim()

  // If texts are identical, return early
  if (normalized1 === normalized2) {
    return {
      hasChanges: false,
      changeScore: 0,
      changeSeverity: 'none',
      addedText: '',
      removedText: '',
      changes: [],
      statistics: {
        totalWords: normalized1.split(' ').length,
        addedWords: 0,
        removedWords: 0,
        changedWords: 0,
      },
    }
  }

  // Perform word-level diff
  // Note: ignoreWhitespace option is not available in diffWords, but we've already normalized whitespace above
  const wordDiff = diffWords(normalized1, normalized2)

  // Calculate statistics
  const words1 = normalized1.split(/\s+/).filter(w => w.length > 0)
  const words2 = normalized2.split(/\s+/).filter(w => w.length > 0)
  const totalWords = Math.max(words1.length, words2.length)
  
  let addedWords = 0
  let removedWords = 0
  let changedWords = 0

  const changes: Array<{ value: string; added?: boolean; removed?: boolean }> = []
  let addedText = ''
  let removedText = ''

  wordDiff.forEach((part: Change) => {
    if (part.added) {
      addedWords += part.value.split(/\s+/).filter(w => w.length > 0).length
      addedText += part.value + ' '
      changes.push({ value: part.value, added: true })
    } else if (part.removed) {
      removedWords += part.value.split(/\s+/).filter(w => w.length > 0).length
      removedText += part.value + ' '
      changes.push({ value: part.value, removed: true })
    } else {
      changes.push({ value: part.value })
    }
  })

  // Count changed words (pairs of removed + added)
  changedWords = Math.min(addedWords, removedWords)

  // Calculate change score (percentage of changed content)
  const changeScore = totalWords > 0 
    ? ((addedWords + removedWords) / totalWords) * 100 
    : 0

  // Determine severity
  let changeSeverity: 'none' | 'low' | 'medium' | 'high' = 'none'
  if (changeScore > 0) {
    if (changeScore < 5) {
      changeSeverity = 'low'
    } else if (changeScore < 20) {
      changeSeverity = 'medium'
    } else {
      changeSeverity = 'high'
    }
  }

  return {
    hasChanges: addedWords > 0 || removedWords > 0,
    changeScore: Math.round(changeScore * 100) / 100,
    changeSeverity,
    addedText: addedText.trim(),
    removedText: removedText.trim(),
    changes,
    statistics: {
      totalWords,
      addedWords,
      removedWords,
      changedWords,
    },
  }
}

export async function GET(
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
    const searchParams = request.nextUrl.searchParams
    const compareWithId = searchParams.get('compareWith')

    if (!compareWithId) {
      return NextResponse.json(
        { error: 'compareWith parameter is required' },
        { status: 400 }
      )
    }

    // Get both observations
    const { data: observations, error: obsError } = await supabase
      .from('observations')
      .select('id, text_content, captured_at, created_at')
      .eq('user_id', user.id)
      .in('id', [observationId, compareWithId])

    if (obsError || !observations || observations.length !== 2) {
      return NextResponse.json(
        { error: 'Observations not found' },
        { status: 404 }
      )
    }

    const current = observations.find(o => o.id === observationId)
    const previous = observations.find(o => o.id === compareWithId)

    if (!current || !previous) {
      return NextResponse.json(
        { error: 'Observations not found' },
        { status: 404 }
      )
    }

    // Check if both have text content
    if (!current.text_content || !previous.text_content) {
      return NextResponse.json(
        { error: 'Both observations must have text content to compare' },
        { status: 400 }
      )
    }

    // Perform text comparison
    const comparisonResult = compareTexts(
      previous.text_content,
      current.text_content
    )

    const timeDiff = new Date(current.captured_at || current.created_at).getTime() - 
                     new Date(previous.captured_at || previous.created_at).getTime()
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24))

    return NextResponse.json({
      current: {
        id: current.id,
        text_content: current.text_content,
        captured_at: current.captured_at,
        created_at: current.created_at,
      },
      previous: {
        id: previous.id,
        text_content: previous.text_content,
        captured_at: previous.captured_at,
        created_at: previous.created_at,
      },
      comparison: {
        ...comparisonResult,
        daysDiff,
        timeDiff: timeDiff,
      },
    })
  } catch (error) {
    console.error('Text comparison API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

