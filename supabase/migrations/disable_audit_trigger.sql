-- Temporary fix: Disable audit trigger
-- Run this in Supabase SQL Editor if you don't need audit logging right now

-- Drop the audit trigger from invoices table
DROP TRIGGER IF EXISTS audit_invoices ON public.invoices;

-- You can re-enable it later after fixing the audit_logs RLS policies
-- CREATE TRIGGER audit_invoices 
--   AFTER INSERT OR UPDATE OR DELETE ON public.invoices
--   FOR EACH ROW 
--   EXECUTE FUNCTION create_audit_log();
