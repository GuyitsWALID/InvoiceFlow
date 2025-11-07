-- Fix for audit_logs RLS blocking invoice inserts
-- Run this in Supabase SQL Editor

-- Check current audit_logs policies
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'audit_logs';

-- Option 1: Allow authenticated users to insert audit logs
CREATE POLICY "Allow authenticated users to insert audit logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Option 2: If you want audit logs to only be created by triggers/system
-- You might need to temporarily disable RLS on audit_logs
-- (Not recommended for production, but fine for development)
-- ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;

-- Verify the policy was created
SELECT policyname, cmd, with_check
FROM pg_policies
WHERE tablename = 'audit_logs' AND cmd = 'INSERT';
