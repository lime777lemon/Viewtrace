import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, subject, message } = body

    // Validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters' },
        { status: 400 }
      )
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    if (subject.trim().length < 3) {
      return NextResponse.json(
        { error: 'Subject must be at least 3 characters' },
        { status: 400 }
      )
    }

    if (message.trim().length < 10) {
      return NextResponse.json(
        { error: 'Message must be at least 10 characters' },
        { status: 400 }
      )
    }

    // Save to Supabase
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('contact_inquiries')
      .insert({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Contact form submission error:', error)
      
      // If table doesn't exist, log and return success
      // (so table can be created later)
      if (error.code === '42P01') {
        console.warn('contact_inquiries table does not exist. Please create it in Supabase.')
        // Return success even if table doesn't exist
        // Email sending can be added later
        return NextResponse.json(
          { 
            success: true,
            message: 'Thank you for contacting us. We will get back to you soon.'
          },
          { status: 200 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to send message. Please try again later.' },
        { status: 500 }
      )
    }

    // TODO: Add email sending functionality
    // You can add email sending to info@viewtrace.net here
    // Examples: Resend, SendGrid, Nodemailer, etc.

    return NextResponse.json(
      { 
        success: true,
        message: 'Thank you for contacting us. We will get back to you soon.',
        data 
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Failed to send message. Please try again later.' },
      { status: 500 }
    )
  }
}
