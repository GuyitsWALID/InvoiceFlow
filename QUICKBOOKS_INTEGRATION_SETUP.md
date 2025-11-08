# QuickBooks Integration - Setup & Testing Guide

## ✅ What's Been Completed

1. **QuickBooks OAuth Routes**
   - `/api/accounting/quickbooks/connect` - Initiates OAuth flow
   - `/api/accounting/quickbooks/callback` - Handles OAuth redirect

2. **Sync API Endpoint**
   - `/api/accounting/sync` - Syncs approved invoices to QuickBooks/Excel

3. **Settings Page**
   - Full UI for managing accounting connections
   - Connect/disconnect QuickBooks
   - View sync logs
   - Support for QuickBooks, Xero, Wave, and Excel

4. **Invoice Approve Integration**
   - Auto-syncs to connected accounting platform on approval
   - Shows success/error toasts
   - Provides direct link to created bill in QuickBooks

5. **Database Schema**
   - `accounting_connections` table
   - `invoice_sync_logs` table
   - Updated `invoices` table with sync fields

## 🚀 Next Steps

### Step 1: Run Database Migrations

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the entire contents of `supabase/migrations/add_accounting_sync_tables.sql`
6. Paste into the SQL Editor
7. Click **Run** (or press Ctrl+Enter)
8. Verify you see success messages

### Step 2: Start Development Server

```bash
npm run dev
```

### Step 3: Test QuickBooks OAuth Connection

1. Open http://localhost:3000
2. Login to your account
3. Navigate to **Settings** page (should be in your dashboard nav)
4. Go to the **Integrations** tab
5. Find **QuickBooks** in the available integrations
6. Click **Connect QuickBooks**

**What should happen:**
- You'll be redirected to QuickBooks authorization page
- Login with your QuickBooks sandbox account
- Select a company to connect
- Click **Authorize**
- You'll be redirected back to Settings with success toast
- QuickBooks should now appear in "Connected Accounting Software" section

**If you see errors:**
- Check browser console for errors
- Check terminal for server-side errors
- Verify your `.env.local` has all QuickBooks credentials
- Make sure the redirect URI in QuickBooks Developer Portal matches exactly: `http://localhost:3000/api/accounting/quickbooks/callback`

### Step 4: Test Invoice Sync Flow

1. **Upload an Invoice**
   - Go to your inbox/upload page
   - Upload a test invoice PDF

2. **Analyze with AI**
   - Click "Analyze with AI" button
   - Wait for extraction to complete
   - Verify extracted data looks correct

3. **Approve Invoice**
   - Click **Approve** button
   - Watch for toast notifications:
     - "✅ Invoice approved successfully!"
     - "Syncing to QuickBooks..." (loading)
     - "🎉 Synced to QuickBooks!" (success)
   - If sync succeeds, you'll get a link to view the bill in QuickBooks

4. **Verify in QuickBooks Sandbox**
   - Open https://app.sandbox.qbo.intuit.com/
   - Login to your sandbox company
   - Go to **Expenses** → **Vendors**
   - Find the vendor from your invoice (should be created if new)
   - Go to **Expenses** → **Bills**
   - Find your synced bill
   - Verify:
     - Bill number matches invoice number
     - Amount matches
     - Line items are correct
     - Dates are correct

### Step 5: Check Sync Logs

1. Go back to **Settings** → **Sync Logs** tab
2. You should see your sync attempt listed with:
   - Invoice number
   - Provider (QuickBooks)
   - Status (success/failed)
   - External Bill ID
   - Timestamp
3. Click on bill ID or URL to view in QuickBooks

## 🐛 Troubleshooting

### "No active accounting connection found"
- Go to Settings and verify QuickBooks is connected
- Check that the connection shows as active
- Try disconnecting and reconnecting

### "Failed to sync: 401 Unauthorized"
- Your access token may have expired
- The system should automatically refresh it
- If it keeps failing, disconnect and reconnect QuickBooks

### "Failed to sync: Vendor not found"
- This shouldn't happen as the adapter creates vendors automatically
- Check QuickBooks sandbox for duplicate vendors
- Verify vendor name doesn't have special characters

### OAuth redirect doesn't work
- Verify `QUICKBOOKS_REDIRECT_URI` in `.env.local` matches exactly what's in QuickBooks Developer Portal
- Make sure you're using `http://localhost:3000` not `http://127.0.0.1:3000`
- Clear browser cookies and try again

### "Realm ID not found"
- Make sure you selected a company during OAuth flow
- Check that the callback route is receiving `realmId` parameter
- Look in browser console for the callback URL parameters

## 📊 Testing Checklist

- [ ] Database migrations run successfully
- [ ] Settings page loads without errors
- [ ] QuickBooks Connect button works
- [ ] OAuth flow completes successfully
- [ ] Connection appears in "Connected" section
- [ ] Can disconnect and reconnect
- [ ] Invoice upload works
- [ ] AI analysis extracts data correctly
- [ ] Approve button triggers sync
- [ ] Sync logs show in Settings
- [ ] Bill appears in QuickBooks sandbox
- [ ] Vendor was created/matched correctly
- [ ] Bill data matches invoice data

## 🎯 What Happens When You Approve an Invoice

1. **Invoice Status Update**
   - Invoice marked as `approved`
   - `reviewed_at` timestamp set

2. **Connection Check**
   - System checks for active accounting connection
   - Uses default connection if multiple exist

3. **Sync Process** (if connection exists)
   - Loads QuickBooksAdapter with saved tokens
   - Prepares bill payload from invoice data
   - Searches for vendor (by name)
   - Creates vendor if not found
   - Creates bill with line items
   - Returns bill ID and URL

4. **Token Refresh** (if needed)
   - If access token expired, automatically refreshes
   - Updates database with new tokens
   - Retries bill creation

5. **Database Updates**
   - Saves sync log (success or failure)
   - Updates invoice with:
     - `sync_status: 'synced'`
     - `external_bill_id`
     - `external_bill_url`
     - `last_synced_at`

6. **User Feedback**
   - Shows success toast with link to bill
   - Or shows error message if sync failed
   - Redirects to inbox after 2 seconds

## 📝 Notes

- **Sandbox vs Production**: Currently set to sandbox. Change `QUICKBOOKS_ENVIRONMENT=production` when ready to go live.
- **Token Encryption**: For production, implement proper token encryption (currently stored in plain text).
- **Rate Limits**: QuickBooks has rate limits (500 requests/minute). Implement queuing for bulk syncs.
- **Webhooks**: Consider implementing QuickBooks webhooks for real-time updates.
- **Multiple Connections**: Currently supports one default connection per company. Can extend to support multiple.

## 🔐 Security Considerations

1. **Token Storage**
   - Currently tokens are stored in plain text
   - For production, encrypt tokens using the `ENCRYPTION_KEY`
   - Consider using a KMS (Key Management Service)

2. **State Token**
   - OAuth state token is generated but not validated in callback
   - Add validation to prevent CSRF attacks

3. **RLS Policies**
   - Database has Row Level Security enabled
   - Users can only access their company's connections

## 📚 Additional Resources

- [QuickBooks API Documentation](https://developer.intuit.com/app/developer/qbo/docs/get-started)
- [OAuth 2.0 Guide](https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0)
- [QuickBooks Sandbox](https://developer.intuit.com/app/developer/qbo/docs/develop/sandboxes)

## 🎉 Success Criteria

Your integration is working correctly when:
1. ✅ You can connect QuickBooks from Settings
2. ✅ Connection persists after page refresh
3. ✅ Approving an invoice automatically creates a bill in QuickBooks
4. ✅ Bill data matches invoice data exactly
5. ✅ Sync logs show successful syncs
6. ✅ You can view the bill in QuickBooks sandbox
7. ✅ Vendors are created automatically when needed
8. ✅ Token refresh works automatically

---

**Need Help?**
- Check browser console for client-side errors
- Check terminal for server-side errors
- Look at Supabase logs for database errors
- Review sync logs in Settings page
