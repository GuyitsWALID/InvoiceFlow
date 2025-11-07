-- ==========================================
-- InvoiceFlow Database Diagnostics
-- Run these queries in Supabase SQL Editor to diagnose upload issues
-- ==========================================

-- 1. CHECK IF INVOICES TABLE EXISTS
-- Expected: Should show the invoices table with all columns
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'invoices'
ORDER BY ordinal_position;

-- 2. CHECK RLS POLICIES ON INVOICES TABLE
-- Expected: Should show 5 policies (INSERT with CHECK true, SELECT/UPDATE/DELETE company-restricted, service role all)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'invoices';

-- 3. CHECK IF RLS IS ENABLED
-- Expected: relrowsecurity should be 't' (true)
SELECT 
  relname as table_name,
  relrowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'invoices';

-- 4. CHECK CURRENT AUTHENTICATED USER
-- Expected: Should show your user ID, email, and company_id
-- Run this while logged in to your app
SELECT 
  auth.uid() as auth_user_id,
  auth.email() as auth_email;

-- 5. CHECK PUBLIC.USERS TABLE FOR YOUR ACCOUNT
-- Expected: Should show a row with your auth user ID and company_id
-- Replace 'YOUR_AUTH_USER_ID' with the ID from query #4
SELECT 
  id,
  email,
  company_id,
  created_at
FROM public.users
WHERE id = auth.uid();  -- Or replace with: id = 'YOUR_AUTH_USER_ID'

-- 6. TEST INSERT PERMISSION (IMPORTANT!)
-- This will attempt to insert a test invoice
-- If it fails with 403, we'll see the exact RLS error
-- Expected: Should succeed and return the new invoice ID
-- IMPORTANT: Replace 'YOUR_COMPANY_ID' with your actual company_id from query #5
INSERT INTO invoices (
  company_id,
  attachment_urls,
  mime_types,
  total,
  status,
  confidence
) VALUES (
  'YOUR_COMPANY_ID',  -- REPLACE THIS
  ARRAY['https://example.com/test.pdf'],
  ARRAY['application/pdf'],
  0,
  'inbox',
  '{"overall": 0, "fields": {}}'::jsonb
)
RETURNING id, company_id, status;

-- 7. CHECK IF EXTRACTED_DATA COLUMN EXISTS
-- Expected: Should show extracted_data column with jsonb type
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'invoices'
  AND column_name = 'extracted_data';

-- 8. VIEW ALL INVOICES (to see if any exist)
-- Expected: Should show all invoices in the database
SELECT 
  id,
  company_id,
  status,
  total,
  created_at,
  attachment_urls[1] as first_attachment
FROM invoices
ORDER BY created_at DESC
LIMIT 10;

-- 9. CHECK STORAGE BUCKET SETUP
-- Expected: Should show 'invoices' bucket with public = true
SELECT 
  id,
  name,
  public,
  created_at
FROM storage.buckets
WHERE name = 'invoices';

-- 10. CHECK STORAGE BUCKET POLICIES
-- Expected: Should show policies allowing uploads and downloads
SELECT 
  name,
  definition
FROM storage.policies
WHERE bucket_id = (SELECT id FROM storage.buckets WHERE name = 'invoices');

-- ==========================================
-- CLEANUP COMMAND (USE WITH CAUTION)
-- ==========================================
-- If you need to delete the test invoice from query #6:
-- DELETE FROM invoices WHERE attachment_urls @> ARRAY['https://example.com/test.pdf'];
