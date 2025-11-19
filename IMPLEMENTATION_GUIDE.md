# Linear Flow Implementation Guide

## Quick Start

### What Was Built

A complete linear flow system that transforms the sidebar-driven invoice processing into a single, continuous visual experience:

**Landing → Auth → Home Flow → AI Analyze → Preview → Review → Sync**

### New Files Created

#### Flow Components (`components/flow/`)
1. **flow-canvas.tsx** - Main container with progress timeline
2. **upload-card.tsx** - Drag-and-drop file upload
3. **ai-analysis-node.tsx** - Live AI extraction with confidence indicators
4. **preview-pane.tsx** - Document viewer + editable fields
5. **sticky-action-bar.tsx** - Bottom action bar for Accept/Reject
6. **sync-toast.tsx** - Real-time sync status notifications
7. **onboarding-modal.tsx** - First-time user provider connection
8. **connection-banner.tsx** - Persistent reminder to connect provider
9. **index.ts** - Component exports

#### Pages
1. **app/dashboard/home/page.tsx** - Main flow orchestrator
2. **app/page.tsx** - Updated landing page with file upload + auth modal
3. **app/dashboard/page.tsx** - Updated to redirect to /dashboard/home

#### Documentation
1. **LINEAR_FLOW_SPEC.md** - Complete UI specification
2. **IMPLEMENTATION_GUIDE.md** - This file

### Modified Files

1. **app/dashboard/layout.tsx**
   - Simplified sidebar navigation
   - Changed "Dashboard" to "Home (Upload & Flow)"
   - Removed separate Inbox, Review, Approved, Rejected, Duplicates links
   - Kept: Home, Processed Invoices, Synced Invoices, Team, Settings

2. **app/page.tsx**
   - Added file upload handling on landing
   - Auth modal prompt for unauthenticated users
   - File persistence via sessionStorage

---

## How It Works

### 1. Landing Page Upload
```typescript
// User drops/selects file on landing
handleFileSelect(file) → 
  Store in sessionStorage → 
  Show auth modal → 
  Redirect to /signup or /login
```

### 2. Post-Auth Flow
```typescript
// After authentication
/dashboard → redirect to /dashboard/home →
  Check sessionStorage for pending file →
  If file exists, auto-trigger upload flow
```

### 3. Linear Flow Steps

**Step 1: Upload**
- Component: `UploadCard`
- User drops/selects invoice
- File uploads to Supabase Storage
- Triggers AI analysis

**Step 2: Analyze**
- Component: `AIAnalysisNode`
- Calls `/api/analyze-invoice`
- Shows progress (0-100%)
- Displays confidence chips as fields extract
- Auto-advances to preview

**Step 3: Preview**
- Component: `PreviewPane`
- Left: Document viewer with zoom
- Right: Editable fields with confidence indicators
- Line items with auto-calculating totals

**Step 4: Review (Action Bar)**
- Component: `StickyActionBar`
- Accept & Sync (primary)
- Accept only (if no provider)
- Reject / Edit

**Step 5: Sync**
- Component: `SyncToast`
- Calls `/api/sync-invoice` if provider connected
- Shows success animation
- Resets flow after 2-3 seconds

---

## Key Features Implemented

### ✅ Single Canvas Flow
- No context-switching between pages
- Visual progress timeline
- Smooth transitions between steps

### ✅ Live AI Analysis
- Real-time progress indicator
- Confidence chips per field (green/yellow/red)
- Low confidence warnings
- Pause/Cancel/Re-run options

### ✅ Interactive Preview
- Split view: Document + Data
- Inline editing
- Real-time total calculations
- Zoom controls

### ✅ Provider Integration
- First-time onboarding modal
- Persistent connection banner
- Auto-sync on Accept
- Manual sync queue

### ✅ Accessibility
- Keyboard navigation
- Screen reader support
- Reduced motion preferences
- ARIA live regions

### ✅ Responsive Design
- Desktop: Side-by-side layout
- Mobile: Stacked flow
- Touch-friendly targets

---

## Integration Points

### Database Schema
Ensure these tables exist:

**invoices**
```sql
- id (uuid, primary key)
- company_id (uuid, foreign key)
- uploaded_by (uuid, foreign key to users)
- file_name (text)
- file_url (text)
- storage_path (text)
- vendor_name (text)
- vendor_address (text)
- invoice_number (text)
- invoice_date (date)
- due_date (date)
- subtotal (numeric)
- tax (numeric)
- total (numeric)
- line_items (jsonb)
- confidence (jsonb)
- status (text) - inbox, needs_review, approved, synced, rejected
- external_id (text)
- external_url (text)
- reviewed_at (timestamp)
- reviewed_by (uuid)
- synced_at (timestamp)
- created_at (timestamp)
```

**company_integrations**
```sql
- id (uuid, primary key)
- company_id (uuid, foreign key)
- provider (text) - quickbooks, xero, wave
- is_active (boolean)
- credentials (jsonb, encrypted)
- created_at (timestamp)
```

### API Endpoints Required

**POST /api/analyze-invoice**
- Input: FormData with file
- Output: InvoiceData with confidence scores
- Uses: Google Gemini AI (per your requirements)

**POST /api/sync-invoice**
- Input: { invoice_id, company_id }
- Output: { external_id, external_url, provider }
- Uses: Provider adapters (QuickBooks, Xero, etc.)

### Storage Bucket
- Name: `invoices`
- Path: `{company_id}/{timestamp}.{ext}`
- Public access: Read-only (authenticated)

---

## Configuration

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GOOGLE_GEMINI_API_KEY=your_gemini_api_key
```

### Feature Flags (Optional)
```typescript
// In app/dashboard/home/page.tsx
const ENABLE_ONBOARDING_MODAL = true
const ENABLE_CONNECTION_BANNER = true
const AUTO_ADVANCE_TO_PREVIEW = true
const PREVIEW_AUTO_ADVANCE_DELAY = 1000 // ms
```

---

## Testing

### Manual Testing Flow
1. **Landing Upload**
   - Go to `/`
   - Drag/drop invoice or click upload
   - Verify auth modal appears
   - Sign up/in
   - Verify redirect to `/dashboard/home`

2. **First-Time User**
   - Create new account
   - Upload invoice
   - Verify onboarding modal shows
   - Select provider or skip
   - If skipped, verify banner appears

3. **Analysis Flow**
   - Upload invoice
   - Verify progress indicator
   - Verify confidence chips appear
   - Verify auto-advance to preview

4. **Preview & Edit**
   - Edit vendor name
   - Edit line item quantity
   - Verify total recalculates
   - Test zoom controls

5. **Accept & Sync**
   - Click "Accept & Sync"
   - Verify sync toast appears
   - Verify success animation
   - Verify flow resets

6. **Accessibility**
   - Navigate with Tab key
   - Test with screen reader
   - Enable reduced motion
   - Verify mobile layout

### Automated Tests (Suggested)
```typescript
// Test file upload
test('uploads file and triggers analysis', async () => {
  const file = new File(['invoice'], 'test.pdf', { type: 'application/pdf' })
  await handleFileSelect(file)
  expect(currentStep).toBe('analyze')
})

// Test confidence display
test('shows confidence chips for extracted fields', async () => {
  const fields = [
    { name: 'Vendor', value: 'Acme Corp', confidence: 0.95 }
  ]
  render(<AIAnalysisNode fields={fields} status="complete" />)
  expect(screen.getByText('95%')).toBeInTheDocument()
})

// Test total calculation
test('recalculates total when line item changes', () => {
  const onChange = jest.fn()
  render(<PreviewPane invoiceData={data} onChange={onChange} />)
  // Edit quantity
  fireEvent.change(screen.getByLabelText('Qty'), { target: { value: '5' } })
  expect(onChange).toHaveBeenCalledWith('total', expect.any(Number))
})
```

---

## Troubleshooting

### Issue: Analysis never completes
**Solution**: Check `/api/analyze-invoice` endpoint. Ensure Google Gemini API key is valid and endpoint is returning correct JSON structure.

### Issue: Sync fails with "Provider not found"
**Solution**: Verify `company_integrations` table has active record for company. Check provider credentials are valid.

### Issue: File upload fails
**Solution**: Check Supabase storage bucket `invoices` exists and has proper RLS policies. Ensure file size < 10MB.

### Issue: Onboarding modal doesn't show
**Solution**: Verify user `created_at` timestamp logic. Check `company_integrations` query for existing providers.

### Issue: Animations janky
**Solution**: Check for `prefers-reduced-motion` detection. Ensure CSS transitions use GPU-accelerated properties (transform, opacity).

### Issue: Mobile layout broken
**Solution**: Verify Tailwind responsive classes (`sm:`, `md:`, `lg:`). Check viewport meta tag in layout.

---

## Next Steps

### Immediate
1. Set up `/api/analyze-invoice` endpoint with Google Gemini
2. Set up `/api/sync-invoice` endpoint with provider adapters
3. Configure Supabase storage bucket and RLS policies
4. Test first-time user flow end-to-end

### Short-term
1. Add error boundaries for component failures
2. Implement retry logic for failed API calls
3. Add analytics tracking for each flow step
4. Create Storybook stories for each component

### Long-term
1. Bulk upload support
2. Email forwarding integration
3. Mobile app with camera scan
4. Custom field extraction training
5. Invoice approval workflows

---

## Component API Reference

### FlowCanvas
```typescript
<FlowCanvas currentStep="upload">
  {/* Step content */}
</FlowCanvas>
```

### UploadCard
```typescript
<UploadCard
  onFileSelect={(file) => handleUpload(file)}
  isProcessing={false}
/>
```

### AIAnalysisNode
```typescript
<AIAnalysisNode
  status="analyzing"
  progress={45}
  fileName="invoice.pdf"
  fields={extractedFields}
  onCancel={() => reset()}
/>
```

### PreviewPane
```typescript
<PreviewPane
  documentUrl={publicUrl}
  invoiceData={data}
  onChange={(field, value) => update(field, value)}
/>
```

### StickyActionBar
```typescript
<StickyActionBar
  onAcceptAndSync={() => sync()}
  onReject={() => reject()}
  hasProvider={true}
  isProcessing={false}
/>
```

### SyncToast
```typescript
<SyncToast
  status="synced"
  provider="QuickBooks"
  externalUrl="https://..."
  onClose={() => dismiss()}
/>
```

### OnboardingModal
```typescript
<OnboardingModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onConnect={(provider) => connect(provider)}
  onSkip={() => skip()}
/>
```

### ConnectionBanner
```typescript
<ConnectionBanner
  onConnect={() => goToSettings()}
  onDismiss={() => hide()}
/>
```

---

## Performance Optimization

### Code Splitting
- Flow components lazy-loaded
- Route-based splitting already in place
- Use `React.lazy()` for heavy components

### Image Optimization
- Use Next.js Image component for placeholders
- Lazy-load document previews
- Compress thumbnails

### API Optimization
- Debounce field changes (300ms)
- Cache provider status
- Use SWR for data fetching

### Animation Performance
- Use CSS transforms (GPU-accelerated)
- Avoid layout thrashing
- RequestAnimationFrame for smooth 60fps

---

## Deployment Checklist

- [ ] Environment variables set
- [ ] Database migrations run
- [ ] Storage bucket configured
- [ ] RLS policies applied
- [ ] API endpoints tested
- [ ] Provider OAuth flows configured
- [ ] Error tracking enabled (Sentry, etc.)
- [ ] Analytics events set up
- [ ] Performance monitoring active
- [ ] SSL certificates valid
- [ ] CDN configured for static assets

---

## Support & Maintenance

### Monitoring
- Track flow completion rate
- Monitor analysis success rate
- Alert on sync failures
- Log API response times

### User Feedback
- In-app feedback widget
- Session replay for error cases
- Heatmaps for UX improvements
- A/B test flow variations

### Regular Updates
- Update AI model as needed
- Refresh provider OAuth tokens
- Monitor for breaking API changes
- Review and optimize slow queries

---

End of implementation guide.
