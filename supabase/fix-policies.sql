-- Fix RLS Policies - Run this in Supabase SQL Editor
-- This will drop all existing policies and create new ones

-- Drop all existing policies
DROP POLICY IF EXISTS "Service role can manage all companies" ON companies;
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Admins can update their company" ON companies;

DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Service role can manage all users" ON users;
DROP POLICY IF EXISTS "Users can view users in their company" ON users;
DROP POLICY IF EXISTS "Admins can manage users in their company" ON users;

DROP POLICY IF EXISTS "Service role can manage all vendors" ON vendors;
DROP POLICY IF EXISTS "Users can view vendors in their company" ON vendors;
DROP POLICY IF EXISTS "Admins and accountants can manage vendors" ON vendors;

DROP POLICY IF EXISTS "Service role can manage all invoices" ON invoices;
DROP POLICY IF EXISTS "Users can view invoices in their company" ON invoices;
DROP POLICY IF EXISTS "Admins, accountants, and approvers can manage invoices" ON invoices;

DROP POLICY IF EXISTS "Service role can manage all line items" ON line_items;
DROP POLICY IF EXISTS "Users can view line items for accessible invoices" ON line_items;
DROP POLICY IF EXISTS "Admins, accountants, and approvers can manage line items" ON line_items;

DROP POLICY IF EXISTS "Service role can manage all integrations" ON integrations;
DROP POLICY IF EXISTS "Users can view integrations in their company" ON integrations;
DROP POLICY IF EXISTS "Admins can manage integrations" ON integrations;

DROP POLICY IF EXISTS "Service role can manage all settings" ON company_settings;
DROP POLICY IF EXISTS "Users can view settings for their company" ON company_settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON company_settings;

DROP POLICY IF EXISTS "Service role can manage all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can view audit logs in their company" ON audit_logs;

-- Create new simplified policies

-- Companies: Allow anyone authenticated to insert (for signup), service role for all operations
CREATE POLICY "Anyone can create a company"
  ON companies FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    OR
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Admins can update their company"
  ON companies FOR UPDATE
  USING (
    id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Users: Allow authenticated users to insert themselves, service role for all
CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid() OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (id = auth.uid() OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid() OR auth.jwt() ->> 'role' = 'service_role');

-- Vendors: Service role has full access
CREATE POLICY "Service role can manage vendors"
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

-- Invoices: Service role has full access
CREATE POLICY "Service role can manage invoices"
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

-- Line Items: Service role has full access
CREATE POLICY "Service role can manage line items"
  ON line_items FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view line items"
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

-- Integrations: Service role has full access
CREATE POLICY "Service role can manage integrations"
  ON integrations FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view integrations"
  ON integrations FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage integrations"
  ON integrations FOR ALL
  USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Company Settings: Allow anyone to insert during signup, service role for all
CREATE POLICY "Anyone can create company settings"
  ON company_settings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can manage settings"
  ON company_settings FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view settings"
  ON company_settings FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage settings"
  ON company_settings FOR ALL
  USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Audit Logs: Service role has full access
CREATE POLICY "Service role can manage audit logs"
  ON audit_logs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view audit logs"
  ON audit_logs FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));
