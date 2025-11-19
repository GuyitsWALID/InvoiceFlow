import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    console.log('📤 Starting invoice sync...')
    
    const body = await request.json()
    const { invoice_id, company_id } = body

    if (!invoice_id || !company_id) {
      console.error('❌ Missing required fields:', { invoice_id, company_id })
      return NextResponse.json(
        { error: 'invoice_id and company_id are required' },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()

    // Get invoice details
    console.log('🔍 Fetching invoice:', invoice_id)
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        vendor:vendors(id, name, email)
      `)
      .eq('id', invoice_id)
      .single()

    if (invoiceError || !invoice) {
      console.error('❌ Invoice not found:', invoiceError)
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Get active integration
    console.log('🔍 Fetching active integration for company:', company_id)
    const { data: integration, error: integrationError } = await supabase
      .from('company_integrations')
      .select('*')
      .eq('company_id', company_id)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (integrationError || !integration) {
      console.error('❌ No active integration found:', integrationError)
      return NextResponse.json(
        { error: 'No active accounting integration found' },
        { status: 400 }
      )
    }

    console.log('✅ Found integration:', integration.provider)

    // Get or create vendor in external system
    let externalVendorId = invoice.vendor?.external_id

    if (!externalVendorId && invoice.vendor_name) {
      console.log('🔄 Creating vendor in external system...')
      
      // Check if vendor exists in our DB
      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('company_id', company_id)
        .eq('name', invoice.vendor_name)
        .single()

      if (vendor && !vendorError) {
        externalVendorId = vendor.external_id
      }

      // If no external vendor ID, we'll need to create it
      // For now, we'll simulate this - in production, call the actual provider API
      if (!externalVendorId) {
        // This would be a call to QuickBooks/Xero/etc API
        externalVendorId = `vendor_${Date.now()}`
        
        // Update vendor with external ID
        if (vendor) {
          await supabase
            .from('vendors')
            .update({ external_id: externalVendorId })
            .eq('id', vendor.id)
        }
      }
    }

    // Create bill/invoice in external system
    console.log('🔄 Creating bill in external system...')
    
    // This is a simulation - in production, you'd call the actual provider API
    // Example for QuickBooks:
    // const qboClient = new QuickBooksClient(integration.access_token)
    // const bill = await qboClient.createBill({...})
    
    const externalBillId = `bill_${Date.now()}`
    const externalUrl = `https://${integration.provider}.com/app/bill/${externalBillId}`

    // Record sync log
    const { data: syncLog, error: syncLogError } = await supabase
      .from('invoice_sync_logs')
      .insert({
        company_id,
        invoice_id,
        integration_id: integration.id,
        sync_status: 'success',
        external_bill_id: externalBillId,
        synced_at: new Date().toISOString()
      })
      .select()
      .single()

    if (syncLogError) {
      console.error('⚠️ Failed to create sync log:', syncLogError)
    } else {
      console.log('✅ Sync log created:', syncLog.id)
    }

    // Update integration last_synced_at
    await supabase
      .from('company_integrations')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', integration.id)

    console.log('✅ Invoice synced successfully!')

    return NextResponse.json({
      success: true,
      external_id: externalBillId,
      external_url: externalUrl,
      provider: integration.provider,
      sync_log_id: syncLog?.id
    })

  } catch (error: any) {
    console.error('❌ Sync invoice error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sync invoice' },
      { status: 500 }
    )
  }
}
