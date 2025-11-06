import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Tesseract from 'tesseract.js'

// Initialize Supabase service role client (bypasses RLS)
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

// Helper function to parse invoice data from OCR text
function parseInvoiceData(text: string) {
  const lines = text.split('\n').filter(line => line.trim())
  
  // Initialize result object with confidence scores
  const result: any = {
    vendor: { name: null, email: null, address: null, tax_id: null },
    invoice_number: null,
    po_number: null,
    invoice_date: null,
    due_date: null,
    currency: 'USD',
    line_items: [],
    subtotal: null,
    tax_total: null,
    discount: null,
    total: null,
    confidence: {
      overall: 0,
      fields: {}
    }
  }

  // Patterns for common invoice fields
  const patterns = {
    invoice_number: /(?:invoice|inv|#)\s*(?:number|no|#)?\s*:?\s*([A-Z0-9-]+)/i,
    po_number: /(?:po|purchase\s*order)\s*(?:number|no|#)?\s*:?\s*([A-Z0-9-]+)/i,
    date: /(?:invoice\s*)?date\s*:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
    due_date: /due\s*date\s*:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
    total: /(?:total|amount\s*due)\s*:?\s*\$?\s*([\d,]+\.?\d{0,2})/i,
    subtotal: /(?:subtotal|sub-total)\s*:?\s*\$?\s*([\d,]+\.?\d{0,2})/i,
    tax: /(?:tax|vat|gst)\s*:?\s*\$?\s*([\d,]+\.?\d{0,2})/i,
    email: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
    phone: /(?:tel|phone|ph)\s*:?\s*([\d\s\-\(\)]+)/i
  }

  // Extract vendor name (usually in first few lines)
  if (lines.length > 0) {
    result.vendor.name = lines[0].trim()
    result.confidence.fields.vendor_name = 0.6
  }

  // Search through text for patterns
  for (const line of lines) {
    // Invoice number
    const invMatch = line.match(patterns.invoice_number)
    if (invMatch && !result.invoice_number) {
      result.invoice_number = invMatch[1]
      result.confidence.fields.invoice_number = 0.85
    }

    // PO number
    const poMatch = line.match(patterns.po_number)
    if (poMatch && !result.po_number) {
      result.po_number = poMatch[1]
      result.confidence.fields.po_number = 0.8
    }

    // Invoice date
    const dateMatch = line.match(patterns.date)
    if (dateMatch && !result.invoice_date) {
      result.invoice_date = dateMatch[1]
      result.confidence.fields.invoice_date = 0.75
    }

    // Due date
    const dueMatch = line.match(patterns.due_date)
    if (dueMatch && !result.due_date) {
      result.due_date = dueMatch[1]
      result.confidence.fields.due_date = 0.75
    }

    // Email
    const emailMatch = line.match(patterns.email)
    if (emailMatch && !result.vendor.email) {
      result.vendor.email = emailMatch[1]
      result.confidence.fields.vendor_email = 0.9
    }

    // Total
    const totalMatch = line.match(patterns.total)
    if (totalMatch && !result.total) {
      result.total = parseFloat(totalMatch[1].replace(/,/g, ''))
      result.confidence.fields.total = 0.8
    }

    // Subtotal
    const subtotalMatch = line.match(patterns.subtotal)
    if (subtotalMatch && !result.subtotal) {
      result.subtotal = parseFloat(subtotalMatch[1].replace(/,/g, ''))
      result.confidence.fields.subtotal = 0.75
    }

    // Tax
    const taxMatch = line.match(patterns.tax)
    if (taxMatch && !result.tax_total) {
      result.tax_total = parseFloat(taxMatch[1].replace(/,/g, ''))
      result.confidence.fields.tax_total = 0.75
    }
  }

  // Calculate overall confidence (average of found fields)
  const confidenceValues = Object.values(result.confidence.fields) as number[]
  result.confidence.overall = confidenceValues.length > 0
    ? confidenceValues.reduce((a: number, b: number) => a + b, 0) / confidenceValues.length
    : 0

  return result
}

export async function POST(request: NextRequest) {
  try {
    const { invoice_id } = await request.json()

    if (!invoice_id) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 })
    }

    // 1. Fetch invoice from database
    const { data: invoice, error: fetchError } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('id', invoice_id)
      .single()

    if (fetchError || !invoice) {
      console.error('Failed to fetch invoice:', fetchError)
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Update status to processing
    await supabaseAdmin
      .from('invoices')
      .update({ status: 'needs_review' })
      .eq('id', invoice_id)

    // 2. Download file from Supabase Storage
    const fileUrl = invoice.attachment_urls?.[0]
    if (!fileUrl) {
      return NextResponse.json({ error: 'No file attached to invoice' }, { status: 400 })
    }

    // Extract the storage path from the URL
    const urlParts = fileUrl.split('/storage/v1/object/public/invoices/')
    const filePath = urlParts[1]

    const { data: fileBlob, error: downloadError } = await supabaseAdmin
      .storage
      .from('invoices')
      .download(filePath)

    if (downloadError || !fileBlob) {
      console.error('Failed to download file:', downloadError)
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
    }

    // 3. Convert blob to buffer for Tesseract
    const arrayBuffer = await fileBlob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 4. Run Tesseract OCR
    console.log(`Processing invoice ${invoice_id} with Tesseract...`)
    const { data: { text, confidence } } = await Tesseract.recognize(buffer, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`)
        }
      }
    })

    console.log(`OCR completed with ${confidence}% confidence`)

    // 5. Parse invoice data from OCR text
    const parsedData = parseInvoiceData(text)

    // 6. Update invoice with extracted data
    const { error: updateError } = await supabaseAdmin
      .from('invoices')
      .update({
        raw_ocr: text,
        extracted_data: parsedData,
        confidence: parsedData.confidence,
        invoice_number: parsedData.invoice_number || invoice.invoice_number,
        invoice_date: parsedData.invoice_date || invoice.invoice_date,
        due_date: parsedData.due_date || invoice.due_date,
        total: parsedData.total || invoice.total,
        subtotal: parsedData.subtotal || invoice.subtotal,
        tax_total: parsedData.tax_total || invoice.tax_total,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoice_id)

    if (updateError) {
      console.error('Failed to update invoice:', updateError)
      return NextResponse.json({ error: 'Failed to save OCR results' }, { status: 500 })
    }

    // 7. Create or update vendor if we extracted vendor info
    if (parsedData.vendor.name) {
      const { data: existingVendor } = await supabaseAdmin
        .from('vendors')
        .select('id')
        .eq('company_id', invoice.company_id)
        .eq('name', parsedData.vendor.name)
        .single()

      let vendorId = existingVendor?.id

      if (!existingVendor) {
        const { data: newVendor } = await supabaseAdmin
          .from('vendors')
          .insert({
            company_id: invoice.company_id,
            name: parsedData.vendor.name,
            email: parsedData.vendor.email
          })
          .select('id')
          .single()

        vendorId = newVendor?.id
      }

      if (vendorId) {
        await supabaseAdmin
          .from('invoices')
          .update({ vendor_id: vendorId })
          .eq('id', invoice_id)
      }
    }

    return NextResponse.json({
      success: true,
      invoice_id,
      ocr_confidence: confidence,
      extracted_data: parsedData,
      fields_extracted: Object.keys(parsedData.confidence.fields).length
    })

  } catch (error) {
    console.error('Error processing invoice:', error)
    return NextResponse.json(
      { error: 'Failed to process invoice', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
