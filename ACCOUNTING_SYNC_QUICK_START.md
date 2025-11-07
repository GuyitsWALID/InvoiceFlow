# Accounting Sync Feature - Quick Start Guide

## ✅ What's Been Set Up

I've created the foundation for auto-syncing approved invoices to accounting platforms. Here's what's ready:

### 1. **Implementation Plan** (`ACCOUNTING_SYNC_IMPLEMENTATION.md`)
   - Complete database schema for connections and sync logs
   - File structure and architecture
   - 5-week implementation roadmap
   - Security considerations and error handling strategies

### 2. **Base Adapter Interface** (`lib/accounting/adapters/base.ts`)
   - TypeScript interfaces for all accounting providers
   - Base adapter class that QuickBooks, Xero, Wave will implement
   - Provider configuration (OAuth URLs, scopes, colors)
   - Factory function to get the right adapter
   - Error handling types (transient vs permanent errors)

### 3. **Onboarding Modal** (`components/onboarding/accounting-setup-modal.tsx`)
   - Beautiful modal for first-time setup
   - Shows QuickBooks, Xero, Wave, CSV export options
   - "Skip for now" functionality
   - Loading states and error handling
   - Recommended badges

### 4. **Connection Banner** (`components/onboarding/accounting-connection-banner.tsx`)
   - Persistent banner for users who skipped
   - "Connect now" CTA
   - Dismissible
   - Blue theme to match connection messaging

## 📋 Next Steps to Implement

### Immediate (Before Testing):
1. **Install Alert Component**
   ```bash
   npx shadcn@latest add alert
   ```

2. **Run Database Migrations**
   - Copy SQL from `ACCOUNTING_SYNC_IMPLEMENTATION.md`
   - Create migration files
   - Run migrations in Supabase

3. **Add Missing shadcn Components**
   ```bash
   npx shadcn@latest add dialog
   ```

### Short-term (Week 1-2):

4. **Create API Routes**
   ```
   app/api/accounting/
   ├── connect/route.ts       # OAuth callback
   ├── disconnect/route.ts    # Disconnect provider
   ├── sync/route.ts          # Manual sync
   └── status/route.ts        # Connection status
   ```

5. **Implement QuickBooks Adapter**
   - OAuth flow (sandbox)
   - Vendor creation
   - Bill creation
   - Attachment upload
   - Test with real invoices

6. **Build Sync Queue System**
   - Queue management
   - Exponential backoff retry
   - Status tracking
   - Background processing

### Medium-term (Week 3-4):

7. **Add Integration to Dashboard**
   - Show onboarding modal on first login
   - Add banner if skipped
   - Update Settings page with Integrations tab

8. **Integrate with Approve Flow**
   - When user clicks "Approve", check for connection
   - If connected → Auto-sync to QuickBooks
   - If not connected → Show "Pending Sync" status
   - Add sync status badges to invoice cards

9. **Build Xero & Wave Adapters**
   - Repeat pattern from QuickBooks
   - Different OAuth flows
   - Different API endpoints

### Long-term (Week 5+):

10. **Polish & Production**
    - Comprehensive error messages
    - Audit logging
    - Performance monitoring
    - Security audit
    - User documentation

## 🎯 Key Features Ready to Build

### Onboarding Flow
```typescript
// When user first signs in
const [showOnboarding, setShowOnboarding] = useState(false)

useEffect(() => {
  async function checkOnboarding() {
    const { data: company } = await supabase
      .from('companies')
      .select('onboarding_completed')
      .single()
    
    if (!company?.onboarding_completed) {
      setShowOnboarding(true)
    }
  }
  checkOnboarding()
}, [])

// Show modal
<AccountingSetupModal
  isOpen={showOnboarding}
  onClose={() => setShowOnboarding(false)}
  onSkip={async () => {
    // Mark as skipped, show banner
    await supabase
      .from('companies')
      .update({ onboarding_completed: true })
  }}
  onConnect={async (provider) => {
    // Start OAuth flow
    window.location.href = `/api/accounting/connect?provider=${provider}`
  }}
/>
```

### Approve with Sync
```typescript
const handleApprove = async () => {
  // Check if accounting connection exists
  const { data: connection } = await supabase
    .from('accounting_connections')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .eq('is_default', true)
    .single()

  if (connection) {
    // Auto-sync
    setAnalyzing(true)
    const toastId = toast.loading('Posting to QuickBooks...')
    
    const response = await fetch('/api/accounting/sync', {
      method: 'POST',
      body: JSON.stringify({ invoice_id: invoiceId })
    })
    
    if (response.ok) {
      toast.success('Invoice posted to QuickBooks ✓', { id: toastId })
      // Update status to 'synced'
    } else {
      toast.error('Posting failed. Retry?', { id: toastId })
    }
  } else {
    // No connection - mark as pending sync
    toast.success('Invoice approved. Connect accounting tool to sync.')
    // Update status to 'approved' (not synced)
  }
}
```

## 🗄️ Database Schema Summary

You'll need to create these tables:

1. **`accounting_connections`** - Stores provider OAuth tokens
2. **`invoice_sync_logs`** - Tracks every sync attempt
3. **`companies`** - Add columns for sync settings
4. **`invoices`** - Add columns for sync status

See `ACCOUNTING_SYNC_IMPLEMENTATION.md` for full SQL.

## 🔐 Security Checklist

- [ ] Encrypt OAuth tokens with KMS before storing
- [ ] Request minimal OAuth scopes only
- [ ] Auto-refresh tokens before expiry
- [ ] Log all sync attempts with timestamps
- [ ] Use invoice_id as idempotency key
- [ ] Rate limit API calls per provider limits
- [ ] Sanitize error messages (no token leaks)

## 📚 Provider Documentation Links

- **QuickBooks**: https://developer.intuit.com/app/developer/qbo/docs/get-started
- **Xero**: https://developer.xero.com/documentation/
- **Wave**: https://developer.waveapps.com/hc/en-us

## 🎨 UI Components Ready

✅ **Onboarding Modal** - First-time setup
✅ **Connection Banner** - Persistent reminder
⏳ **Sync Status Badge** - Show sync state on invoices
⏳ **Sync Log Viewer** - Debug sync attempts
⏳ **Integration Settings Page** - Manage connections

## 💡 Tips for Implementation

1. **Start with QuickBooks Sandbox**
   - Free to test
   - No real money involved
   - Full API access

2. **Use Idempotency Keys**
   - Always use invoice.id as external_reference
   - Prevents duplicate bills if retry fails

3. **Handle Token Refresh**
   - QuickBooks tokens expire in 1 hour
   - Auto-refresh 5 minutes before expiry

4. **Test Error Scenarios**
   - Network timeout
   - Rate limiting
   - Invalid vendor
   - Duplicate invoice number

## 🚀 Testing Plan

1. **Manual Testing**
   - Connect QuickBooks sandbox
   - Upload invoice
   - Approve invoice
   - Verify bill created in QuickBooks
   - Check PDF attachment
   - Test retry on failure

2. **Automated Testing**
   - Mock provider responses
   - Test idempotency
   - Test retry logic
   - Test token refresh

## 📞 Support

If you need help with:
- QuickBooks OAuth setup
- Adapter implementation
- Database migrations
- Error handling

Just ask and I'll provide detailed code examples!

---

**Status**: Foundation complete ✅  
**Next**: Install missing components → Database migrations → QuickBooks adapter
