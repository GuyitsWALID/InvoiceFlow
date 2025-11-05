# InvoiceFlow - Architecture & Implementation Guide

## 🏗️ System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend Layer                       │
│  Next.js 14 App Router + React + TypeScript + Tailwind CSS  │
└─────────────────────────────────────────────────────────────┘
                              ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                      API Layer (Next.js)                     │
│  /api/invoices - /api/integrations - /api/ocr              │
└─────────────────────────────────────────────────────────────┘
                              ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                    Backend Services Layer                    │
│  Supabase (PostgreSQL + Auth + Storage + Realtime)         │
└─────────────────────────────────────────────────────────────┘
                              ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                    External Integrations                     │
│  Gmail/Outlook │ Document AI │ QuickBooks │ Textract        │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Core Components

### 1. Authentication & Authorization

**Implementation**: Supabase Auth + RLS

```typescript
// Client-side auth
const { data, error } = await supabase.auth.signInWithPassword({
  email, password
})

// Server-side auth check
const { data: { session } } = await supabase.auth.getSession()
```

**Security Features**:
- JWT-based authentication
- Role-based access control (Admin, Accountant, Approver, Viewer)
- Row-Level Security policies on all tables
- Automatic token refresh

### 2. Invoice Data Model

**Core Entities**:

```typescript
Invoice {
  id, company_id, vendor_id
  invoice_number, po_number
  dates: invoice_date, due_date
  amounts: subtotal, tax_total, discount, total
  currency, status
  confidence: { overall, fields: {...} }
  line_items: [...]
  metadata: raw_ocr, source_email, attachments
}
```

**Status Flow**:
```
inbox → needs_review → approved → synced
                          ↓
                      rejected
```

### 3. Database Schema Design

**Key Design Decisions**:

1. **Multi-tenancy**: Company-based isolation with RLS
2. **Audit Trail**: Automatic triggers log all changes
3. **Soft Deletes**: Retention policies instead of hard deletes
4. **Indexing**: Optimized for common queries (status, date, vendor)
5. **JSONB Fields**: Flexible storage for confidence scores and metadata

**Performance Optimizations**:
- Composite indexes on (company_id, status, created_at)
- GIN index on vendor names for fuzzy search
- Materialized views for dashboard metrics (future)

### 4. Invoice Processing Pipeline

```
┌──────────────┐
│ Email Source │ → Detect Attachment → Download
└──────────────┘
                        ↓
┌──────────────────────────────────┐
│  Store Raw File (Supabase Storage)│
└──────────────────────────────────┘
                        ↓
┌──────────────────────────────────┐
│  OCR Processing (Document AI)    │
│  - Layout detection               │
│  - Field extraction               │
│  - Confidence scoring             │
└──────────────────────────────────┘
                        ↓
┌──────────────────────────────────┐
│  Parse & Validate                │
│  - Currency conversion            │
│  - Date parsing                   │
│  - Total validation               │
│  - Duplicate detection            │
└──────────────────────────────────┘
                        ↓
┌──────────────────────────────────┐
│  Triage & Route                  │
│  - High confidence → Inbox        │
│  - Low confidence → Needs Review  │
│  - Duplicate → Flagged            │
└──────────────────────────────────┘
                        ↓
┌──────────────────────────────────┐
│  Human Review (if needed)        │
└──────────────────────────────────┘
                        ↓
┌──────────────────────────────────┐
│  Approval & Sync                 │
│  - Create vendor (if new)        │
│  - Create bill in accounting     │
│  - Attach PDF                    │
│  - Update status                 │
└──────────────────────────────────┘
```

## 🔌 Integration Architecture

### Email Integration (Gmail/Outlook)

**OAuth Flow**:
1. User clicks "Connect Gmail"
2. Redirect to `/api/integrations/gmail/authorize`
3. Google OAuth consent screen
4. Callback to `/api/integrations/gmail/callback`
5. Store encrypted tokens in `integrations` table
6. Start polling for new emails

**Email Processing**:
```typescript
// Pseudo-code
async function processEmailBatch() {
  const integration = await getActiveGmailIntegration()
  const emails = await fetchUnreadEmails(integration.accessToken)
  
  for (const email of emails) {
    const attachments = await extractAttachments(email)
    
    for (const attachment of attachments) {
      if (isInvoiceLike(attachment)) {
        await processInvoice({
          file: attachment,
          source_email: {
            from: email.from,
            subject: email.subject,
            message_id: email.id,
            received_at: email.date
          }
        })
      }
    }
  }
}
```

### Document AI Integration

**Google Document AI**:
```typescript
async function extractInvoiceData(pdfBuffer: Buffer) {
  const request = {
    name: `projects/${PROJECT_ID}/locations/us/processors/${PROCESSOR_ID}`,
    rawDocument: {
      content: pdfBuffer.toString('base64'),
      mimeType: 'application/pdf',
    },
  }

  const [result] = await documentAI.processDocument(request)
  
  return parseDocumentAIResponse(result)
}
```

**Confidence Scoring**:
- Field-level confidence (0-1) from Document AI
- Overall document confidence (average of key fields)
- Threshold-based routing (< 0.85 → needs review)

### QuickBooks Integration

**OAuth 2.0 Flow**:
1. Redirect to QuickBooks OAuth
2. Receive authorization code
3. Exchange for access token + refresh token
4. Store encrypted in database

**Sync Operations**:
```typescript
async function syncToQuickBooks(invoice: Invoice) {
  // 1. Check/Create Vendor
  const vendor = await getOrCreateVendor(invoice.vendor)
  
  // 2. Create Bill
  const bill = await quickbooks.createBill({
    VendorRef: { value: vendor.Id },
    Line: invoice.line_items.map(item => ({
      DetailType: "AccountBasedExpenseLineDetail",
      Amount: item.amount,
      Description: item.description,
      AccountBasedExpenseLineDetail: {
        AccountRef: { value: item.gl_account }
      }
    })),
    TotalAmt: invoice.total,
    CurrencyRef: { value: invoice.currency }
  })
  
  // 3. Attach PDF
  await quickbooks.uploadAttachment(bill.Id, invoice.attachment_url)
  
  // 4. Update invoice with external_id
  await updateInvoice(invoice.id, {
    external_id: bill.Id,
    status: 'synced',
    synced_at: new Date()
  })
}
```

## 🔒 Security Implementation

### Row-Level Security (RLS)

**Example Policy**:
```sql
-- Users can only see invoices from their company
CREATE POLICY "Users view own company invoices"
ON invoices FOR SELECT
USING (
  company_id IN (
    SELECT company_id 
    FROM users 
    WHERE id = auth.uid()
  )
);
```

**Policy Categories**:
1. **Read**: Users can view records in their company
2. **Create**: Admins/Accountants can create
3. **Update**: Admins/Accountants/Approvers can update
4. **Delete**: Admins only

### Data Encryption

**At Rest**:
- OAuth tokens encrypted using AES-256
- Sensitive fields masked in UI
- Supabase native encryption for storage

**In Transit**:
- TLS 1.3 for all connections
- HTTPS only in production
- Secure cookie flags

### Audit Logging

**Automatic Triggers**:
```sql
CREATE TRIGGER audit_invoices
AFTER INSERT OR UPDATE OR DELETE ON invoices
FOR EACH ROW EXECUTE FUNCTION create_audit_log();
```

**Logged Events**:
- All CRUD operations
- Status changes
- Approval actions
- Integration sync attempts

## 📊 Performance Optimization

### Database Optimization

1. **Indexing Strategy**:
```sql
-- Compound index for common queries
CREATE INDEX idx_invoices_company_status_date 
ON invoices(company_id, status, created_at DESC);

-- Full-text search on vendors
CREATE INDEX idx_vendors_name_trgm 
ON vendors USING gin(name gin_trgm_ops);
```

2. **Query Optimization**:
- Use `select()` with specific columns
- Batch operations with transactions
- Implement pagination (limit/offset)

3. **Caching Strategy**:
- Dashboard metrics cached for 5 minutes
- User profile cached in session
- Integration status cached

### Frontend Optimization

1. **Code Splitting**:
- Route-based code splitting (Next.js automatic)
- Dynamic imports for heavy components
- Lazy loading for PDF viewer

2. **Image Optimization**:
- Next.js Image component
- WebP format with fallbacks
- Responsive images

3. **API Optimization**:
- SWR for data fetching and caching
- Optimistic updates for better UX
- Debounced search inputs

## 🧪 Testing Strategy

### Unit Tests
- Utility functions (formatting, validation)
- Data transformations
- Business logic

### Integration Tests
- API endpoints
- Database operations
- Auth flows

### E2E Tests
- User signup/login flow
- Invoice review and approval
- Integration connection

## 📈 Scalability Considerations

### Current Capacity
- Supports 1-1000 users per company
- Handles 10,000+ invoices per company
- Processes 100+ invoices per hour

### Scaling Path

**Horizontal Scaling**:
- Next.js serverless functions (auto-scale)
- Supabase connection pooling
- CDN for static assets

**Vertical Scaling**:
- Upgrade Supabase tier
- Increase database resources
- Add read replicas

**Future Optimizations**:
- Background job queue (Bull/BeeQueue)
- Redis caching layer
- Dedicated OCR processing service
- Batch processing for email ingestion

## 🔄 CI/CD Pipeline

### Recommended Setup

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm run build
      - uses: amondnet/vercel-action@v20
```

### Deployment Strategy

1. **Staging Environment**: Auto-deploy from `develop` branch
2. **Production Environment**: Auto-deploy from `main` branch
3. **Database Migrations**: Manual review before production
4. **Environment Variables**: Managed in Vercel dashboard

## 📚 Additional Resources

### Documentation Links
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Google Document AI](https://cloud.google.com/document-ai/docs)
- [QuickBooks API](https://developer.intuit.com/app/developer/qbo/docs/get-started)

### Code Examples
- Email OAuth flow implementation
- OCR processing with retry logic
- Duplicate detection algorithm
- Confidence score calculation

---

This architecture provides a solid foundation for building a production-ready invoice automation platform. Each component is designed to be modular, testable, and scalable.
