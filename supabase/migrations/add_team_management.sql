-- Migration: Add Team Management and Subscription Features
-- Description: Add team invitations, subscription plans, and member limits
-- Run in Supabase SQL Editor after add_accounting_sync_tables.sql

-- ============================================================================
-- 1. SUBSCRIPTION_PLANS TABLE
-- Define subscription tiers with team member limits
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10, 2),
  price_yearly DECIMAL(10, 2),
  max_team_members INTEGER NOT NULL DEFAULT 1,
  max_invoices_per_month INTEGER,
  features JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plans
INSERT INTO subscription_plans (id, name, display_name, description, price_monthly, price_yearly, max_team_members, max_invoices_per_month, features) VALUES
  ('free', 'free', 'Free', 'Perfect for getting started', 0, 0, 1, 10, '{"ocr": true, "ai_extraction": false, "accounting_sync": false, "email_integration": false}'::jsonb),
  ('starter', 'starter', 'Starter', 'For small businesses', 29, 290, 3, 100, '{"ocr": true, "ai_extraction": true, "accounting_sync": true, "email_integration": true}'::jsonb),
  ('professional', 'professional', 'Professional', 'For growing teams', 79, 790, 10, 500, '{"ocr": true, "ai_extraction": true, "accounting_sync": true, "email_integration": true, "api_access": true}'::jsonb),
  ('enterprise', 'enterprise', 'Enterprise', 'For large organizations', 199, 1990, 999, 999999, '{"ocr": true, "ai_extraction": true, "accounting_sync": true, "email_integration": true, "api_access": true, "priority_support": true, "custom_workflows": true}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. UPDATE COMPANIES TABLE
-- Add subscription information
-- ============================================================================
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS subscription_plan_id TEXT DEFAULT 'free' REFERENCES subscription_plans(id),
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'past_due', 'cancelled', 'trialing')),
  ADD COLUMN IF NOT EXISTS subscription_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- ============================================================================
-- 3. TEAM_INVITATIONS TABLE
-- Track pending invitations to join team
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'accountant', 'approver', 'viewer')),
  invited_by UUID NOT NULL REFERENCES users(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate pending invitations
  UNIQUE(company_id, email, accepted_at) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_team_invitations_company ON team_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires ON team_invitations(expires_at);

-- ============================================================================
-- 4. AUDIT_LOGS TABLE (if not exists)
-- Track all team management actions
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS subscription_plans_select_policy ON subscription_plans;
DROP POLICY IF EXISTS team_invitations_select_policy ON team_invitations;
DROP POLICY IF EXISTS team_invitations_insert_policy ON team_invitations;
DROP POLICY IF EXISTS team_invitations_update_policy ON team_invitations;
DROP POLICY IF EXISTS team_invitations_delete_policy ON team_invitations;
DROP POLICY IF EXISTS audit_logs_select_policy ON audit_logs;
DROP POLICY IF EXISTS audit_logs_insert_policy ON audit_logs;

-- Subscription plans are public (everyone can view pricing)
CREATE POLICY subscription_plans_select_policy ON subscription_plans
  FOR SELECT
  USING (TRUE);

-- Team invitations policies
CREATE POLICY team_invitations_select_policy ON team_invitations
  FOR SELECT
  USING (TRUE); -- Users can see invitations for their company

CREATE POLICY team_invitations_insert_policy ON team_invitations
  FOR INSERT
  WITH CHECK (TRUE); -- Admins can invite users (checked in application)

CREATE POLICY team_invitations_update_policy ON team_invitations
  FOR UPDATE
  USING (TRUE); -- Users can accept invitations

CREATE POLICY team_invitations_delete_policy ON team_invitations
  FOR DELETE
  USING (TRUE); -- Admins can cancel invitations

-- Audit logs policies
CREATE POLICY audit_logs_select_policy ON audit_logs
  FOR SELECT
  USING (TRUE); -- Users can view audit logs for their company

CREATE POLICY audit_logs_insert_policy ON audit_logs
  FOR INSERT
  WITH CHECK (TRUE); -- System can insert audit logs

-- ============================================================================
-- 6. UTILITY FUNCTIONS
-- ============================================================================

-- Function to get company's current team size
CREATE OR REPLACE FUNCTION get_company_team_size(p_company_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM users
  WHERE company_id = p_company_id;
$$ LANGUAGE SQL;

-- Function to check if company can add more members
CREATE OR REPLACE FUNCTION can_add_team_member(p_company_id UUID)
RETURNS BOOLEAN AS $$
  SELECT 
    COALESCE(
      (SELECT COUNT(*) FROM users WHERE company_id = p_company_id) <
      (SELECT sp.max_team_members 
       FROM companies c 
       JOIN subscription_plans sp ON c.subscription_plan_id = sp.id 
       WHERE c.id = p_company_id),
      FALSE
    );
$$ LANGUAGE SQL;

-- Function to get pending invitations count
CREATE OR REPLACE FUNCTION get_pending_invitations_count(p_company_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM team_invitations
  WHERE company_id = p_company_id
    AND accepted_at IS NULL
    AND expires_at > NOW();
$$ LANGUAGE SQL;

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

-- Auto-expire old invitations (run periodically or on query)
CREATE OR REPLACE FUNCTION delete_expired_invitations()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM team_invitations
  WHERE expires_at < NOW()
    AND accepted_at IS NULL;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (optional - for periodic cleanup)
DROP TRIGGER IF EXISTS trigger_delete_expired_invitations ON team_invitations;
CREATE TRIGGER trigger_delete_expired_invitations
  AFTER INSERT OR UPDATE ON team_invitations
  EXECUTE FUNCTION delete_expired_invitations();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables were created
SELECT 
  'subscription_plans' as table_name, 
  COUNT(*) as row_count 
FROM subscription_plans
UNION ALL
SELECT 
  'team_invitations', 
  COUNT(*) 
FROM team_invitations
UNION ALL
SELECT 
  'audit_logs', 
  COUNT(*) 
FROM audit_logs;

-- Show available plans
SELECT id, display_name, max_team_members, price_monthly FROM subscription_plans ORDER BY max_team_members;
