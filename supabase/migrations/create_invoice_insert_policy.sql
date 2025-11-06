-- Migration: create_invoice_insert_policy.sql
-- Purpose: Allow authenticated users to INSERT invoices.
-- Run this in Supabase SQL Editor.

-- Permissive policy: allows any authenticated user to insert into invoices
CREATE POLICY "Enable insert for authenticated users only"
  ON public.invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Recommended safer alternative: restrict inserts so the inserted row's company_id
-- must match the authenticated user's company_id (prevents inserting for other companies)
-- Uncomment and run this instead of the permissive policy if you prefer the safer behavior.
--
-- CREATE POLICY "Users can insert invoices for their company"
--   ON public.invoices
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (
--     company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
--   );

-- Notes:
-- - After creating the policy, ensure RLS is enabled on the `invoices` table.
-- - If you used the permissive policy for testing, swap to the safer policy before deploying to production.
