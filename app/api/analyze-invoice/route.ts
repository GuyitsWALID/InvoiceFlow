import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('='.repeat(50))
    console.log('🤖 AI INVOICE ANALYSIS STARTED')
    console.log('='.repeat(50))
    
    // 1. Parse request
    const { invoice_id } = await request.json()
    console.log('📋 Invoice ID:', invoice_id)
    
    if (!invoice_id) {
      return NextResponse.json({ error: 'Missing invoice_id' }, { status: 400 })
    }
    
    // 2. Check environment variables
    const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    const hasGeminiKey = !!process.env.GOOGLE_GEMINI_API_KEY
    
    console.log('🔑 Environment Check:')
    console.log('  - Supabase URL:', hasSupabaseUrl)
    console.log('  - Service Role Key:', hasServiceKey)
    console.log('  - Gemini API Key:', hasGeminiKey)
    
    if (!hasSupabaseUrl || !hasServiceKey) {
      console.error('❌ Database credentials missing')
      return NextResponse.json({ 
        error: 'Server configuration error',
        details: 'Database not configured'
      }, { status: 500 })
    }
    
    if (!hasGeminiKey) {
      console.error('❌ Gemini API key missing')
      return NextResponse.json({ 
        error: 'Server configuration error',
        details: 'AI service not configured'
      }, { status: 500 })
    }

    // 3. Initialize Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 4. Fetch invoice
    console.log('📥 Fetching invoice from database...')
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoice_id)
      .single()

    if (fetchError || !invoice) {
      console.error('❌ Invoice not found:', fetchError)
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    console.log('✅ Invoice found')

    // 5. Check OCR text
    if (!invoice.raw_ocr || invoice.raw_ocr.trim().length === 0) {
      console.error('❌ No OCR text available')
      return NextResponse.json({ 
        error: 'No OCR text',
        details: 'OCR extraction not complete'
      }, { status: 400 })
    }

    console.log('✅ OCR text available:', invoice.raw_ocr.length, 'characters')

    // 6. Download invoice image for Gemini Vision analysis
    const fileUrl = invoice.attachment_urls?.[0]
    if (!fileUrl) {
      console.error('❌ No file attached to invoice')
      return NextResponse.json({ error: 'No file attached to invoice' }, { status: 400 })
    }

    console.log('📥 Downloading invoice image...')
    
    // Extract the storage path from the URL
    const urlParts = fileUrl.split('/storage/v1/object/public/invoices/')
    const filePath = urlParts[1]

    const { data: fileBlob, error: downloadError } = await supabase
      .storage
      .from('invoices')
      .download(filePath)

    if (downloadError || !fileBlob) {
      console.error('❌ Failed to download file:', downloadError)
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
    }

    console.log('✅ Image downloaded, size:', fileBlob.size, 'bytes')

    // Convert to base64
    const arrayBuffer = await fileBlob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Image = buffer.toString('base64')
    const mimeType = invoice.mime_types?.[0] || 'image/jpeg'

    console.log('✅ Image converted to base64, MIME type:', mimeType)

    // 7. Prepare AI prompt with BOTH OCR text and image
    // 7. Prepare AI prompt with BOTH OCR text and image
    const prompt = `You are an expert invoice data extraction AI. I'm providing you with BOTH the OCR-extracted text AND the original invoice image for maximum accuracy.

Use the OCR text as a reference but verify and correct it by looking at the actual image. Extract all information accurately.

OCR Text (may contain errors):
${invoice.raw_ocr}

Please analyze the image carefully and extract accurate data. Return ONLY valid JSON with this exact structure:
{
  "general_info": {
    "invoice_number": "string or null",
    "date_of_issue": "YYYY-MM-DD or null",
    "due_date": "YYYY-MM-DD or null",
    "currency": "USD",
    "currency_symbol": "$",
    "payment_terms": "string or null",
    "po_number": "string or null"
  },
  "seller": {
    "company_name": "string or null",
    "address": "string or null",
    "city": "string or null",
    "state": "string or null",
    "zip_code": "string or null",
    "country": "string or null",
    "tax_id": "string or null",
    "email": "string or null",
    "phone": "string or null"
  },
  "client": {
    "company_name": "string or null",
    "address": "string or null",
    "city": "string or null",
    "state": "string or null",
    "zip_code": "string or null",
    "country": "string or null",
    "tax_id": "string or null"
  },
  "line_items": [
    {
      "item_number": 1,
      "description": "string",
      "quantity": 0,
      "unit": "each",
      "unit_price": 0,
      "net_worth": 0,
      "vat_rate": 0,
      "vat_amount": 0,
      "gross_worth": 0
    }
  ],
  "financial_summary": {
    "subtotal": 0,
    "total_vat": 0,
    "discount": 0,
    "shipping": 0,
    "total": 0
  }
}`

    // 8. Call Google Gemini API with Vision (multimodal)
    console.log('🤖 Calling Google Gemini Vision API...')
    console.log('   Model: gemini-2.0-flash-exp')
    console.log('   Prompt length:', prompt.length)
    console.log('   Image size:', base64Image.length, 'characters')
    
    const geminiPayload = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Image
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096
      }
    }
    
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload)
      }
    )

    console.log('📥 Gemini response status:', geminiResponse.status)

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('❌ Gemini API error:', errorText)
      return NextResponse.json({ 
        error: 'AI analysis failed',
        details: errorText
      }, { status: 500 })
    }

    const geminiData = await geminiResponse.json()
    console.log('✅ Gemini Vision response received')

    // 9. Parse AI response
    // 9. Parse AI response
    const aiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!aiText) {
      console.error('❌ No text in Gemini response')
      return NextResponse.json({ 
        error: 'Invalid AI response',
        details: 'No content returned'
      }, { status: 500 })
    }

    console.log('📝 AI response length:', aiText.length)

    // 10. Extract JSON from response
    // 10. Extract JSON from response
    let extractedData: any
    try {
      // Remove markdown code blocks if present
      const cleanText = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/)
      
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0])
      } else {
        extractedData = JSON.parse(cleanText)
      }
      
      console.log('✅ JSON parsed successfully')
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', parseError)
      console.error('   Raw text:', aiText.substring(0, 500))
      return NextResponse.json({ 
        error: 'Failed to parse AI response',
        details: 'Invalid JSON format'
      }, { status: 500 })
    }

    // 11. Update invoice in database
    // 11. Update invoice in database
    console.log('💾 Updating invoice...')
    const { error: updateError } = await supabase
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
        updated_at: new Date().toISOString()
      })
      .eq('id', invoice_id)

    if (updateError) {
      console.error('❌ Database update failed:', updateError)
      return NextResponse.json({ 
        error: 'Failed to save analysis',
        details: updateError.message
      }, { status: 500 })
    }

    console.log('✅ Invoice updated successfully')

    // 12. Create/update vendor
    if (extractedData.seller?.company_name) {
      console.log('👤 Processing vendor:', extractedData.seller.company_name)
      
      const { data: existingVendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('company_id', invoice.company_id)
        .ilike('name', extractedData.seller.company_name)
        .single()

      let vendorId = existingVendor?.id

      if (!existingVendor) {
        const { data: newVendor } = await supabase
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
        console.log('✅ New vendor created')
      } else {
        console.log('✅ Using existing vendor')
      }

      if (vendorId) {
        await supabase
          .from('invoices')
          .update({ vendor_id: vendorId })
          .eq('id', invoice_id)
        console.log('✅ Vendor linked to invoice')
      }
    }

    console.log('='.repeat(50))
    console.log('✅ AI ANALYSIS COMPLETED SUCCESSFULLY')
    console.log('='.repeat(50))

    return NextResponse.json({
      success: true,
      extracted_data: extractedData
    })

  } catch (error) {
    console.error('💥 UNEXPECTED ERROR:', error)
    console.error('   Type:', error instanceof Error ? error.constructor.name : typeof error)
    console.error('   Message:', error instanceof Error ? error.message : String(error))
    console.error('   Stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json({
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : typeof error
    }, { status: 500 })
  }
}
