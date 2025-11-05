-- InvoiceFlow Database Schema
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy string matching

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'accountant', 'approver', 'viewer');
CREATE TYPE invoice_status AS ENUM ('inbox', 'needs_review', 'approved', 'synced', 'rejected', 'duplicate');
CREATE TYPE integration_type AS ENUM ('quickbooks', 'xero', 'gmail', 'outlook', 'imap');

-- Companies table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  default_currency VARCHAR(3) DEFAULT 'USD',
  default_tax_code TEXT,
  default_gl_account TEXT,
  duplicate_detection_sensitivity NUMERIC(3,2) DEFAULT 0.85,
  require_invoice_number BOOLEAN DEFAULT true,
  max_file_size_mb INTEGER DEFAULT 10,
  data_retention_days INTEGER DEFAULT 365,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role user_role DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendors table
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  address TEXT,
  tax_id TEXT,
  bank_account TEXT,
  iban TEXT,
  swift TEXT,
  external_id TEXT, -- ID in accounting system
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- Invoices table
CREATE TABLE invoices (
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
  confidence JSONB NOT NULL DEFAULT '{"overall": 0, "fields": {}}',
  raw_ocr TEXT,
  source_email JSONB,
  attachment_urls TEXT[] DEFAULT '{}',
  mime_types TEXT[] DEFAULT '{}',
  language_detected VARCHAR(10),
  sync_error TEXT,
  external_id TEXT, -- ID in accounting system
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Line items table
CREATE TABLE line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit_price NUMERIC(15,2) DEFAULT 0,
  tax NUMERIC(15,2) DEFAULT 0,
  amount NUMERIC(15,2) NOT NULL,
  gl_account TEXT,
  tax_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integrations table (stores encrypted OAuth tokens)
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type integration_type NOT NULL,
  display_name TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, type, display_name)
);

-- Company settings table
CREATE TABLE company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID UNIQUE NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  confidence_threshold NUMERIC(3,2) DEFAULT 0.85,
  auto_approve_high_confidence BOOLEAN DEFAULT false,
  duplicate_check_window_days INTEGER DEFAULT 90,
  enable_fraud_detection BOOLEAN DEFAULT true,
  notify_on_low_confidence BOOLEAN DEFAULT true,
  notify_on_duplicate BOOLEAN DEFAULT true,
  notify_on_anomaly BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  changes JSONB,
  previous_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_vendors_company ON vendors(company_id);
CREATE INDEX idx_vendors_name_trgm ON vendors USING gin(name gin_trgm_ops);
CREATE INDEX idx_invoices_company ON invoices(company_id);
CREATE INDEX idx_invoices_vendor ON invoices(vendor_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_line_items_invoice ON line_items(invoice_id);
CREATE INDEX idx_integrations_company ON integrations(company_id);
CREATE INDEX idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_invoice ON audit_logs(invoice_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);

-- Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies
CREATE POLICY "Service role can manage all companies"
  ON companies FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can update their company"
  ON companies FOR UPDATE
  USING (id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for users
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Service role can manage all users"
  ON users FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for vendors
CREATE POLICY "Service role can manage all vendors"
  ON vendors FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view vendors in their company"
  ON vendors FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins and accountants can manage vendors"
  ON vendors FOR ALL
  USING (company_id IN (
    SELECT company_id FROM users 
    WHERE id = auth.uid() AND role IN ('admin', 'accountant')
  ));

-- RLS Policies for invoices
CREATE POLICY "Service role can manage all invoices"
  ON invoices FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view invoices in their company"
  ON invoices FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins, accountants, and approvers can manage invoices"
  ON invoices FOR ALL
  USING (company_id IN (
    SELECT company_id FROM users 
    WHERE id = auth.uid() AND role IN ('admin', 'accountant', 'approver')
  ));

-- RLS Policies for line_items
CREATE POLICY "Service role can manage all line items"
  ON line_items FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view line items for accessible invoices"
  ON line_items FOR SELECT
  USING (invoice_id IN (
    SELECT id FROM invoices 
    WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Admins, accountants, and approvers can manage line items"
  ON line_items FOR ALL
  USING (invoice_id IN (
    SELECT id FROM invoices 
    WHERE company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'accountant', 'approver')
    )
  ));

-- RLS Policies for integrations
CREATE POLICY "Service role can manage all integrations"
  ON integrations FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view integrations in their company"
  ON integrations FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage integrations"
  ON integrations FOR ALL
  USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- RLS Policies for company_settings
CREATE POLICY "Service role can manage all settings"
  ON company_settings FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view settings for their company"
  ON company_settings FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage settings"
  ON company_settings FOR ALL
  USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- RLS Policies for audit_logs
CREATE POLICY "Service role can manage all audit logs"
  ON audit_logs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view audit logs in their company"
  ON audit_logs FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON company_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    company_id,
    invoice_id,
    user_id,
    action,
    entity_type,
    entity_id,
    previous_value,
    new_value
  ) VALUES (
    COALESCE(NEW.company_id, OLD.company_id),
    CASE 
      WHEN TG_TABLE_NAME = 'invoices' THEN COALESCE(NEW.id, OLD.id)
      ELSE NULL
    END,
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers
CREATE TRIGGER audit_invoices AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_vendors AFTER INSERT OR UPDATE OR DELETE ON vendors
  FOR EACH ROW EXECUTE FUNCTION create_audit_log();
