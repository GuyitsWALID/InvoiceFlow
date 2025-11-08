-- Migration: Add Accounting Sync Tables
-- Description: Creates tables for accounting platform integrations and invoice sync tracking
-- Run in Supabase SQL Editor

-- ============================================================================
-- 1. ACCOUNTING_CONNECTIONS TABLE
-- Stores OAuth credentials for accounting platform connections (QuickBooks, Xero, Wave, Excel)
-- ============================================================================
CREATE TABLE IF NOT EXISTS accounting_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('quickbooks', 'xero', 'wave', 'excel')),
  provider_company_id TEXT, -- realmId for QuickBooks, organizationId for Xero, businessId for Wave, NULL for Excel
  provider_company_name TEXT,
  
  -- OAuth tokens (store encrypted in production)
  access_token TEXT,
  refresh_token TEXT,
  realm_id TEXT, -- QuickBooks specific
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  
  -- Connection status
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT TRUE, -- If company has multiple connections, one is default
  last_synced_at TIMESTAMPTZ,
  
  -- Metadata (store provider-specific settings)
  metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one active connection per provider per company
  UNIQUE(company_id, provider, provider_company_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_accounting_connections_company ON accounting_connections(company_id);
CREATE INDEX IF NOT EXISTS idx_accounting_connections_provider ON accounting_connections(provider);
CREATE INDEX IF NOT EXISTS idx_accounting_connections_active ON accounting_connections(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- 2. INVOICE_SYNC_LOGS TABLE
-- Audit log of every sync attempt (success or failure)
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  
  -- Sync details
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'success', 'failed')),
  
  -- External IDs (from accounting platform)
  external_bill_id TEXT,
  external_bill_url TEXT,
  external_vendor_id TEXT,
  
  -- Error tracking
  error_message TEXT,
  
  -- Timestamps
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for querying sync history
CREATE INDEX IF NOT EXISTS idx_invoice_sync_logs_invoice ON invoice_sync_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_sync_logs_company ON invoice_sync_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_sync_logs_provider ON invoice_sync_logs(provider);
CREATE INDEX IF NOT EXISTS idx_invoice_sync_logs_status ON invoice_sync_logs(status);

-- ============================================================================
-- 3. UPDATE COMPANIES TABLE
-- Add accounting sync settings
-- ============================================================================
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS auto_sync_on_approve BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS accounting_settings JSONB;

-- ============================================================================
-- 4. UPDATE INVOICES TABLE
-- Add sync status and external IDs
-- ============================================================================
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'not_synced' 
    CHECK (sync_status IN ('not_synced', 'pending', 'synced', 'failed')),
  ADD COLUMN IF NOT EXISTS external_bill_id TEXT,
  ADD COLUMN IF NOT EXISTS external_bill_url TEXT,
  ADD COLUMN IF NOT EXISTS last_sync_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Index for finding unsynced invoices
CREATE INDEX IF NOT EXISTS idx_invoices_sync_status ON invoices(sync_status);
CREATE INDEX IF NOT EXISTS idx_invoices_approved_unsynced ON invoices(status, sync_status) 
  WHERE status = 'approved' AND sync_status IN ('not_synced', 'failed');

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- Ensure users can only access their company's data
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE accounting_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_sync_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS accounting_connections_select_policy ON accounting_connections;
DROP POLICY IF EXISTS accounting_connections_insert_policy ON accounting_connections;
DROP POLICY IF EXISTS accounting_connections_update_policy ON accounting_connections;
DROP POLICY IF EXISTS invoice_sync_logs_select_policy ON invoice_sync_logs;
DROP POLICY IF EXISTS invoice_sync_logs_insert_policy ON invoice_sync_logs;

-- Policy: Users can view connections for their company
CREATE POLICY accounting_connections_select_policy ON accounting_connections
  FOR SELECT
  USING (TRUE); -- Allow authenticated users to see all connections (we'll refine this later based on your auth structure)

-- Policy: Users can insert connections for their company
CREATE POLICY accounting_connections_insert_policy ON accounting_connections
  FOR INSERT
  WITH CHECK (TRUE); -- Allow authenticated users to insert connections

-- Policy: Users can update connections for their company
CREATE POLICY accounting_connections_update_policy ON accounting_connections
  FOR UPDATE
  USING (TRUE); -- Allow authenticated users to update connections

-- Policy: Users can view sync logs
CREATE POLICY invoice_sync_logs_select_policy ON invoice_sync_logs
  FOR SELECT
  USING (TRUE); -- Allow authenticated users to view sync logs

-- Policy: System can insert sync logs (service role)
CREATE POLICY invoice_sync_logs_insert_policy ON invoice_sync_logs
  FOR INSERT
  WITH CHECK (TRUE); -- Allow inserts for sync logs

-- ============================================================================
-- 6. UTILITY FUNCTIONS
-- ============================================================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_active_accounting_connection(UUID, TEXT);
DROP FUNCTION IF EXISTS is_invoice_synced(UUID);

-- Function to get active connection for a company
CREATE OR REPLACE FUNCTION get_active_accounting_connection(
  p_company_id UUID,
  p_provider TEXT DEFAULT NULL
)
RETURNS accounting_connections AS $$
  SELECT * FROM accounting_connections
  WHERE company_id = p_company_id
    AND is_active = TRUE
    AND (p_provider IS NULL OR provider = p_provider)
  ORDER BY is_default DESC, created_at DESC
  LIMIT 1;
$$ LANGUAGE SQL;

-- Function to check if invoice has already been synced (idempotency check)
CREATE OR REPLACE FUNCTION is_invoice_synced(p_invoice_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM invoice_sync_logs
    WHERE invoice_id = p_invoice_id
      AND status = 'success'
    LIMIT 1
  );
$$ LANGUAGE SQL;

-- ============================================================================
-- 7. SAMPLE DATA (for testing - remove in production)
-- ============================================================================

-- Uncomment to insert sample connection for testing
-- INSERT INTO accounting_connections (
--   company_id,
--   provider,
--   provider_company_id,
--   provider_company_name,
--   access_token_encrypted,
--   refresh_token_encrypted,
--   token_expires_at,
--   scopes
-- ) VALUES (
--   'your-company-uuid-here',
--   'quickbooks',
--   '1234567890',
--   'Sample Company',
--   'encrypted_access_token_placeholder',
--   'encrypted_refresh_token_placeholder',
--   NOW() + INTERVAL '1 hour',
--   ARRAY['com.intuit.quickbooks.accounting']
-- );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables were created
SELECT 
  'accounting_connections' as table_name, 
  COUNT(*) as row_count 
FROM accounting_connections
UNION ALL
SELECT 
  'invoice_sync_logs', 
  COUNT(*) 
FROM invoice_sync_logs;
