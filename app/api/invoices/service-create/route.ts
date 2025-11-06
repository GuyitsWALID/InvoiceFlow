import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// Dev-only endpoint: create invoice using service role (bypasses RLS)
// WARNING: Do NOT expose in production without auth checks.
export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { company_id, attachment_urls = [], mime_types = [], total = 0 } = body

    if (!company_id) {
      return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        company_id,
        attachment_urls,
        mime_types,
        total,
        status: 'inbox',
        confidence: { overall: 0, fields: {} },
      })
      .select('id')
      .single()

    if (error) {
      console.error('Service-create invoice error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ invoice })
  } catch (err: any) {
    console.error('Service-create error:', err)
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
}
