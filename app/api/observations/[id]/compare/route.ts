import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import sharp from 'sharp'

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`)
  }
  return Buffer.from(await response.arrayBuffer())
}

async function imageToPNG(buffer: Buffer): Promise<PNG> {
  // Convert image to PNG using sharp
  const pngBuffer = await sharp(buffer)
    .png()
    .toBuffer()
  
  return PNG.sync.read(pngBuffer)
}

async function compareImages(img1Url: string, img2Url: string) {
  // Download both images
  const [img1Buffer, img2Buffer] = await Promise.all([
    downloadImage(img1Url),
    downloadImage(img2Url),
  ])

  // Convert to PNG
  const [img1, img2] = await Promise.all([
    imageToPNG(img1Buffer),
    imageToPNG(img2Buffer),
  ])

  // Ensure both images have the same dimensions
  const width = Math.max(img1.width, img2.width)
  const height = Math.max(img1.height, img2.height)

  // Resize images if needed
  let img1Resized = img1
  let img2Resized = img2

  if (img1.width !== width || img1.height !== height) {
    const resizedBuffer = await sharp(img1Buffer)
      .resize(width, height)
      .png()
      .toBuffer()
    img1Resized = PNG.sync.read(resizedBuffer)
  }

  if (img2.width !== width || img2.height !== height) {
    const resizedBuffer = await sharp(img2Buffer)
      .resize(width, height)
      .png()
      .toBuffer()
    img2Resized = PNG.sync.read(resizedBuffer)
  }

  // Create diff image
  const diff = new PNG({ width, height })
  
  // Compare images
  const numDiffPixels = pixelmatch(
    img1Resized.data,
    img2Resized.data,
    diff.data,
    width,
    height,
    {
      threshold: 0.1, // Sensitivity threshold (0-1)
      includeAA: false, // Don't include anti-aliasing pixels
    }
  )

  // Calculate change score (percentage of different pixels)
  const totalPixels = width * height
  const changePercentage = (numDiffPixels / totalPixels) * 100
  const changeScore = Math.round(changePercentage * 100) / 100 // Round to 2 decimal places

  // Create a visual diff image by overlaying red highlights on the original image
  // First, create a red overlay for changed pixels
  const overlay = new PNG({ width, height })
  for (let i = 0; i < diff.data.length; i += 4) {
    if (diff.data[i] > 0 || diff.data[i + 1] > 0 || diff.data[i + 2] > 0) {
      // This pixel is different - mark it in red
      overlay.data[i] = 255     // R
      overlay.data[i + 1] = 0   // G
      overlay.data[i + 2] = 0   // B
      overlay.data[i + 3] = 200 // A (semi-transparent)
    } else {
      // Transparent for unchanged pixels
      overlay.data[i] = 0
      overlay.data[i + 1] = 0
      overlay.data[i + 2] = 0
      overlay.data[i + 3] = 0
    }
  }

  // Overlay the red highlights on the current image
  const overlayBuffer = PNG.sync.write(overlay)
  const diffImageBuffer = await sharp(img1Buffer)
    .resize(width, height)
    .composite([
      {
        input: overlayBuffer,
        blend: 'over',
      },
    ])
    .png()
    .toBuffer()

  return {
    numDiffPixels,
    totalPixels,
    changePercentage,
    changeScore,
    diffImageBuffer,
    width,
    height,
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
      .select('*')
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

    // Check if both have screenshots
    if (!current.screenshot_url || !previous.screenshot_url) {
      return NextResponse.json(
        { error: 'Both observations must have screenshots to compare' },
        { status: 400 }
      )
    }

    // Perform pixel-level comparison
    const comparisonResult = await compareImages(
      current.screenshot_url,
      previous.screenshot_url
    )

    // Upload diff image to Supabase Storage
    const diffFileName = `diff-${observationId}-${compareWithId}-${Date.now()}.png`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('screenshots')
      .upload(diffFileName, comparisonResult.diffImageBuffer, {
        contentType: 'image/png',
        upsert: false,
      })

    let diffImageUrl = null
    if (!uploadError && uploadData) {
      const { data: { publicUrl } } = supabase.storage
        .from('screenshots')
        .getPublicUrl(diffFileName)
      diffImageUrl = publicUrl
    } else {
      console.error('Error uploading diff image:', uploadError)
    }

    const timeDiff = new Date(current.captured_at || current.created_at).getTime() - 
                     new Date(previous.captured_at || previous.created_at).getTime()
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24))

    // Determine change severity
    let changeSeverity: 'none' | 'low' | 'medium' | 'high' = 'none'
    if (comparisonResult.changeScore > 0) {
      if (comparisonResult.changeScore < 1) {
        changeSeverity = 'low'
      } else if (comparisonResult.changeScore < 5) {
        changeSeverity = 'medium'
      } else {
        changeSeverity = 'high'
      }
    }

    return NextResponse.json({
      current: {
        id: current.id,
        screenshot_url: current.screenshot_url,
        captured_at: current.captured_at,
        created_at: current.created_at,
      },
      previous: {
        id: previous.id,
        screenshot_url: previous.screenshot_url,
        captured_at: previous.captured_at,
        created_at: previous.created_at,
      },
      comparison: {
        hasChanges: comparisonResult.numDiffPixels > 0,
        daysDiff,
        timeDiff: timeDiff,
        changeScore: comparisonResult.changeScore,
        changePercentage: comparisonResult.changePercentage,
        numDiffPixels: comparisonResult.numDiffPixels,
        totalPixels: comparisonResult.totalPixels,
        changeSeverity,
        diffImageUrl,
        imageDimensions: {
          width: comparisonResult.width,
          height: comparisonResult.height,
        },
      },
    })
  } catch (error) {
    console.error('Comparison API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

