-- Migration: Recreate invoices table with proper RLS policies
-- WARNING: This will DELETE all existing invoice data!
-- Run this in Supabase SQL Editor

-- Step 1: Drop the existing invoices table (cascades to line_items and audit_logs)
DROP TABLE IF EXISTS public.invoices CASCADE;

-- Step 2: Recreate the invoices table with the same structure
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  invoice_number TEXT,
  po_number TEXT,
  invoice_date DATE,
  due_date DATE,
  payment_terms TEXT,
  currency VARCHAR(3) DEFAULT 'USD',
  subtotal NUMERIC(15,2) DEFAULT 0,
  tax_total NUMERIC(15,2) DEFAULT 0,
  discount NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) NOT NULL,
  status invoice_status DEFAULT 'inbox',
  confidence JSONB NOT NULL DEFAULT '{"overall": 0, "fields": {}}'::jsonb,
  raw_ocr TEXT,
  source_email JSONB,
  attachment_urls TEXT[] DEFAULT '{}',
  mime_types TEXT[] DEFAULT '{}',
  language_detected VARCHAR(10),
  sync_error TEXT,
  external_id TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  extracted_data JSONB DEFAULT '{}'
);

-- Step 3: Create indexes for performance
CREATE INDEX idx_invoices_company ON public.invoices(company_id);
CREATE INDEX idx_invoices_vendor ON public.invoices(vendor_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_date ON public.invoices(invoice_date);
CREATE INDEX idx_invoices_number ON public.invoices(invoice_number);
CREATE INDEX idx_invoices_extracted_data ON public.invoices USING gin(extracted_data);

-- Step 4: Create triggers for updated_at and audit logging
CREATE TRIGGER update_invoices_updated_at 
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER audit_invoices 
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW 
  EXECUTE FUNCTION create_audit_log();

-- Step 5: Enable Row Level Security
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for authenticated users

-- Allow authenticated users to INSERT any invoice
CREATE POLICY "Authenticated users can insert invoices"
  ON public.invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to SELECT invoices in their company
CREATE POLICY "Authenticated users can select invoices in their company"
  ON public.invoices
  FOR SELECT
  TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

-- Allow authenticated users to UPDATE invoices in their company
CREATE POLICY "Authenticated users can update invoices in their company"
  ON public.invoices
  FOR UPDATE
  TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
  )
  WITH CHECK (
    company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

-- Allow authenticated users to DELETE invoices in their company
CREATE POLICY "Authenticated users can delete invoices in their company"
  ON public.invoices
  FOR DELETE
  TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

-- Allow service role to do everything (admin operations)
CREATE POLICY "Service role can manage all invoices"
  ON public.invoices
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Step 7: Add helpful comment
COMMENT ON TABLE public.invoices IS 'Invoice records with OCR data and RLS policies allowing authenticated users to insert';
COMMENT ON COLUMN public.invoices.extracted_data IS 'Structured data extracted from OCR';
COMMENT ON COLUMN public.invoices.raw_ocr IS 'Raw text from OCR processing';
COMMENT ON COLUMN public.invoices.confidence IS 'Confidence scores for extracted fields';

-- Verification query (run after migration to confirm policies)
-- SELECT * FROM pg_policies WHERE tablename = 'invoices';
