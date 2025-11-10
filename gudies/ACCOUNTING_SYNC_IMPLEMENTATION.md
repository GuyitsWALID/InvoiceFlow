# Auto-Sync Approved Invoices Implementation Plan

## Overview
This document outlines the implementation of automatic syncing of approved invoices to accounting platforms (QuickBooks, Xero, Wave, etc.).

## Database Schema Updates Needed

### 1. New Table: `accounting_connections`
```sql
CREATE TABLE accounting_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'quickbooks', 'xero', 'wave', 'csv'
  provider_company_id VARCHAR(255), -- External company ID in provider
  provider_company_name VARCHAR(255),
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[], -- OAuth scopes granted
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- Default provider for company
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  metadata JSONB, -- Provider-specific config
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, provider)
);

CREATE INDEX idx_accounting_connections_company ON accounting_connections(company_id);
CREATE INDEX idx_accounting_connections_active ON accounting_connections(company_id, is_active);
```

### 2. New Table: `invoice_sync_logs`
```sql
CREATE TABLE invoice_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES accounting_connections(id) ON DELETE CASCADE,
  sync_status VARCHAR(50) NOT NULL, -- 'pending', 'in_progress', 'synced', 'failed'
  attempt_number INT DEFAULT 1,
  external_bill_id VARCHAR(255), -- Provider's bill/expense ID
  external_vendor_id VARCHAR(255), -- Provider's vendor ID
  external_bill_url TEXT, -- Link to view in provider
  provider_response JSONB, -- Full response from provider
  error_code VARCHAR(100),
  error_message TEXT,
  retry_after TIMESTAMPTZ, -- When to retry if failed
  synced_at TIMESTAMPTZ, -- When successfully synced
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoice_sync_logs_invoice ON invoice_sync_logs(invoice_id);
CREATE INDEX idx_invoice_sync_logs_status ON invoice_sync_logs(sync_status);
CREATE INDEX idx_invoice_sync_logs_retry ON invoice_sync_logs(sync_status, retry_after);
```

### 3. Update `companies` table
```sql
ALTER TABLE companies ADD COLUMN auto_sync_on_approve BOOLEAN DEFAULT true;
ALTER TABLE companies ADD COLUMN auto_sync_pending_on_connect BOOLEAN DEFAULT true;
ALTER TABLE companies ADD COLUMN sync_retry_enabled BOOLEAN DEFAULT true;
ALTER TABLE companies ADD COLUMN sync_retry_max_attempts INT DEFAULT 3;
ALTER TABLE companies ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
```

### 4. Update `invoices` table
```sql
ALTER TABLE invoices ADD COLUMN sync_status VARCHAR(50) DEFAULT 'not_synced';
-- Values: 'not_synced', 'pending', 'syncing', 'synced', 'failed'
ALTER TABLE invoices ADD COLUMN external_bill_id VARCHAR(255);
ALTER TABLE invoices ADD COLUMN external_bill_url TEXT;
ALTER TABLE invoices ADD COLUMN last_sync_attempt_at TIMESTAMPTZ;
```

## File Structure

```
lib/
├── accounting/
│   ├── adapters/
│   │   ├── base.ts              # Base adapter interface
│   │   ├── quickbooks.ts        # QuickBooks implementation
│   │   ├── xero.ts              # Xero implementation
│   │   ├── wave.ts              # Wave implementation
│   │   └── csv.ts               # CSV export implementation
│   ├── sync-queue.ts            # Sync queue management
│   ├── retry-logic.ts           # Exponential backoff retry
│   ├── mapping.ts               # InvoiceFlow → Provider mapping
│   └── encryption.ts            # Token encryption helpers
│
app/
├── api/
│   ├── accounting/
│   │   ├── connect/route.ts     # OAuth callback handler
│   │   ├── disconnect/route.ts  # Disconnect provider
│   │   ├── sync/route.ts        # Manual sync trigger
│   │   └── status/route.ts      # Connection status
│   └── webhooks/
│       └── accounting/route.ts  # Provider webhooks
│
components/
├── onboarding/
│   └── accounting-setup-modal.tsx
├── integrations/
│   ├── accounting-card.tsx
│   ├── sync-status-badge.tsx
│   └── sync-log-viewer.tsx
└── invoices/
    └── sync-actions.tsx
```

## Implementation Phases

### Phase 1: Foundation (Week 1)
- ✅ Create database migrations
- ✅ Build base adapter interface
- ✅ Set up encryption utilities
- ✅ Create onboarding modal component
- ✅ Add integration settings page

### Phase 2: QuickBooks Integration (Week 2)
- ✅ Implement QuickBooks OAuth flow
- ✅ Build QuickBooks adapter (vendor + bill creation)
- ✅ Add idempotency checks
- ✅ Test sandbox integration
- ✅ Add attachment upload support

### Phase 3: Sync Queue & Retry Logic (Week 3)
- ✅ Build sync queue system
- ✅ Implement exponential backoff retry
- ✅ Add sync status tracking
- ✅ Build sync log viewer UI
- ✅ Add manual retry actions

### Phase 4: Additional Providers (Week 4)
- ✅ Implement Xero adapter
- ✅ Implement Wave adapter
- ✅ Add CSV export option
- ✅ Multi-provider testing

### Phase 5: Polish & Production (Week 5)
- ✅ Error message improvements
- ✅ Audit trail & logging
- ✅ Performance optimization
- ✅ Security audit
- ✅ Documentation

## Key Components to Build

### 1. Onboarding Modal (`components/onboarding/accounting-setup-modal.tsx`)
- Shows after first sign-in
- Provider selection cards
- Skip option with banner reminder
- Stores onboarding_completed flag

### 2. Accounting Adapter Interface (`lib/accounting/adapters/base.ts`)
```typescript
interface AccountingAdapter {
  connect(credentials: OAuthCredentials): Promise<ConnectionMetadata>
  disconnect(): Promise<void>
  refreshToken(): Promise<void>
  
  getVendors(query: string): Promise<Vendor[]>
  createVendor(payload: VendorPayload): Promise<string>
  
  createBill(payload: BillPayload): Promise<BillResult>
  attachFile(billId: string, file: File): Promise<void>
  
  checkIdempotency(invoiceId: string): Promise<boolean>
  
  getConnectionStatus(): Promise<ConnectionStatus>
}
```

### 3. Sync Queue System (`lib/accounting/sync-queue.ts`)
- Queue approved invoices for sync
- Process queue with rate limiting
- Handle retries with exponential backoff
- Update invoice sync_status
- Log all attempts

### 4. Integration Settings Page (`app/dashboard/settings/integrations/page.tsx`)
- Connect/disconnect providers
- View connection status
- Configure auto-sync options
- View sync logs
- Retry failed syncs

## User Experience Flow

### First Sign-in
```
1. User completes signup → Redirect to dashboard
2. Show "Connect accounting software" modal
3. User selects QuickBooks → OAuth flow
4. Success → Modal closes, connection saved
   OR
   User clicks "Skip" → Show persistent banner
```

### Approving Invoice (Connected)
```
1. User clicks "Approve" on invoice
2. UI shows "Posting to QuickBooks..." spinner
3. Backend:
   - Check for existing vendor (by name)
   - Create vendor if needed
   - Create bill with line items
   - Attach PDF
   - Save external_bill_id
4. Success toast: "Invoice posted to QuickBooks ✓ View in QuickBooks"
   OR
   Error toast: "Posting failed — [reason]. Retry"
```

### Approving Invoice (Not Connected)
```
1. User clicks "Approve"
2. Invoice marked as "Approved (Pending Sync)"
3. Toast: "Invoice approved. Connect accounting tool to sync"
4. Show "Connect now" CTA in invoice detail
```

## Security Considerations

1. **OAuth Tokens**: Encrypt with KMS before storing
2. **Scopes**: Request minimal permissions only
3. **Audit Logging**: Log all sync attempts with timestamps
4. **Idempotency**: Use invoice_id as external_reference
5. **Rate Limiting**: Respect provider API limits
6. **Token Refresh**: Auto-refresh before expiry

## Error Handling Strategy

### Transient Errors (Auto-retry)
- 429 Rate Limit → Wait per Retry-After header
- 5xx Server Errors → Exponential backoff (1s, 2s, 4s)
- Network Timeout → Retry with longer timeout

### Permanent Errors (Manual intervention)
- 400 Validation Error → Show field-specific messages
- 401 Unauthorized → Prompt reconnection
- 409 Duplicate → Check if already synced
- 403 Forbidden → Show permissions error

## Monitoring & Metrics

Track:
- Connection success/failure rates
- Sync success/failure rates per provider
- Average sync time
- Retry frequency
- Token refresh failures
- Provider API response times

## Microcopy Reference

**Onboarding Modal**
- Title: "Connect your accounting software"
- Body: "Choose where InvoiceFlow should post approved invoices. You can skip this step and connect later from Settings."
- Buttons: "Connect QuickBooks" / "Skip for now"

**Sync Status Messages**
- Posting: "Posting to QuickBooks…"
- Success: "Invoice posted to QuickBooks ✓ View in QuickBooks"
- Error: "Posting failed — [reason]. Retry / View details"
- No connection: "Invoice approved. Connect an accounting tool to sync automatically."

**Banner**
- "Connect your accounting software to automatically post approved invoices. Connect now"

## Next Steps

1. Review and approve database schema
2. Create database migrations
3. Build base adapter interface
4. Implement onboarding modal
5. Set up QuickBooks OAuth (sandbox)
6. Build first working end-to-end flow
7. Add comprehensive error handling
8. Expand to other providers
