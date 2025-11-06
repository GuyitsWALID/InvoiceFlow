-- Add extracted_data column to store structured OCR results
-- This stores the raw parsed data from Tesseract OCR before it's mapped to invoice fields

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS extracted_data JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN invoices.extracted_data IS 'Structured data extracted from OCR, including vendor info, line items, and metadata before validation';

-- Add index for faster queries on extracted data
CREATE INDEX IF NOT EXISTS idx_invoices_extracted_data ON invoices USING gin(extracted_data);
