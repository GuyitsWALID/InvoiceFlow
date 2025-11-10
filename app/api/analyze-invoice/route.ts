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

    // 1. Fetch invoice with existing OCR text
    const { data: invoice, error: fetchError } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('id', invoice_id)
      .single()

    if (fetchError || !invoice) {
      console.error('❌ Invoice fetch error:', fetchError)
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    console.log('✅ Invoice fetched:', {
      id: invoice.id,
      has_raw_ocr: !!invoice.raw_ocr,
      ocr_length: invoice.raw_ocr?.length || 0
    })

    // 2. Check if OCR text exists (should already be extracted by OCR.space)
    const rawOcr = invoice.raw_ocr
    
    if (!rawOcr || rawOcr.trim().length === 0) {
      console.error('❌ No OCR text available')
      return NextResponse.json({ 
        error: 'No OCR text available', 
        details: 'Please wait for OCR extraction to complete or reprocess the invoice.' 
      }, { status: 400 })
    }

    console.log('✅ Using existing OCR text:', {
      length: rawOcr.length,
      preview: rawOcr.substring(0, 200)
    })

    // 3. Prepare comprehensive prompt for detailed AI analysis
    const prompt = `You are an expert invoice data extraction AI. Analyze this invoice OCR text and extract ALL information in EXTREME DETAIL.

OCR Text:
${rawOcr}

Extract the following information with MAXIMUM ACCURACY and COMPLETENESS:

1. GENERAL INVOICE INFORMATION:
   - invoice_number (exact invoice number)
   - date_of_issue (format: YYYY-MM-DD)
   - due_date (format: YYYY-MM-DD, if present)
   - currency (3-letter code ONLY: USD, EUR, GBP, CAD, AUD, etc.)
   - currency_symbol (symbol: $, €, £, etc.)
   - payment_terms (e.g., "Net 30", "Due on receipt")
   - po_number (purchase order number, if present)

2. SELLER/VENDOR DETAILS:
   - company_name (full legal name)
   - address (complete address)
   - city, state, zip_code (separately)
   - country
   - tax_id (VAT/EIN/Tax ID number)
   - iban (if present)
   - email
   - phone
   - website (if present)

3. CLIENT/BUYER DETAILS:
   - company_name (full legal name)
   - address (complete address)
   - city, state, zip_code (separately)
   - country
   - tax_id (if present)
   - contact_person (if present)

4. ITEMIZED PRODUCTS & SERVICES (extract ALL line items with MAXIMUM DETAIL):
   For each item, extract:
   - item_number (line number: 1, 2, 3, etc.)
   - description (COMPLETE product/service description - include ALL details)
   - quantity (numeric value with decimals if needed)
   - unit (e.g., "each", "hours", "kg", "pcs", "box", etc.)
   - unit_price (price per single unit, numeric with decimals)
   - net_worth (quantity × unit_price, BEFORE tax)
   - vat_rate (VAT/tax percentage as number, e.g., 10 for 10%)
   - vat_amount (calculated tax amount in currency)
   - gross_worth (total INCLUDING tax: net_worth + vat_amount)
   - discount_per_item (if any discount on this item)
   - notes (any special notes for this item)

5. FINANCIAL SUMMARY:
   - subtotal (sum of all net_worth values)
   - total_vat (sum of all tax amounts)
   - discount (if any discount applied)
   - shipping (if shipping costs listed)
   - total (final amount due)

6. ADDITIONAL DETAILS:
   - notes (any special notes or terms)
   - bank_details (bank name, account info if present)
   - payment_method (if specified)

CRITICAL REQUIREMENTS:
- Extract EVERY line item from the invoice
- Calculate totals accurately
- Parse dates to YYYY-MM-DD format
- All monetary values should be numeric (no currency symbols)
- If a field is not found, use null
- Preserve exact spelling and formatting from the invoice

Return ONLY valid JSON in this EXACT structure:
{
  "general_info": {
    "invoice_number": "string",
    "date_of_issue": "YYYY-MM-DD",
    "due_date": "YYYY-MM-DD or null",
    "currency": "USD",
    "currency_symbol": "$",
    "payment_terms": "string or null",
    "po_number": "string or null"
  },
  "seller": {
    "company_name": "string",
    "address": "string",
    "city": "string",
    "state": "string",
    "zip_code": "string",
    "country": "string",
    "tax_id": "string or null",
    "iban": "string or null",
    "email": "string or null",
    "phone": "string or null",
    "website": "string or null"
  },
  "client": {
    "company_name": "string",
    "address": "string",
    "city": "string",
    "state": "string",
    "zip_code": "string",
    "country": "string",
    "tax_id": "string or null",
    "contact_person": "string or null"
  },
  "line_items": [
    {
      "item_number": 1,
      "description": "Complete product description with all details",
      "quantity": 0.00,
      "unit": "each",
      "unit_price": 0.00,
      "net_worth": 0.00,
      "vat_rate": 10,
      "vat_amount": 0.00,
      "gross_worth": 0.00,
      "discount_per_item": 0.00,
      "notes": "string or null"
    }
  ],
  "financial_summary": {
    "subtotal": 0.00,
    "total_vat": 0.00,
    "discount": 0.00,
    "shipping": 0.00,
    "total": 0.00
  },
  "additional_details": {
    "notes": "string or null",
    "bank_details": "string or null",
    "payment_method": "string or null"
  },
  "confidence": {
    "overall": 0.95,
    "notes": "Any concerns or fields with low confidence"
  }
}`

    // 4. Call Hugging Face AI for analysis using OCR text only
    let extractedData: any
    
    try {
      console.log('🤖 Sending OCR text to Hugging Face AI for analysis...')
      
      // Check if API key is set
      if (!process.env.HUGGINGFACE_API_KEY) {
        console.error('❌ HUGGINGFACE_API_KEY is not set in environment variables')
        return NextResponse.json({ 
          error: 'Configuration error', 
          details: 'HUGGINGFACE_API_KEY is not configured. Please add it to your .env.local file.' 
        }, { status: 500 })
      }
      
      // Use Hugging Face Inference Providers - Meta Llama 3.1 for quality extraction
      // Llama 3.1 supports chat completions and is excellent at structured tasks
      console.log('📤 Making request to Hugging Face Inference Providers (Llama 3.1)...')
      console.log('   Endpoint: https://router.huggingface.co/v1/chat/completions')
      console.log('   Model: meta-llama/Llama-3.1-8B-Instruct')
      console.log('   API Key present:', !!process.env.HUGGINGFACE_API_KEY)
      console.log('   Prompt length:', prompt.length)
      
      const response = await fetch(
        'https://router.huggingface.co/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'meta-llama/Llama-3.1-8B-Instruct',
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: 4096,
            temperature: 0.1,
            stream: false
          })
        }
      )
      
      console.log('📥 Response received from Hugging Face')
      console.log('   Status:', response.status)
      console.log('   Status Text:', response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Hugging Face AI error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
        
        // Handle model loading (Hugging Face cold start)
        if (response.status === 503) {
          try {
            const errorJson = JSON.parse(errorText)
            const estimatedTime = errorJson.estimated_time || 20
            return NextResponse.json({ 
              error: 'Model is loading', 
              details: `Hugging Face model is starting up. Please wait ${estimatedTime} seconds and try again.`,
              retry_after: Math.ceil(estimatedTime)
            }, { status: 503 })
          } catch {
            return NextResponse.json({ 
              error: 'Model is loading', 
              details: 'Hugging Face model is starting up. Please wait 20 seconds and try again.',
              retry_after: 20
            }, { status: 503 })
          }
        }
        
        return NextResponse.json({ 
          error: 'AI analysis failed', 
          details: errorText,
          status: response.status 
        }, { status: 500 })
      }

      const aiResponse = await response.json()
      
      console.log('🤖 Full AI response:', JSON.stringify(aiResponse, null, 2))
      
      // Parse response - new API uses OpenAI-compatible format
      let responseText = ''
      
      if (aiResponse.choices && aiResponse.choices[0]?.message?.content) {
        // OpenAI-compatible format (new API)
        responseText = aiResponse.choices[0].message.content
      } else if (aiResponse.generated_text) {
        // Old format
        responseText = aiResponse.generated_text
      } else if (aiResponse[0]?.generated_text) {
        // Old array format
        responseText = aiResponse[0].generated_text
      } else {
        console.error('❌ Unknown response format:', aiResponse)
        return NextResponse.json({ 
          error: 'Unknown API response format', 
          details: JSON.stringify(aiResponse) 
        }, { status: 500 })
      }
      
      console.log('🤖 AI response received:', {
        length: responseText.length,
        preview: responseText.substring(0, 200)
      })

      // Parse AI's response
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
        console.error('❌ Failed to parse AI response:', e)
        console.error('   Raw response:', responseText)
        return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
      }

      console.log('✅ Extracted data parsed:', {
        seller: extractedData.seller?.company_name,
        client: extractedData.client?.company_name,
        invoice_number: extractedData.general_info?.invoice_number,
        line_items_count: extractedData.line_items?.length,
        total: extractedData.financial_summary?.total
      })
    } catch (aiError) {
      console.error('❌ AI analysis error:', aiError)
      return NextResponse.json({ 
        error: 'AI analysis failed', 
        details: aiError instanceof Error ? aiError.message : 'Unknown error' 
      }, { status: 500 })
    }

    // 5. Update invoice with detailed AI-extracted data
    console.log('💾 Saving extracted data to database...')
    const { error: updateError } = await supabaseAdmin
      .from('invoices')
      .update({
        extracted_data: extractedData,
        invoice_number: extractedData.general_info?.invoice_number,
        invoice_date: extractedData.general_info?.date_of_issue,
        due_date: extractedData.general_info?.due_date,
        subtotal: extractedData.financial_summary?.subtotal,
        tax_total: extractedData.financial_summary?.total_vat,
        discount: extractedData.financial_summary?.discount,
        total: extractedData.financial_summary?.total,
        currency: extractedData.general_info?.currency,
        payment_terms: extractedData.general_info?.payment_terms,
        confidence: extractedData.confidence,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoice_id)

    if (updateError) {
      console.error('❌ Failed to update invoice:', updateError)
      return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 })
    }

    console.log('✅ Invoice updated successfully')

    // 7. Create or update vendor from seller details
    if (extractedData.seller?.company_name) {
      console.log('👤 Processing vendor:', extractedData.seller.company_name)
      
      const { data: existingVendor } = await supabaseAdmin
        .from('vendors')
        .select('id')
        .eq('company_id', invoice.company_id)
        .ilike('name', extractedData.seller.company_name)
        .single()

      let vendorId = existingVendor?.id

      if (!existingVendor) {
        console.log('📝 Creating new vendor')
        const { data: newVendor } = await supabaseAdmin
          .from('vendors')
          .insert({
            company_id: invoice.company_id,
            name: extractedData.seller.company_name,
            email: extractedData.seller.email,
            address: extractedData.seller.address,
            tax_id: extractedData.seller.tax_id
          })
          .select('id')
          .single()

        vendorId = newVendor?.id
        console.log('✅ Vendor created:', vendorId)
      } else {
        console.log('✅ Using existing vendor:', vendorId)
      }

      if (vendorId) {
        await supabaseAdmin
          .from('invoices')
          .update({ vendor_id: vendorId })
          .eq('id', invoice_id)
        console.log('✅ Vendor linked to invoice')
      }
    }

    console.log('✅ AI analysis completed successfully')

    return NextResponse.json({
      success: true,
      extracted_data: extractedData
    })

  } catch (error) {
    console.error('❌ Unexpected error analyzing invoice:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('Error details:', JSON.stringify(error, null, 2))
    return NextResponse.json(
      { 
        error: 'Failed to analyze invoice', 
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
