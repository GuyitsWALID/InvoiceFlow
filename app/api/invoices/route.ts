import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's company
  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', session.user.id)
    .single()

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Build query
  let query = supabase
    .from('invoices')
    .select(`
      *,
      vendor:vendors(id, name, email),
      line_items(*)
    `)
    .eq('company_id', userData.company_id)

  if (status) {
    query = query.eq('status', status)
  }

  const { data: invoices, error } = await query.order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ invoices })
}

export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  
  // Get user's company
  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', session.user.id)
    .single()

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Create invoice
  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert([{
      company_id: userData.company_id,
      ...body
    }])
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ invoice })
}
