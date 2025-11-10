# 🚨 FIXING YOUR 403 ERROR - Quick Action Plan

## The Problem
You're seeing: `❌ Invoice insert FAILED: Object` with a 403 error.

This means **Row Level Security (RLS)** is blocking your invoice inserts.

## Most Likely Cause
**You don't have a user record in the `public.users` table** linking your authenticated account to a company.

The RLS policy for SELECT/UPDATE/DELETE checks:
```sql
company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
```

If you don't have a row in `public.users`, this subquery returns `NULL`, and RLS blocks the operation.

## ⚡ IMMEDIATE FIX (5 minutes)

### 1. Open Supabase Dashboard
- Go to your Supabase project
- Click **SQL Editor** in the left sidebar

### 2. Run IMMEDIATE_FIX.sql
- Open the file: `supabase/IMMEDIATE_FIX.sql`
- Copy **STEP 1** and paste into SQL Editor
- Click **RUN**

**What to expect:**
- **If you see a row** → Great! You have a user record. Skip to Step 4.
- **If you see NO ROWS** → This is the problem! Continue to Step 3.

### 3. Create Your User Record
In the SQL Editor, run **STEP 2** from `IMMEDIATE_FIX.sql`:

```sql
-- 2a. Create a company
INSERT INTO companies (name, settings)
VALUES ('My Company', '{}')
ON CONFLICT (id) DO NOTHING
RETURNING id;

-- 2b. Create your user record
-- REPLACE 'PASTE_COMPANY_ID_HERE' with the UUID from 2a above
INSERT INTO public.users (id, email, company_id)
VALUES (
  auth.uid(),
  auth.email(),
  'PASTE_COMPANY_ID_HERE'  -- REPLACE THIS!
)
ON CONFLICT (id) DO NOTHING
RETURNING id, email, company_id;
```

**Expected output:** Your user record with `id`, `email`, and `company_id`

### 4. Verify RLS Policies
Run **STEP 3** from `IMMEDIATE_FIX.sql`:

```sql
SELECT policyname, cmd, with_check
FROM pg_policies
WHERE tablename = 'invoices' AND cmd = 'INSERT';
```

**Expected:** Should show `"Authenticated users can insert invoices"` with `with_check = 'true'`

**If NO ROWS:**
- You need to run the migration: `supabase/migrations/recreate_invoices_table.sql`
- Copy the ENTIRE file contents
- Paste into SQL Editor → RUN

### 5. Test Insert
Run **STEP 4** from `IMMEDIATE_FIX.sql` (no changes needed - it auto-detects your company_id):

```sql
DO $$
DECLARE my_company_id UUID;
BEGIN
  SELECT company_id INTO my_company_id FROM public.users WHERE id = auth.uid();
  RAISE NOTICE 'Your company_id is: %', my_company_id;
  
  INSERT INTO invoices (
    company_id, attachment_urls, mime_types, total, status, confidence
  ) VALUES (
    my_company_id, ARRAY['https://example.com/test.pdf'], 
    ARRAY['application/pdf'], 0, 'inbox', '{"overall": 0, "fields": {}}'::jsonb
  );
  
  RAISE NOTICE 'SUCCESS! Test invoice created.';
END $$;
```

**Expected:** `SUCCESS! Test invoice created.`

### 6. Test Upload in Your App
```powershell
npm run dev
```

1. Open http://localhost:3000
2. Go to `/dashboard/inbox`
3. Click **Upload Invoice**
4. Select a local file
5. **Open browser console (F12)** and watch for:

**Success:**
```
🔍 Looking up user profile for: [your-user-id]
✅ User profile found: {user_id: "...", company_id: "..."}
Attempting to insert invoice: {company_id: "...", ...}
✅ Invoice created successfully: {id: "...", ...}
Triggering OCR for invoice: [invoice-id]
```

**Failure:**
```
❌ Failed to get user profile: {error: ..., user_id: "..."}
```
OR
```
❌ Invoice insert FAILED: {code: "42501", message: "..."}
```

## 🔍 Enhanced Error Logging

I've updated all three upload handlers (Local, Google Drive, Dropbox) to show:

1. **User lookup:** `🔍 Looking up user profile for: [user-id]`
2. **User found:** `✅ User profile found: {user_id, company_id}`
3. **User NOT found:** `❌ Failed to get user profile` with detailed error
4. **Insert attempt:** Shows the exact data being inserted
5. **Insert success:** `✅ Invoice created successfully`
6. **Insert failure:** `❌ Invoice insert FAILED` with code, message, details, hint

This will tell us EXACTLY where the problem is.

## 📋 Checklist

- [ ] Run STEP 1 in `IMMEDIATE_FIX.sql` - check if user record exists
- [ ] If no user record: Run STEP 2 to create company and user
- [ ] Run STEP 3 to verify RLS policies exist
- [ ] Run STEP 4 to test insert in SQL Editor
- [ ] Test upload in app with browser console open (F12)
- [ ] Check console logs for "✅ User profile found" or "❌ Failed to get user profile"
- [ ] Check console logs for "✅ Invoice created successfully" or "❌ Invoice insert FAILED"

## 🎯 What to Share With Me

After running the steps above, share:

1. **STEP 1 result:** Did you see a user record or NO ROWS?
2. **STEP 4 result:** Did the test insert succeed or fail?
3. **Browser console output:** Copy the entire console log from the upload attempt

This will tell me exactly what's wrong and how to fix it!

## 🔧 Alternative: Use Service Role Bypass (TEMPORARY)

If you need to test the app RIGHT NOW while debugging:

```javascript
// In browser console at /dashboard/inbox
const response = await fetch('/api/invoices/service-create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    company_id: 'YOUR_COMPANY_ID',  // Get from STEP 1
    attachment_urls: ['https://example.com/test.pdf'],
    mime_types: ['application/pdf'],
    total: 100.50
  })
});
const result = await response.json();
console.log(result);
```

This bypasses RLS entirely (uses service role), so if it works, you know the issue is RLS/auth related.

**⚠️ WARNING:** This endpoint should be removed before production!
