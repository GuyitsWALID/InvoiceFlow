import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('*, vendor:vendors(*), line_items(*)')
    .eq('id', params.id)
    .single()

  if (invoiceError || !invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  // Check if QuickBooks integration exists
  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', session.user.id)
    .single()

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { data: integration } = await supabase
    .from('integrations')
    .select('*')
    .eq('company_id', userData.company_id)
    .eq('type', 'quickbooks')
    .eq('is_active', true)
    .single()

  if (!integration) {
    return NextResponse.json({ 
      error: 'QuickBooks integration not found. Please connect QuickBooks first.' 
    }, { status: 400 })
  }

  try {
    // Here you would call the QuickBooks API to create a bill
    // This is a placeholder for the actual QuickBooks sync logic
    
    // For now, just update the invoice status
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'synced',
        synced_at: new Date().toISOString(),
        reviewed_by: session.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ 
      invoice: updatedInvoice,
      message: 'Invoice approved and synced successfully'
    })
  } catch (error: any) {
    // Update invoice with sync error
    await supabase
      .from('invoices')
      .update({
        sync_error: error.message,
      })
      .eq('id', params.id)

    return NextResponse.json({ 
      error: 'Failed to sync invoice: ' + error.message 
    }, { status: 500 })
  }
}
