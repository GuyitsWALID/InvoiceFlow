-- Complete fix for RLS policies to work with client-side signup
-- Run this ENTIRE script in Supabase SQL Editor

-- ========================================
-- COMPANIES TABLE
-- ========================================
DROP POLICY IF EXISTS "Service role can manage all companies" ON companies;
DROP POLICY IF EXISTS "Anyone can create a company" ON companies;
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Admins can update their company" ON companies;
DROP POLICY IF EXISTS "Authenticated users can create companies" ON companies;

-- Allow any authenticated user to create a company (needed for signup)
CREATE POLICY "Authenticated users can create companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to view their own company (after they create their profile)
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Allow admins to update their company
CREATE POLICY "Admins can update their company"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow service role to do everything (for backend operations)
CREATE POLICY "Service role can manage all companies"
  ON companies FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ========================================
-- USERS TABLE
-- ========================================
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Service role can manage all users" ON users;
DROP POLICY IF EXISTS "Users can view users in their company" ON users;
DROP POLICY IF EXISTS "Admins can manage users in their company" ON users;

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Allow service role to manage all users
CREATE POLICY "Service role can manage all users"
  ON users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ========================================
-- COMPANY_SETTINGS TABLE
-- ========================================
DROP POLICY IF EXISTS "Anyone can create company settings" ON company_settings;
DROP POLICY IF EXISTS "Service role can manage settings" ON company_settings;
DROP POLICY IF EXISTS "Users can view settings" ON company_settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON company_settings;
DROP POLICY IF EXISTS "Users can view settings for their company" ON company_settings;
DROP POLICY IF EXISTS "Service role can manage all settings" ON company_settings;

-- Allow authenticated users to create company settings (needed for signup)
CREATE POLICY "Authenticated users can create settings"
  ON company_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to view settings for their company
CREATE POLICY "Users can view settings for their company"
  ON company_settings FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- Allow admins to manage settings
CREATE POLICY "Admins can manage settings"
  ON company_settings FOR ALL
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Allow service role to manage all settings
CREATE POLICY "Service role can manage all settings"
  ON company_settings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
