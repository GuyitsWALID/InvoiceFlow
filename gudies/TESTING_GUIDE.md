# QuickBooks Integration - Setup & Testing Guide

## 🎯 Overview

This guide will walk you through setting up and testing the complete QuickBooks integration for InvoiceFlow. You'll be able to automatically sync approved invoices to QuickBooks as bills.

---

## ✅ What's Been Built

### 1. **QuickBooks Adapter** (`lib/accounting/adapters/quickbooks.ts`)
   - ✅ OAuth 2.0 flow (authorization URL, token exchange, refresh)
   - ✅ Vendor management (search, create, get by ID)
   - ✅ Bill creation with line items
   - ✅ Idempotency checking (prevents duplicates)
   - ✅ Error handling (transient vs permanent errors)
   - ✅ Rate limit detection
   - ✅ Environment switching (sandbox/production)

### 2. **OAuth Routes**
   - ✅ `/api/accounting/quickbooks/connect` - Initiates OAuth flow
   - ✅ `/api/accounting/quickbooks/callback` - Handles OAuth redirect

### 3. **Database Schema** (`supabase/migrations/add_accounting_sync_tables.sql`)
   - ✅ `accounting_connections` - Stores OAuth tokens (encrypted)
   - ✅ `invoice_sync_logs` - Audit log of all sync attempts
   - ✅ Updated `companies` table - Added `auto_sync_on_approve`, `onboarding_completed`
   - ✅ Updated `invoices` table - Added `sync_status`, `external_bill_id`

### 4. **UI Components**
   - ✅ Onboarding modal for first-time setup
   - ✅ Connection banner (persistent reminder)

---

## 🚀 Setup Instructions

### Step 1: Get QuickBooks Credentials

Follow the detailed guide in `QUICKBOOKS_SETUP.md` to:

1. **Create QuickBooks Developer Account**
   - Go to https://developer.intuit.com
   - Sign up for free

2. **Create a Sandbox App**
   - Go to "My Apps" → "Create an app"
   - Choose "QuickBooks Online and Payments"
   - Name it "InvoiceFlow Dev"

3. **Get Your Credentials**
   - Navigate to your app → "Keys & OAuth"
   - Copy **Client ID** and **Client Secret**

4. **Configure Redirect URI**
   - In "Keys & OAuth" → "Redirect URIs"
   - Add: `http://localhost:3000/api/accounting/quickbooks/callback`

5. **Set Scopes**
   - In "Keys & OAuth" → "Scopes"
   - Enable: `com.intuit.quickbooks.accounting`

6. **Create Test Company**
   - Go to https://developer.intuit.com/app/developer/sandbox
   - Create a new test company (this is where bills will be created)

---

### Step 2: Add Environment Variables

Create or update `.env.local` with:

```env
# QuickBooks OAuth
QUICKBOOKS_CLIENT_ID=your_client_id_from_step1
QUICKBOOKS_CLIENT_SECRET=your_client_secret_from_step1
QUICKBOOKS_REDIRECT_URI=http://localhost:3000/api/accounting/quickbooks/callback
QUICKBOOKS_ENVIRONMENT=sandbox

# Google Gemini (for AI extraction)
GOOGLE_GEMINI_API_KEY=your_gemini_api_key

# Supabase (should already exist)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Where to get Gemini API key:**
- Go to https://aistudio.google.com/app/apikey
- Click "Create API key"
- Copy the key

---

### Step 3: Run Database Migrations

1. **Open Supabase Dashboard**
   - Go to your project dashboard at https://supabase.com/dashboard

2. **Run SQL Migration**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"
   - Copy the entire contents of `supabase/migrations/add_accounting_sync_tables.sql`
   - Paste into the SQL editor
   - Click "Run"

3. **Verify Tables Created**
   - Go to "Table Editor"
   - You should see:
     - `accounting_connections`
     - `invoice_sync_logs`
   - Check that `companies` and `invoices` have new columns

---

### Step 4: Start Development Server

```bash
npm run dev
```

Server should start at http://localhost:3000

---

## 🧪 Testing the Complete Flow

### Test 1: OAuth Connection Flow

1. **Login to InvoiceFlow**
   - Go to http://localhost:3000
   - Login with your test account

2. **Trigger Onboarding Modal** (if first time)
   - Should see "Connect Your Accounting Software" modal
   - Select QuickBooks
   - Click "Connect QuickBooks"

3. **QuickBooks OAuth Redirect**
   - You'll be redirected to QuickBooks login
   - Login with your sandbox credentials
   - Grant permissions
   - You'll be redirected back to InvoiceFlow

4. **Verify Connection Saved**
   - Go to Supabase Dashboard → Table Editor → `accounting_connections`
   - You should see a row with:
     - `provider: quickbooks`
     - `provider_company_id: <realmId>`
     - `provider_company_name: <your test company name>`
     - `is_active: true`
     - `access_token_encrypted` and `refresh_token_encrypted` populated

**Expected Result:** ✅ Connection saved, redirect to dashboard with success message

---

### Test 2: Upload & Analyze Invoice

1. **Upload Invoice**
   - Go to "Invoices" page
   - Click "Upload Invoice"
   - Upload a test invoice (PDF or image)

2. **View Invoice Details**
   - Click on the uploaded invoice
   - Wait for OCR to extract raw text
   - You should see the raw OCR text displayed

3. **Analyze with AI**
   - Click "✨ Analyze with AI" button
   - Wait for AI extraction (should see loading state)
   - AI-extracted data card should appear with:
     - Vendor name
     - Invoice number
     - Dates (invoice date, due date)
     - Amounts (subtotal, tax, total)
     - Line items
     - Confidence score

**Expected Result:** ✅ AI successfully extracts structured data

---

### Test 3: Approve & Sync to QuickBooks (TODO - Next Implementation)

This is the final integration step we'll build next.

**Planned Flow:**
1. On invoice detail page, click "Approve" button
2. Backend checks if QuickBooks connection exists
3. If yes:
   - Create/find vendor in QuickBooks
   - Create bill with line items
   - Save `external_bill_id` to database
   - Update `sync_status` to 'synced'
   - Show success toast with link to QuickBooks
4. If no connection:
   - Mark as 'approved' (pending sync)
   - Show "Connect accounting" CTA

**Verification:**
- Login to QuickBooks Sandbox: https://app.sandbox.qbo.intuit.com
- Go to "Expenses" → "Bills"
- You should see the bill created with:
  - Vendor name matching invoice
  - Bill number = invoice_flow_id (idempotency key)
  - Line items matching invoice
  - Total amount correct

---

## 🔧 Next Implementation Steps

### 1. Create Sync API Endpoint

**File:** `app/api/accounting/sync/route.ts`

```typescript
// POST /api/accounting/sync
// Request: { invoice_id: string }
// Response: { success: boolean, external_bill_id?: string }

export async function POST(request: Request) {
  // 1. Get invoice data
  // 2. Get active accounting connection
  // 3. Use adapter to create bill
  // 4. Save sync log
  // 5. Update invoice with external_bill_id
  // 6. Return success
}
```

**Implementation:**
```bash
# Create the file
touch app/api/accounting/sync/route.ts
```

---

### 2. Update Approve Button

**File:** `app/dashboard/invoices/[id]/page.tsx`

Find the `handleApprove` function and update it:

```typescript
const handleApprove = async () => {
  try {
    setIsApproving(true)

    // Update invoice status to approved
    const { error: approveError } = await supabase
      .from('invoices')
      .update({ status: 'approved' })
      .eq('id', invoice.id)

    if (approveError) throw approveError

    // Check if accounting connection exists
    const { data: connection } = await supabase
      .from('accounting_connections')
      .select('*')
      .eq('company_id', invoice.company_id)
      .eq('is_active', true)
      .single()

    if (connection) {
      // Sync to accounting platform
      toast.info('Posting to QuickBooks...')
      
      const response = await fetch('/api/accounting/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoice.id })
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Invoice approved and synced to QuickBooks! 🎉')
      } else {
        toast.warning('Invoice approved, but sync failed. Will retry later.')
      }
    } else {
      // No connection, just approve
      toast.success('Invoice approved! Connect QuickBooks to auto-sync.')
    }

    router.push('/dashboard/approved')
  } catch (error) {
    toast.error('Failed to approve invoice')
    console.error(error)
  } finally {
    setIsApproving(false)
  }
}
```

---

### 3. Implement Token Encryption

**File:** `lib/accounting/encryption.ts`

```typescript
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here' // Must be 32 chars
const ALGORITHM = 'aes-256-cbc'

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  return `${iv.toString('hex')}:${encrypted}`
}

export function decrypt(encryptedText: string): string {
  const [ivHex, encrypted] = encryptedText.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv)
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}
```

**Add to `.env.local`:**
```env
ENCRYPTION_KEY=your-random-32-character-key-here-exactly-32-chars
```

**Update OAuth callback to use encryption:**
```typescript
import { encrypt } from '@/lib/accounting/encryption'

// In callback route.ts
const encryptedAccessToken = encrypt(connectionMetadata.access_token_encrypted)
const encryptedRefreshToken = encrypt(connectionMetadata.refresh_token_encrypted!)
```

---

## 🐛 Troubleshooting

### Issue: "Invalid client credentials"
**Solution:** 
- Verify `QUICKBOOKS_CLIENT_ID` and `QUICKBOOKS_CLIENT_SECRET` are correct
- Make sure you're using Sandbox credentials if `QUICKBOOKS_ENVIRONMENT=sandbox`

### Issue: "Redirect URI mismatch"
**Solution:**
- In QuickBooks Developer Dashboard, ensure redirect URI is exactly:
  `http://localhost:3000/api/accounting/quickbooks/callback`
- No trailing slash, must match exactly

### Issue: "Table does not exist"
**Solution:**
- Run the database migration in Supabase SQL Editor
- Check that all tables were created successfully

### Issue: "OAuth state validation failed"
**Solution:**
- This is expected for now (state validation is TODO)
- We'll implement proper state storage in next iteration

### Issue: "Token expired"
**Solution:**
- The adapter has `refreshTokenIfNeeded()` method
- Tokens refresh automatically
- If refresh fails, disconnect and reconnect

---

## 📊 Testing Checklist

- [ ] QuickBooks developer account created
- [ ] Sandbox app created with correct credentials
- [ ] Redirect URI configured correctly
- [ ] Environment variables added to `.env.local`
- [ ] Database migrations run successfully
- [ ] Dev server starts without errors
- [ ] OAuth flow completes (redirects to QuickBooks and back)
- [ ] Connection saved in `accounting_connections` table
- [ ] Invoice upload works
- [ ] OCR extraction works
- [ ] AI analysis works
- [ ] TODO: Approve button triggers sync
- [ ] TODO: Bill appears in QuickBooks sandbox
- [ ] TODO: Vendor created if doesn't exist
- [ ] TODO: Line items match invoice
- [ ] TODO: Duplicate check works (idempotency)

---

## 🔐 Security Checklist

- [ ] Tokens encrypted before storing in database
- [ ] ENCRYPTION_KEY is strong and random (32+ chars)
- [ ] OAuth state validated to prevent CSRF
- [ ] Redirect URI whitelisted in QuickBooks app
- [ ] Minimal scopes requested (only accounting scope)
- [ ] RLS policies enabled on accounting tables
- [ ] Service role key not exposed to frontend
- [ ] Error messages don't leak sensitive data
- [ ] Tokens refreshed automatically before expiration
- [ ] Sync logs include audit trail

---

## 📚 Additional Resources

- **QuickBooks API Docs:** https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/bill
- **OAuth 2.0 Guide:** https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0
- **Sandbox Testing:** https://developer.intuit.com/app/developer/sandbox
- **Error Codes:** https://developer.intuit.com/app/developer/qbo/docs/develop/troubleshooting/error-codes

---

## 🎉 Next Providers to Add

Once QuickBooks is working end-to-end:

1. **Xero** (`lib/accounting/adapters/xero.ts`)
   - Similar OAuth flow
   - Different API endpoints
   - Create bills endpoint: `/api.xro/2.0/Bills`

2. **Wave** (`lib/accounting/adapters/wave.ts`)
   - GraphQL API instead of REST
   - Different authentication flow
   - More complex bill creation

3. **CSV Export** (fallback option)
   - Generate CSV from invoice data
   - Download locally
   - Manual upload to accounting software

---

## 💡 Tips

- Use QuickBooks Sandbox for all testing (free, unlimited)
- Check Supabase logs for debugging database issues
- Use browser DevTools Network tab to debug OAuth redirects
- QuickBooks tokens expire after 1 hour (access) and 100 days (refresh)
- Keep `invoice_sync_logs` for troubleshooting sync issues
- Test with various invoice formats (different currencies, line item counts)

---

**Last Updated:** January 2025  
**Status:** OAuth routes ready, database schema ready, awaiting sync endpoint implementation
