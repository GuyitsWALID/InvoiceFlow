# Quick Database Test Script
# Run these queries IN ORDER in Supabase SQL Editor

-- ============================================
-- STEP 1: VERIFY TABLE EXISTS
-- ============================================
SELECT COUNT(*) as table_exists 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'invoices';
-- Expected: table_exists = 1

-- ============================================
-- STEP 2: GET YOUR USER INFO
-- ============================================
SELECT 
  auth.uid() as my_user_id,
  auth.email() as my_email;
-- Copy your user_id from the result

-- ============================================
-- STEP 3: CHECK IF YOU HAVE A USER RECORD
-- ============================================
SELECT 
  id,
  email,
  company_id,
  created_at
FROM public.users
WHERE id = auth.uid();
-- Expected: 1 row with your email and company_id
-- If NO ROWS: You need to create a user record (see STEP 4)

-- ============================================
-- STEP 4: CREATE USER RECORD (ONLY IF STEP 3 RETURNED NO ROWS)
-- ============================================
-- First, get or create a company:
INSERT INTO companies (name, settings)
VALUES ('My Company', '{}')
ON CONFLICT (id) DO NOTHING
RETURNING id;
-- Copy the company ID

-- Then create your user record:
-- REPLACE 'YOUR_COMPANY_ID' with the ID from above
INSERT INTO public.users (id, email, company_id)
VALUES (
  auth.uid(),
  auth.email(),
  'YOUR_COMPANY_ID'  -- REPLACE THIS
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 5: TEST INSERT PERMISSION
-- ============================================
-- REPLACE 'YOUR_COMPANY_ID' with your company_id from STEP 3 or 4
INSERT INTO invoices (
  company_id,
  attachment_urls,
  mime_types,
  total,
  status,
  confidence
) VALUES (
  'YOUR_COMPANY_ID',  -- REPLACE THIS
  ARRAY['https://example.com/test-invoice.pdf'],
  ARRAY['application/pdf'],
  0,
  'inbox',
  '{"overall": 0, "fields": {}}'::jsonb
)
RETURNING id, company_id, status, created_at;
-- Expected: Returns the new invoice ID
-- If ERROR: Copy the exact error message

-- ============================================
-- STEP 6: VIEW YOUR INVOICES
-- ============================================
SELECT 
  id,
  company_id,
  status,
  total,
  confidence,
  created_at,
  attachment_urls[1] as attachment
FROM invoices
WHERE company_id = (
  SELECT company_id FROM public.users WHERE id = auth.uid()
)
ORDER BY created_at DESC;
-- Expected: Shows all your invoices including the test one from STEP 5

-- ============================================
-- STEP 7: CHECK RLS POLICIES
-- ============================================
SELECT 
  policyname,
  cmd as command,
  CASE 
    WHEN with_check = 'true'::text THEN 'ALLOW ALL'
    ELSE with_check 
  END as condition
FROM pg_policies
WHERE tablename = 'invoices'
ORDER BY cmd, policyname;
-- Expected: Should see 5 policies
-- INSERT policy should have condition = 'ALLOW ALL'

-- ============================================
-- CLEANUP (OPTIONAL)
-- ============================================
-- Delete the test invoice created in STEP 5:
DELETE FROM invoices 
WHERE attachment_urls @> ARRAY['https://example.com/test-invoice.pdf'];
