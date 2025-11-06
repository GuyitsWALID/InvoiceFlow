-- Create Storage Bucket for Invoices
-- Run this in Supabase SQL Editor or Dashboard > Storage

-- Step 1: Create the bucket (if not already created through UI)
-- Go to Supabase Dashboard > Storage > Create a new bucket
-- Bucket name: invoices
-- Public: YES (or use signed URLs for private access)

-- Step 2: Set up Storage Policies for the invoices bucket

-- Allow authenticated users to upload files to their company folder
CREATE POLICY "Users can upload invoices to their company folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'invoices' 
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM users WHERE id = auth.uid()
  )
);

-- Allow authenticated users to view files from their company folder
CREATE POLICY "Users can view invoices from their company folder"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices' 
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM users WHERE id = auth.uid()
  )
);

-- Allow authenticated users to delete files from their company folder
CREATE POLICY "Users can delete invoices from their company folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'invoices' 
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM users WHERE id = auth.uid()
  )
);

-- Allow service role full access
CREATE POLICY "Service role has full access to invoices"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'invoices')
WITH CHECK (bucket_id = 'invoices');
