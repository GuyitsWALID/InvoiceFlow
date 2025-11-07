# QuickBooks Sandbox Setup Guide

## Step 1: Create Developer Account

1. **Go to QuickBooks Developer Portal**
   - URL: https://developer.intuit.com/
   - Click "Sign up" (top right)
   - Use your email or existing Intuit account

2. **Verify Email**
   - Check your email for verification link
   - Click to verify your account

## Step 2: Create a Sandbox App

1. **Navigate to Dashboard**
   - After login, go to: https://developer.intuit.com/app/developer/dashboard
   - Click "Create an app" button

2. **Select Platform**
   - Choose "QuickBooks Online and Payments"
   - Click "Select"

3. **App Information**
   - **App Name**: "InvoiceFlow Dev" (or your choice)
   - **Description**: "Automated invoice processing and syncing"
   - Click "Create app"

4. **Get Your Credentials**
   - You'll see "Keys & credentials" tab
   - **Development** section shows:
     - **Client ID**: Copy this (starts with AB...)
     - **Client Secret**: Copy this (keep secret!)
   
   Save these to your `.env.local`:
   ```env
   QUICKBOOKS_CLIENT_ID=your_client_id_here
   QUICKBOOKS_CLIENT_SECRET=your_client_secret_here
   QUICKBOOKS_REDIRECT_URI=http://localhost:3000/api/accounting/quickbooks/callback
   QUICKBOOKS_ENVIRONMENT=sandbox
   ```

## Step 3: Configure Redirect URI

1. **In Keys & Credentials tab**
   - Scroll to "Redirect URIs" section
   - Click "Add URI"
   - Enter: `http://localhost:3000/api/accounting/quickbooks/callback`
   - Click "Save"

2. **For Production (later)**
   - Add: `https://yourdomain.com/api/accounting/quickbooks/callback`

## Step 4: Set Scopes

QuickBooks will show required scopes during OAuth. We need:
- `com.intuit.quickbooks.accounting` - Read/write access to accounting data

These are automatically requested in the OAuth URL we'll build.

## Step 5: Create Test Company (Sandbox)

1. **Go to Sandbox Test Companies**
   - In developer dashboard, click "Sandbox" in left menu
   - Click "Create a test company"

2. **Select Company Type**
   - Choose "Sample Company" (pre-filled with data)
   - Or "Start from scratch" (empty company)
   - Click "Create"

3. **Access Sandbox Company**
   - Click "Sign in to company"
   - This opens QuickBooks sandbox with test data
   - Note: This is where your invoices will appear!

## Step 6: Test Credentials

You should now have:
- ✅ Client ID
- ✅ Client Secret  
- ✅ Redirect URI configured
- ✅ Sandbox company created

## Important URLs for Testing

**OAuth Authorization URL:**
```
https://appcenter.intuit.com/connect/oauth2
```

**API Base URL (Sandbox):**
```
https://sandbox-quickbooks.api.intuit.com/v3
```

**Token Endpoint:**
```
https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer
```

## Next Steps

After getting credentials:
1. Add to `.env.local`
2. Implement OAuth flow (I'll provide code)
3. Test connection
4. Create vendor in sandbox
5. Create bill in sandbox

## Troubleshooting

**Can't find credentials?**
- Go to Dashboard → My Apps → Click your app → Keys & credentials

**Redirect URI mismatch?**
- Make sure URI in code matches exactly what's in developer portal
- Include http:// or https://
- No trailing slashes

**Token errors?**
- Make sure you're using sandbox URLs for sandbox environment
- Check that scopes are correct
- Verify client ID/secret are copied correctly

## QuickBooks API Documentation

- **Getting Started**: https://developer.intuit.com/app/developer/qbo/docs/get-started
- **OAuth 2.0**: https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0
- **API Reference**: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/bill
- **Vendor API**: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/vendor

---

✅ **Status**: Complete this setup, then I'll provide the adapter code!
