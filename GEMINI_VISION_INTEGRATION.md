# Gemini Vision Integration for Invoice Analysis

## Overview
Integrated Google Gemini Vision API to enhance invoice analysis by using BOTH OCR text and the original image for maximum accuracy.

## Implementation

### Workflow
1. **OCR Extraction** (`/api/process-invoice`)
   - Uses OCR.space API to extract raw text from uploaded invoice
   - Stores raw OCR text in database
   - Sets invoice status to `needs_review`

2. **AI Analysis** (`/api/analyze-invoice`)
   - Downloads the original invoice image from Supabase Storage
   - Converts image to base64
   - Sends BOTH OCR text AND image to Gemini Vision API
   - Gemini cross-references OCR text with actual image for accuracy
   - Extracts structured data and updates invoice record

### Key Changes

#### `/api/analyze-invoice/route.ts`
**Added Image Processing:**
```typescript
// Download invoice image from Supabase Storage
const fileUrl = invoice.attachment_urls?.[0]
const urlParts = fileUrl.split('/storage/v1/object/public/invoices/')
const filePath = urlParts[1]

const { data: fileBlob } = await supabase
  .storage
  .from('invoices')
  .download(filePath)

// Convert to base64
const arrayBuffer = await fileBlob.arrayBuffer()
const buffer = Buffer.from(arrayBuffer)
const base64Image = buffer.toString('base64')
const mimeType = invoice.mime_types?.[0] || 'image/jpeg'
```

**Enhanced Prompt:**
- Instructs Gemini to use OCR text as reference
- Asks Gemini to verify and correct OCR errors by looking at actual image
- Provides structured JSON schema for extraction

**Multimodal API Call:**
```typescript
const geminiPayload = {
  contents: [{
    parts: [
      { text: prompt }, // Text prompt with OCR data
      {
        inline_data: {
          mime_type: mimeType,
          data: base64Image // Actual invoice image
        }
      }
    ]
  }],
  generationConfig: {
    temperature: 0.1,
    maxOutputTokens: 4096,
    responseMimeType: "application/json"
  }
}

const geminiResponse = await fetch(
  `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(geminiPayload)
  }
)
```

#### `/api/process-invoice/route.ts`
**No Changes:**
- Kept OCR.space for text extraction
- Still stores raw OCR text in database
- Invoice ready for AI analysis after OCR completes

## Benefits

1. **Higher Accuracy**: Gemini can correct OCR errors by looking at the actual image
2. **Better Handwriting Recognition**: Gemini Vision can read handwritten notes
3. **Layout Understanding**: Gemini understands table structures and visual layout
4. **Logo Recognition**: Can identify vendors from logos even if company name is unclear
5. **Multi-Language Support**: Gemini handles multiple languages better
6. **Error Correction**: Cross-references OCR text with image to fix mistakes

## Data Flow

```
1. User uploads invoice → /upload page
                          ↓
2. File saved to Supabase Storage
                          ↓
3. Invoice record created in database
                          ↓
4. /api/process-invoice called
   - Downloads image from storage
   - Sends to OCR.space
   - Saves raw OCR text
   - Status: needs_review
                          ↓
5. User clicks "Analyze" button
                          ↓
6. /api/analyze-invoice called
   - Fetches invoice record (with raw_ocr)
   - Downloads original image
   - Converts image to base64
   - Sends BOTH to Gemini Vision:
     * OCR text (as reference)
     * Original image (for verification)
   - Gemini returns structured JSON
   - Updates invoice with extracted data
   - Creates/updates vendor record
                          ↓
7. User reviews and approves
```

## Environment Variables

Required in `.env.local`:
```env
GOOGLE_GEMINI_API_KEY=your_api_key_here
```

## API Usage

**Gemini 1.5 Flash:**
- Free tier: 15 requests per minute
- 1 million tokens per day
- Vision support included
- Perfect for invoice analysis

**OCR.space:**
- Free tier: 25,000 requests per month
- Fast and reliable for text extraction
- Complements Gemini Vision

## Error Handling

The analyze endpoint handles:
- Missing OCR text (requires OCR to complete first)
- Failed image download
- Invalid Gemini API responses
- JSON parsing errors
- Database update failures
- Vendor creation errors

All errors are logged with detailed context for debugging.

## Testing

To test the integration:

1. Upload an invoice via `/upload` page
2. Wait for OCR to complete (status: needs_review)
3. Navigate to invoice details page
4. Click "Analyze" button
5. Check console logs for:
   - OCR text length
   - Image download success
   - Gemini API call
   - Extracted data structure
6. Verify extracted data matches invoice
7. Check that vendor is created/linked

## Performance

- OCR extraction: ~2-5 seconds
- Image download: ~1 second
- Gemini Vision analysis: ~3-8 seconds
- Total processing: ~6-14 seconds per invoice

## Future Enhancements

Potential improvements:
- Cache image data to avoid re-downloading
- Batch processing for multiple invoices
- Confidence scores for extracted fields
- Support for multi-page invoices
- Custom training data for specific invoice formats
