# InvoiceFlow Upload Fix Guide

## Current Status ✅
- **TypeScript errors:** FIXED ✅
- **Suspense boundary:** IMPLEMENTED ✅
- **Detailed error logging:** ADDED ✅
- **Upload handlers:** ALL UPDATED ✅

## Issue Summary
Invoices are uploading to Supabase Storage successfully, but failing to create records in the `invoices` table with a 403 error: "new row violates row-level security policy for table 'invoices'".

## Root Cause Analysis
The 403 error indicates one of these issues:
1. **Migration not run:** The `recreate_invoices_table.sql` migration hasn't been executed in Supabase
2. **Missing user record:** The `public.users` table doesn't have a row for your authenticated user
3. **Session issue:** The authentication session token isn't being sent properly
4. **Policy mismatch:** The RLS policy conditions don't match the insert data

## Step-by-Step Fix

### Step 1: Run the Database Migration
1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Open the file: `supabase/migrations/recreate_invoices_table.sql`
4. Copy the ENTIRE contents
5. Paste into SQL Editor
6. Click **Run**
7. Expected output: "Success. No rows returned"

### Step 2: Run Diagnostic Queries
1. Still in SQL Editor, open: `supabase/diagnostics.sql`
2. Run queries **1-5** one at a time
3. **CRITICAL:** Note down your `company_id` from query #5

### Step 3: Check User Record
If query #5 (public.users) returns **NO ROWS**:
```sql
-- You need to create a user record linking your auth user to a company
-- First, find your auth user ID from query #4

-- Then create a company (if you don't have one):
INSERT INTO companies (name, settings)
VALUES ('My Company', '{}')
RETURNING id;

-- Note the company ID from above, then create the user record:
INSERT INTO public.users (id, email, company_id)
VALUES (
  'YOUR_AUTH_USER_ID',  -- From query #4
  'your@email.com',      -- Your email
  'YOUR_COMPANY_ID'      -- From the company insert above
);
```

### Step 4: Test Insert Permission
1. In `supabase/diagnostics.sql`, find query #6
2. Replace `'YOUR_COMPANY_ID'` with your actual company_id from Step 2
3. Run the query
4. **If it succeeds:** RLS is working! The issue is in the frontend code
5. **If it fails:** RLS policy is still blocking. Continue to Step 5

### Step 5: Verify RLS Policies
Run this query to see the exact INSERT policy:
```sql
SELECT 
  policyname,
  permissive,
  roles,
  with_check
FROM pg_policies
WHERE tablename = 'invoices' 
  AND cmd = 'INSERT';
```

Expected output:
```
policyname: "Enable insert for authenticated users only"
permissive: "PERMISSIVE"
roles: {authenticated}
with_check: "true"
```

If this doesn't match, re-run the migration from Step 1.

### Step 6: Test Frontend Upload
1. Build and start your Next.js app:
   ```powershell
   npm run dev
   ```

2. Open browser console (F12)
3. Try uploading a local invoice file
4. Watch the console for these logs:
   - "Attempting to insert invoice:" (shows the insert payload)
   - "✅ Invoice created successfully:" (success)
   - "❌ Invoice insert FAILED:" (failure with detailed error)

### Step 7: Analyze Console Output

**If you see "✅ Invoice created successfully:"**
- The upload is working! Check the inbox page
- If inbox still shows "No invoices found", the issue is in the SELECT query
- Run diagnostic query #8 to see if invoices exist in the database

**If you see "❌ Invoice insert FAILED:"**
- Copy the entire error object from the console
- Check the `code` field:
  - `42501`: RLS policy violation (back to Step 3-5)
  - `23503`: Foreign key violation (check company_id exists)
  - `23505`: Duplicate key (check for unique constraint issues)

### Step 8: Emergency Bypass (Testing Only)
If you need to test the app while debugging RLS:
1. Use the service role bypass endpoint (dev-only):
   ```javascript
   // In browser console
   const response = await fetch('/api/invoices/service-create', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       company_id: 'YOUR_COMPANY_ID',
       attachment_urls: ['https://example.com/test.pdf'],
       mime_types: ['application/pdf'],
       total: 0
     })
   });
   const result = await response.json();
   console.log(result);
   ```

2. **If this succeeds:** Proves the database accepts inserts (issue is RLS/auth)
3. **If this fails:** Deeper database issue (constraints, triggers, etc.)

### Step 9: Verify Inbox Page
1. Navigate to `/dashboard/inbox`
2. The page queries:
   ```sql
   SELECT * FROM invoices 
   WHERE company_id = 'YOUR_COMPANY_ID'
     AND status IN ('inbox', 'needs_review')
   ```
3. If invoices exist but don't show, check RLS SELECT policy

## Common Issues & Solutions

### Issue: "Cannot find user record"
**Solution:** Run Step 3 to create the user record in `public.users`

### Issue: "403 Forbidden" even with WITH CHECK (true)
**Solution:** 
- The policy might not be applied. Run Step 1 again.
- Check if RLS is enabled: `SELECT relrowsecurity FROM pg_class WHERE relname = 'invoices';`

### Issue: "Files upload but no invoice records"
**Solution:**
- Run diagnostic query #8 to check if invoices exist
- If they exist, the SELECT policy might be blocking the inbox query
- Check console logs for exact insert error

### Issue: "useSearchParams error"
**Solution:** Already fixed! The component now has proper Suspense boundaries.

## Verification Checklist
- [ ] `recreate_invoices_table.sql` migration executed successfully
- [ ] Row exists in `public.users` with your `auth.uid()` and `company_id`
- [ ] RLS policies show 5 policies with INSERT having `with_check: true`
- [ ] Test insert (query #6) succeeds
- [ ] Frontend console shows "✅ Invoice created successfully"
- [ ] Invoices appear in `/dashboard/inbox`
- [ ] OCR processing triggers automatically (check "Triggering OCR for invoice:" log)

## Next Steps After Upload Works
Once invoices are successfully uploading and appearing in the inbox:

1. **Test OCR Processing:**
   - Upload a real invoice (PDF or image)
   - Check console for "Processing invoice <id> with Tesseract..."
   - Verify invoice status changes from 'inbox' → 'needs_review'
   - Check `extracted_data` column is populated

2. **Add extracted_data Column (if missing):**
   ```sql
   -- Run in Supabase SQL Editor
   ALTER TABLE invoices 
   ADD COLUMN IF NOT EXISTS extracted_data JSONB DEFAULT '{}';
   ```

3. **Move to Phase 2: Review Interface**
   - Create invoice detail page with PDF viewer + editable form
   - Display OCR results with confidence scores
   - Allow editing and approval

## Support
If you're still stuck after following all steps:
1. Copy the output from diagnostic queries 1-8
2. Copy the browser console error (the full JSON object)
3. Share both for further debugging
