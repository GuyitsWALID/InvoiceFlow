-- ============================================
-- FINAL FIX: Invoice Upload & Display Issue
-- ============================================
-- Invoice is being created ✅
-- But not showing in inbox ❌
-- This is likely a SELECT RLS policy issue

-- Step 1: Verify the invoice was actually created
SELECT id, company_id, status, created_at, attachment_urls[1] as file
FROM invoices
WHERE id = 'a3133a08-c10e-40ab-8ac8-89eaa701332b';
-- Expected: Should show the invoice

-- Step 2: Check if your user can SELECT invoices
-- This query uses the same logic as your inbox page
SELECT 
  i.id,
  i.company_id,
  i.status,
  i.total,
  i.created_at
FROM invoices i
WHERE i.company_id = (
  SELECT company_id FROM public.users WHERE id = auth.uid()
)
AND i.status IN ('inbox', 'needs_review')
ORDER BY i.created_at DESC;
-- Expected: Should show all your invoices including the new one
-- If NO ROWS: The SELECT RLS policy is blocking you

-- Step 3: Check SELECT RLS policy
SELECT 
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'invoices' 
  AND cmd = 'SELECT';
-- Expected: Should show policy with qual checking company_id match

-- Step 4: Debug - Check what company_id the policy sees
SELECT 
  auth.uid() as my_user_id,
  (SELECT company_id FROM public.users WHERE id = auth.uid()) as my_company_id,
  (SELECT id FROM companies LIMIT 1) as sample_company_id;
-- This shows: your user ID, your company_id from users table, and a sample company

-- Step 5: If Step 2 returned NO ROWS, the issue is the SELECT policy
-- Let's check if the policy function is working correctly

-- Test if you can see invoices with company_id matching yours
DO $$
DECLARE
  my_company_id UUID;
  invoice_count INTEGER;
BEGIN
  -- Get your company_id
  SELECT company_id INTO my_company_id
  FROM public.users
  WHERE id = auth.uid();
  
  RAISE NOTICE 'Your company_id: %', my_company_id;
  
  -- Count invoices with your company_id
  SELECT COUNT(*) INTO invoice_count
  FROM invoices
  WHERE company_id = my_company_id;
  
  RAISE NOTICE 'Invoices with your company_id: %', invoice_count;
  
  -- Try to select them (this will use RLS)
  PERFORM id FROM invoices
  WHERE company_id = my_company_id
  AND status IN ('inbox', 'needs_review');
  
  RAISE NOTICE 'SELECT with RLS succeeded!';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'SELECT with RLS failed: %', SQLERRM;
END $$;

-- ============================================
-- FIX: If SELECT is blocked, add this policy
-- ============================================
-- This is more permissive - allows any authenticated user to see invoices in their company
DROP POLICY IF EXISTS "Authenticated users can select invoices in their company" ON public.invoices;

CREATE POLICY "Authenticated users can select invoices in their company"
  ON public.invoices
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

-- Verify the new policy
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'invoices' AND cmd = 'SELECT';

-- ============================================
-- TEST: Try selecting invoices again
-- ============================================
SELECT 
  id,
  company_id,
  status,
  invoice_number,
  total,
  created_at
FROM invoices
WHERE company_id IN (
  SELECT company_id FROM public.users WHERE id = auth.uid()
)
AND status IN ('inbox', 'needs_review')
ORDER BY created_at DESC
LIMIT 10;
-- Expected: Should now show your invoices!
