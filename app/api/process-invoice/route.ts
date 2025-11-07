import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

// Helper function to normalize date format to YYYY-MM-DD
function normalizeDate(dateStr: string): string | null {
  if (!dateStr) return null
  
  try {
    // Handle MM/DD/YYYY or DD/MM/YYYY format
    const parts = dateStr.split(/[-/]/)
    if (parts.length === 3) {
      let [first, second, third] = parts
      
      // Convert 2-digit year to 4-digit
      if (third.length === 2) {
        third = parseInt(third) > 50 ? `19${third}` : `20${third}`
      }
      
      // Assume MM/DD/YYYY format (common in US invoices)
      const month = first.padStart(2, '0')
      const day = second.padStart(2, '0')
      const year = third
      
      // Validate and return ISO format
      const date = new Date(`${year}-${month}-${day}`)
      if (!isNaN(date.getTime())) {
        return `${year}-${month}-${day}`
      }
    }
    return null
  } catch (e) {
    return null
  }
}

// Helper function to clean and parse monetary amounts
function parseAmount(amountStr: string): number | null {
  if (!amountStr) return null
  
  try {
    // Remove currency symbols, spaces
    let cleaned = amountStr.replace(/[$€£¥\s]/g, '')
    
    // Handle European format (1.234,56) vs US format (1,234.56)
    // If there's both comma and period, determine which is decimal separator
    const hasComma = cleaned.includes(',')
    const hasPeriod = cleaned.includes('.')
    
    if (hasComma && hasPeriod) {
      // Both present - last one is decimal separator
      const lastComma = cleaned.lastIndexOf(',')
      const lastPeriod = cleaned.lastIndexOf('.')
      
      if (lastComma > lastPeriod) {
        // European format: 1.234,56
        cleaned = cleaned.replace(/\./g, '').replace(',', '.')
      } else {
        // US format: 1,234.56
        cleaned = cleaned.replace(/,/g, '')
      }
    } else if (hasComma) {
      // Only comma - could be thousands separator or decimal
      // If there are 2 digits after last comma, it's decimal separator
      const parts = cleaned.split(',')
      if (parts.length === 2 && parts[1].length === 2) {
        // European decimal: 1234,56
        cleaned = cleaned.replace(',', '.')
      } else {
        // Thousands separator: 1,234
        cleaned = cleaned.replace(/,/g, '')
      }
    }
    
    const value = parseFloat(cleaned)
    return isNaN(value) ? null : value
  } catch (e) {
    return null
  }
}

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
    invoice_number: /(?:invoice|inv)\s*(?:number|no|#)?\s*:?\s*([A-Z0-9-]+)/i,
    po_number: /(?:po|purchase\s*order)\s*(?:number|no|#)?\s*:?\s*([A-Z0-9-]+)/i,
    // Match date that might be on next line after "Date" or "Date of issue"
    date: /(?:invoice\s*)?(?:date|dated?|date\s+of\s+issue)\s*:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
    // Also try to match standalone date format
    standalone_date: /\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/,
    due_date: /(?:due\s*date|payment\s*due)\s*:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
    // Match total with optional spaces/commas in number
    total: /(?:total|grand\s*total|amount\s*due|total\s*amount|gross\s*worth)\s*:?\s*\$?\s*([\d\s,]+\.?\d{0,2})/i,
    subtotal: /(?:subtotal|sub-total|sub\s*total|net\s*worth)\s*:?\s*\$?\s*([\d\s,]+\.?\d{0,2})/i,
    tax: /(?:tax|vat|gst|sales\s*tax)\s*:?\s*\$?\s*([\d\s,]+\.?\d{0,2})/i,
    email: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
    phone: /(?:tel|phone|ph)\s*:?\s*([\d\s\-\(\)]+)/i,
    vendor_name: /(?:from|seller|vendor|bill\s*from)\s*:?\s*(.+?)(?:\n|$)/i
  }

  // Extract vendor name (usually in first few lines)
  const vendorMatch = text.match(patterns.vendor_name)
  if (vendorMatch) {
    result.vendor.name = vendorMatch[1].trim()
    result.confidence.fields.vendor_name = 0.7
  } else if (lines.length > 0) {
    // Fallback to first line
    result.vendor.name = lines[0].trim()
    result.confidence.fields.vendor_name = 0.5
  }

  // Search through entire text first (for multi-line matches)
  const invMatch = text.match(patterns.invoice_number)
  if (invMatch) {
    result.invoice_number = invMatch[1].trim()
    result.confidence.fields.invoice_number = 0.85
  }

  const dateMatch = text.match(patterns.date)
  if (dateMatch) {
    result.invoice_date = normalizeDate(dateMatch[1])
    result.confidence.fields.invoice_date = 0.75
  } else {
    // Try standalone date format (first occurrence after "Date" or in first few lines)
    const standaloneDateMatch = text.match(patterns.standalone_date)
    if (standaloneDateMatch) {
      result.invoice_date = normalizeDate(standaloneDateMatch[1])
      result.confidence.fields.invoice_date = 0.65
    }
  }

  const dueMatch = text.match(patterns.due_date)
  if (dueMatch) {
    result.due_date = normalizeDate(dueMatch[1])
    result.confidence.fields.due_date = 0.75
  }

  const totalMatch = text.match(patterns.total)
  if (totalMatch) {
    const totalValue = parseAmount(totalMatch[1])
    if (totalValue !== null && totalValue > 0) {
      result.total = totalValue
      result.confidence.fields.total = 0.8
    }
  }

  const subtotalMatch = text.match(patterns.subtotal)
  if (subtotalMatch) {
    const subtotalValue = parseAmount(subtotalMatch[1])
    if (subtotalValue !== null && subtotalValue > 0) {
      result.subtotal = subtotalValue
      result.confidence.fields.subtotal = 0.75
    }
  }

  const taxMatch = text.match(patterns.tax)
  if (taxMatch) {
    const taxValue = parseAmount(taxMatch[1])
    if (taxValue !== null && taxValue > 0) {
      result.tax_total = taxValue
      result.confidence.fields.tax_total = 0.75
    }
  }

  const emailMatch = text.match(patterns.email)
  if (emailMatch) {
    result.vendor.email = emailMatch[1]
    result.confidence.fields.vendor_email = 0.9
  }

  const poMatch = text.match(patterns.po_number)
  if (poMatch) {
    result.po_number = poMatch[1].trim()
    result.confidence.fields.po_number = 0.8
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
    
    console.log('🔄 OCR Processing started for invoice:', invoice_id)

    if (!invoice_id) {
      console.error('❌ No invoice_id provided')
      return NextResponse.json({ error: 'invoice_id is required' }, { status: 400 })
    }

    // 1. Fetch invoice from database
    console.log('📥 Fetching invoice from database...')
    const { data: invoice, error: fetchError } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('id', invoice_id)
      .single()

    if (fetchError || !invoice) {
      console.error('❌ Failed to fetch invoice:', fetchError)
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    console.log('✅ Invoice fetched:', {
      id: invoice.id,
      company_id: invoice.company_id,
      attachment_urls: invoice.attachment_urls
    })

    // Update status to processing
    console.log('📝 Updating invoice status to needs_review...')
    await supabaseAdmin
      .from('invoices')
      .update({ status: 'needs_review' })
      .eq('id', invoice_id)

    // 2. Download file from Supabase Storage
    const fileUrl = invoice.attachment_urls?.[0]
    if (!fileUrl) {
      console.error('❌ No file attached to invoice')
      return NextResponse.json({ error: 'No file attached to invoice' }, { status: 400 })
    }

    console.log('📥 Downloading file from storage:', fileUrl)

    // Extract the storage path from the URL
    const urlParts = fileUrl.split('/storage/v1/object/public/invoices/')
    const filePath = urlParts[1]

    console.log('📁 File path:', filePath)

    const { data: fileBlob, error: downloadError } = await supabaseAdmin
      .storage
      .from('invoices')
      .download(filePath)

    if (downloadError || !fileBlob) {
      console.error('❌ Failed to download file:', downloadError)
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
    }

    console.log('✅ File downloaded successfully, size:', fileBlob.size, 'bytes')

    // 3. Convert blob to buffer and then to base64 for OCR.space API
    const arrayBuffer = await fileBlob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64File = buffer.toString('base64')

    // 4. Run OCR using OCR.space API (free tier: 25k requests/month)
    console.log(`🔍 Processing invoice ${invoice_id} with OCR.space...`)
    
    const formData = new FormData()
    formData.append('base64Image', `data:image/jpeg;base64,${base64File}`)
    formData.append('language', 'eng')
    formData.append('isOverlayRequired', 'false')
    formData.append('detectOrientation', 'true')
    formData.append('scale', 'true')
    formData.append('OCREngine', '2') // Use OCR Engine 2 for better accuracy
    
    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': process.env.OCR_SPACE_API_KEY || 'K87899142388957' // Free public key
      },
      body: formData
    })

    const ocrResult = await ocrResponse.json()

    if (ocrResult.IsErroredOnProcessing) {
      console.error('❌ OCR failed:', ocrResult.ErrorMessage)
      return NextResponse.json({ 
        error: 'OCR processing failed', 
        details: ocrResult.ErrorMessage 
      }, { status: 500 })
    }

    const text = ocrResult.ParsedResults?.[0]?.ParsedText || ''
    const confidence = ocrResult.ParsedResults?.[0]?.TextOverlay?.MeanConfidence || 0

    console.log(`✅ OCR completed with ${Math.round(confidence)}% confidence`)
    console.log(`📄 Extracted text length: ${text.length} characters`)
    console.log('📋 Raw OCR Text (first 500 chars):', text.substring(0, 500))

    // 5. Save only raw OCR text (no parsing yet - AI will do that when user clicks Analyze)
    console.log('💾 Saving raw OCR text to database...')
    
    const updatePayload = {
      raw_ocr: text,
      status: 'needs_review',
      updated_at: new Date().toISOString()
    }

    console.log('💾 Saving to database:', { 
      invoice_id,
      text_length: text.length,
      status: 'needs_review'
    })

    const { error: updateError } = await supabaseAdmin
      .from('invoices')
      .update(updatePayload)
      .eq('id', invoice_id)

    if (updateError) {
      console.error('Failed to update invoice:', updateError)
      return NextResponse.json({ error: 'Failed to save OCR results' }, { status: 500 })
    }

    console.log('✅ OCR processing completed successfully')

    return NextResponse.json({
      success: true,
      invoice_id,
      ocr_confidence: confidence,
      text_length: text.length,
      status: 'needs_review'
    })

  } catch (error) {
    console.error('Error processing invoice:', error)
    return NextResponse.json(
      { error: 'Failed to process invoice', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
