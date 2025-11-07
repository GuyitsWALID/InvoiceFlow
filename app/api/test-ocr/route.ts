import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase service role client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const { invoice_id } = await request.json()

    console.log('🧪 Manual OCR trigger for invoice:', invoice_id)

    // Call the process-invoice endpoint
    const processUrl = new URL('/api/process-invoice', request.url)
    const response = await fetch(processUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoice_id })
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('❌ OCR processing failed:', result)
      return NextResponse.json(result, { status: response.status })
    }

    console.log('✅ OCR processing succeeded:', result)
    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Error in manual OCR trigger:', error)
    return NextResponse.json(
      { error: 'Failed to trigger OCR', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
