import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

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
    
    console.log('🤖 AI Analysis started for invoice:', invoice_id)

    // 1. Fetch invoice
    const { data: invoice, error: fetchError } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('id', invoice_id)
      .single()

    if (fetchError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    console.log('✅ Invoice fetched:', {
      id: invoice.id,
      has_raw_ocr: !!invoice.raw_ocr,
      has_attachment: !!invoice.attachment_urls?.[0]
    })

    // 2. Download the invoice image
    const fileUrl = invoice.attachment_urls?.[0]
    if (!fileUrl) {
      return NextResponse.json({ error: 'No attachment found' }, { status: 400 })
    }

    const urlParts = fileUrl.split('/storage/v1/object/public/invoices/')
    const filePath = urlParts[1]

    const { data: fileBlob, error: downloadError } = await supabaseAdmin
      .storage
      .from('invoices')
      .download(filePath)

    if (downloadError || !fileBlob) {
      console.error('Download error:', downloadError)
      return NextResponse.json({ error: 'Failed to download invoice image' }, { status: 500 })
    }

    // 3. Convert to base64
    const arrayBuffer = await fileBlob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Image = buffer.toString('base64')
    
    // Determine media type
    const mediaType = fileUrl.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'

    console.log('🖼️ Image prepared:', {
      size: fileBlob.size,
      type: mediaType
    })

    // 4. Extract OCR if not already done
    let rawOcr = invoice.raw_ocr
    
    if (!rawOcr) {
      console.log('📄 Extracting OCR text from image...')
      
      const ocrResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mediaType,
                  data: base64Image
                }
              },
              {
                text: 'Extract ALL text from this invoice image. Return ONLY the raw text, exactly as it appears, preserving line breaks and formatting. No explanations, no markdown, just the text.'
              }
            ]
          }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 2048
          }
        })
      })

      if (!ocrResponse.ok) {
        const errorText = await ocrResponse.text()
        console.error('OCR extraction failed:', errorText)
        return NextResponse.json({ error: 'OCR extraction failed', details: errorText }, { status: 500 })
      }

      const ocrResult = await ocrResponse.json()
      rawOcr = ocrResult.candidates?.[0]?.content?.parts?.[0]?.text || ''
      
      console.log('✅ OCR extracted:', rawOcr.substring(0, 200))

      // Save OCR to database
      await supabaseAdmin
        .from('invoices')
        .update({ raw_ocr: rawOcr })
        .eq('id', invoice_id)
    }

    if (!rawOcr || rawOcr.trim().length === 0) {
      return NextResponse.json({ error: 'Failed to extract text from invoice image' }, { status: 400 })
    }

    // 5. Call Google Gemini Flash 2.0 for AI analysis with both image AND OCR text
    console.log('🤖 Sending to Google Gemini Flash for AI analysis...')
    
    const prompt = `You are an expert invoice data extraction AI. Analyze this invoice image and extract ALL relevant information.

OCR Text (for reference):
${rawOcr}

Extract the following fields with HIGH ACCURACY:
1. vendor_name (company/person who sent the invoice)
2. vendor_email
3. vendor_address
4. vendor_tax_id
5. invoice_number
6. po_number (if present)
7. invoice_date (format: YYYY-MM-DD)
8. due_date (format: YYYY-MM-DD)
9. subtotal (number only, no currency symbol)
10. tax_total (number only)
11. discount (number only, if present)
12. total (number only)
13. currency (USD, EUR, GBP, etc.)
14. payment_terms (e.g., "Net 30", "Due on receipt")
15. line_items (array of items with: description, quantity, unit_price, total)

IMPORTANT:
- Use BOTH the IMAGE and OCR text to extract accurate data
- Return ONLY valid JSON, no explanation
- Use null for missing fields
- Dates must be YYYY-MM-DD format
- Numbers must be parsed correctly (handle European format with comma as decimal)

Return JSON format:
{
  "vendor": {
    "name": "string",
    "email": "string or null",
    "address": "string or null",
    "tax_id": "string or null"
  },
  "invoice_number": "string",
  "po_number": "string or null",
  "invoice_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD or null",
  "currency": "USD",
  "payment_terms": "string or null",
  "subtotal": 0.00,
  "tax_total": 0.00,
  "discount": 0.00,
  "total": 0.00,
  "line_items": [
    {
      "description": "string",
      "quantity": 0,
      "unit_price": 0.00,
      "total": 0.00
    }
  ],
  "confidence": {
    "overall": 0.95,
    "notes": "Any concerns or low-confidence fields"
  }
}`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: mediaType,
                data: base64Image
              }
            },
            {
              text: prompt
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Google Gemini API error:', errorText)
      return NextResponse.json({ error: 'AI analysis failed', details: errorText }, { status: 500 })
    }

    const aiResponse = await response.json()
    const responseText = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    console.log('🤖 AI response:', responseText.substring(0, 200))

    // 5. Parse AI's response
    let extractedData
    try {
      // Remove markdown code blocks if present
      const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0])
      } else {
        extractedData = JSON.parse(cleanedText)
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e)
      console.error('Raw response:', responseText)
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    console.log('✅ Extracted data:', extractedData)

    // 6. Update invoice with AI-extracted data
    const { error: updateError } = await supabaseAdmin
      .from('invoices')
      .update({
        extracted_data: extractedData,
        invoice_number: extractedData.invoice_number,
        invoice_date: extractedData.invoice_date,
        due_date: extractedData.due_date,
        subtotal: extractedData.subtotal,
        tax_total: extractedData.tax_total,
        discount: extractedData.discount,
        total: extractedData.total,
        currency: extractedData.currency,
        payment_terms: extractedData.payment_terms,
        confidence: extractedData.confidence,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoice_id)

    if (updateError) {
      console.error('Failed to update invoice:', updateError)
      return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 })
    }

    // 7. Create or update vendor
    if (extractedData.vendor?.name) {
      const { data: existingVendor } = await supabaseAdmin
        .from('vendors')
        .select('id')
        .eq('company_id', invoice.company_id)
        .ilike('name', extractedData.vendor.name)
        .single()

      let vendorId = existingVendor?.id

      if (!existingVendor) {
        const { data: newVendor } = await supabaseAdmin
          .from('vendors')
          .insert({
            company_id: invoice.company_id,
            name: extractedData.vendor.name,
            email: extractedData.vendor.email,
            address: extractedData.vendor.address,
            tax_id: extractedData.vendor.tax_id
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

    console.log('✅ AI analysis completed successfully')

    return NextResponse.json({
      success: true,
      extracted_data: extractedData
    })

  } catch (error) {
    console.error('Error analyzing invoice:', error)
    return NextResponse.json(
      { error: 'Failed to analyze invoice', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
