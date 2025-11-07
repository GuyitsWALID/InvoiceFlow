-- ==========================================
-- IMMEDIATE FIX - Run These Queries NOW
-- Copy and paste into Supabase SQL Editor
-- ==========================================

-- STEP 1: Check if you have a user record (CRITICAL!)
-- This is likely the problem - no user record = no company_id = RLS blocks insert
SELECT 
  id,
  email,
  company_id,
  created_at
FROM public.users
WHERE id = auth.uid();

-- Expected: 1 row with your email and company_id
-- If you see NO ROWS, continue to STEP 2
-- If you see a row, skip to STEP 3

-- ==========================================
-- STEP 2: CREATE YOUR USER RECORD (ONLY IF STEP 1 RETURNED NO ROWS)
-- ==========================================

-- 2a. First, create a company (or use existing one)
INSERT INTO companies (name, settings)
VALUES ('My Company', '{}')
ON CONFLICT (id) DO NOTHING
RETURNING id;

-- 2b. Copy the company ID from above, then create your user record
-- IMPORTANT: Replace 'PASTE_COMPANY_ID_HERE' with the actual UUID from step 2a
INSERT INTO public.users (id, email, company_id)
VALUES (
  auth.uid(),
  auth.email(),
  'PASTE_COMPANY_ID_HERE'  -- REPLACE THIS WITH THE COMPANY ID FROM 2a
)
ON CONFLICT (id) DO NOTHING
RETURNING id, email, company_id;

-- Expected: Returns your user record with the linked company_id

-- ==========================================
-- STEP 3: VERIFY RLS POLICIES EXIST
-- ==========================================
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'invoices' 
  AND cmd = 'INSERT';

-- Expected: Should show "Authenticated users can insert invoices" with with_check = 'true'
-- If NO ROWS: You need to run the recreate_invoices_table.sql migration

-- ==========================================
-- STEP 4: TEST INSERT (After completing steps 1-3)
-- ==========================================
-- Get your company_id first
DO $$
DECLARE
  my_company_id UUID;
BEGIN
  -- Get your company_id
  SELECT company_id INTO my_company_id
  FROM public.users
  WHERE id = auth.uid();
  
  -- Show it
  RAISE NOTICE 'Your company_id is: %', my_company_id;
  
  -- Try to insert a test invoice
  INSERT INTO invoices (
    company_id,
    attachment_urls,
    mime_types,
    total,
    status,
    confidence
  ) VALUES (
    my_company_id,
    ARRAY['https://example.com/test.pdf'],
    ARRAY['application/pdf'],
    0,
    'inbox',
    '{"overall": 0, "fields": {}}'::jsonb
  );
  
  RAISE NOTICE 'SUCCESS! Test invoice created.';
END $$;

-- Expected: "SUCCESS! Test invoice created."
-- If ERROR: Copy the exact error message

-- ==========================================
-- STEP 5: CLEANUP TEST INVOICE
-- ==========================================
DELETE FROM invoices 
WHERE attachment_urls @> ARRAY['https://example.com/test.pdf'];
