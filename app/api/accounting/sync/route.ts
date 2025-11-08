import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { QuickBooksAdapter } from '@/lib/accounting/adapters/quickbooks'
import { ExcelAdapter } from '@/lib/accounting/adapters/excel'
import type { BillPayload, BillResult } from '@/lib/accounting/adapters/base'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const { invoice_id } = await request.json()
    if (!invoice_id) {
      return NextResponse.json({ error: 'Missing invoice_id' }, { status: 400 })
    }

    // Fetch invoice with all necessary data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        vendors (
          id,
          name,
          email,
          phone,
          address_line1,
          address_line2,
          city,
          state,
          postal_code,
          country
        )
      `)
      .eq('id', invoice_id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Check if invoice is approved
    if (invoice.status !== 'approved') {
      return NextResponse.json({ error: 'Invoice must be approved before syncing' }, { status: 400 })
    }

    // Get active accounting connection for this company
    const { data: connection, error: connectionError } = await supabase
      .from('accounting_connections')
      .select('*')
      .eq('company_id', invoice.company_id)
      .eq('is_active', true)
      .eq('is_default', true)
      .single()

    if (connectionError || !connection) {
      return NextResponse.json({ 
        error: 'No active accounting connection found. Please connect an accounting provider in Settings.' 
      }, { status: 400 })
    }

    // Prepare bill payload from invoice data
    const extractedData = invoice.extracted_data || {}
    const lineItems = extractedData.line_items || []

    const billPayload: BillPayload = {
      invoice_number: invoice.invoice_number || extractedData.invoice_number || `INV-${invoice.id.slice(0, 8)}`,
      invoice_date: invoice.invoice_date || extractedData.invoice_date || new Date().toISOString().split('T')[0],
      due_date: invoice.due_date || extractedData.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      vendor_id: invoice.vendor_id,
      vendor_email: invoice.vendors?.email || extractedData.vendor_email,
      line_items: lineItems.map((item: any) => ({
        description: item.description || 'No description',
        amount: parseFloat(item.amount || item.total || '0'),
        quantity: parseFloat(item.quantity || '1'),
        account_ref: item.account_ref || 'Uncategorized'
      })),
      subtotal: parseFloat(extractedData.subtotal || invoice.amount || '0'),
      tax_total: parseFloat(extractedData.tax_total || extractedData.tax || '0'),
      total: parseFloat(invoice.amount || extractedData.total || '0'),
      currency: extractedData.currency || 'USD',
      notes: invoice.notes || extractedData.notes || `Synced from InvoiceFlow - Invoice #${invoice.invoice_number || invoice.id.slice(0, 8)}`
    }

    let result: BillResult
    let adapter

    // Initialize appropriate adapter based on provider
    if (connection.provider === 'quickbooks') {
      // For QuickBooks, we need to use a static method to create bills
      // since the constructor expects connection/company IDs, not tokens
      try {
        result = await QuickBooksAdapter.createBillWithTokens(
          connection.access_token!,
          connection.refresh_token!,
          connection.realm_id!,
          billPayload,
          invoice.vendors?.name || 'Unknown Vendor'
        )
      } catch (error: any) {
        result = {
          success: false,
          created_at: new Date(),
          error: error.message || 'Failed to create bill in QuickBooks'
        }
      }
    } else if (connection.provider === 'excel') {
      // For Excel, create bill directly
      const excelAdapter = new ExcelAdapter(connection.id, invoice.company_id)
      result = await excelAdapter.createBill(billPayload)
    } else {
      return NextResponse.json({ 
        error: `Provider ${connection.provider} not yet implemented` 
      }, { status: 501 })
    }

    // Save sync log
    const { error: logError } = await supabase
      .from('invoice_sync_logs')
      .insert({
        invoice_id: invoice.id,
        company_id: invoice.company_id,
        provider: connection.provider,
        status: result.success ? 'success' : 'failed',
        external_bill_id: result.bill_id,
        external_bill_url: result.bill_url,
        error_message: result.error,
        synced_at: new Date().toISOString()
      })

    if (logError) {
      console.error('Failed to save sync log:', logError)
    }

    // Update invoice with sync information
    if (result.success) {
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          sync_status: 'synced',
          external_bill_id: result.bill_id,
          external_bill_url: result.bill_url,
          last_synced_at: new Date().toISOString()
        })
        .eq('id', invoice.id)

      if (updateError) {
        console.error('Failed to update invoice:', updateError)
      }
    }

    // Return result
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Invoice synced to ${connection.provider_company_name}`,
        bill_id: result.bill_id,
        bill_url: result.bill_url,
        provider: connection.provider
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to sync invoice'
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('Sync API error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}
