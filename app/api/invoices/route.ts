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

  // Get company with subscription plan
  const { data: companyData } = await supabase
    .from('companies')
    .select(`
      id,
      subscription_plan_id,
      subscription_plan:subscription_plans(
        max_invoices_per_month
      )
    `)
    .eq('id', userData.company_id)
    .single()

  if (!companyData) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  // Check invoice limit for the current month
  const subscriptionPlan = Array.isArray(companyData.subscription_plan) 
    ? companyData.subscription_plan[0] 
    : companyData.subscription_plan
  const maxInvoices = subscriptionPlan?.max_invoices_per_month
  if (maxInvoices && maxInvoices > 0) {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count, error: countError } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', userData.company_id)
      .gte('created_at', startOfMonth.toISOString())

    if (countError) {
      console.error('Error counting invoices:', countError)
    } else if (count !== null && count >= maxInvoices) {
      return NextResponse.json({ 
        error: 'Invoice limit reached',
        message: `You've reached your plan limit of ${maxInvoices} invoice${maxInvoices > 1 ? 's' : ''} per month. Upgrade to Pro for unlimited invoices.`,
        upgrade_required: true
      }, { status: 403 })
    }
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
