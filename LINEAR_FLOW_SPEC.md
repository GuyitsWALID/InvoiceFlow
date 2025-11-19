# Linear Flow UI Specification

## Overview
This document outlines the single animated linear flow implementation for InvoiceFlow, transforming the sidebar-driven multi-step UI into a continuous, visually flowing experience.

## Flow Architecture

### Flow Path
```
Landing Upload → Auth → Home Flow → AI Analyze → Preview → Final Review → Sync
```

### Component Structure

#### 1. FlowCanvas
**Purpose**: Main container with visual progress timeline

**Props**:
- `currentStep`: FlowStep ('upload' | 'analyze' | 'preview' | 'review' | 'sync')
- `children`: React.ReactNode
- `className`: string (optional)

**Features**:
- Visual progress timeline with 5 steps
- Animated step indicators with gradient connectors
- Active/completed state indicators
- Respects `prefers-reduced-motion`
- Max width: 1100px

**States**:
- Active step: Blue gradient, scale 110%
- Completed step: Green gradient
- Pending step: Gray, default size

---

#### 2. UploadCard
**Purpose**: File upload dropzone with drag-and-drop

**Props**:
- `onFileSelect`: (file: File) => void
- `isProcessing`: boolean (optional)

**Features**:
- Drag-and-drop support with visual feedback
- File input fallback
- Accepts: PDF, PNG, JPG (max 10MB)
- Security indicator
- Micro-animations on hover/drag

**Microcopy**:
- Primary: "Drop your invoice here or click to upload"
- Format: "Supports PDF, PNG, JPG • Max 10MB"
- Security: "Your files are encrypted and secure"

---

#### 3. AIAnalysisNode
**Purpose**: Live AI extraction with confidence indicators

**Props**:
- `status`: AnalysisStatus ('idle' | 'analyzing' | 'complete' | 'low-confidence' | 'failed')
- `progress`: number (0-100)
- `fields`: ConfidenceField[] (optional)
- `fileName`: string (optional)
- `onPause`: () => void (optional)
- `onCancel`: () => void (optional)
- `onRerun`: () => void (optional)

**Features**:
- Progress indicator with animated spinner
- Real-time confidence chips per field
- Color-coded confidence levels:
  - Green: ≥ 90%
  - Yellow: 70-89%
  - Red: < 70%
- Pause/Cancel actions
- Re-run analysis option
- Low confidence warnings

**Microcopy**:
- Processing: "Analyzing… extracting vendor, totals, and line items"
- Complete: "Extraction complete"
- Low confidence: "Low confidence — please verify this field"
- Failed: "Analysis failed"

---

#### 4. PreviewPane
**Purpose**: Document viewer + editable structured data

**Props**:
- `documentUrl`: string (optional)
- `invoiceData`: InvoiceData
- `onChange`: (field: string, value: any) => void
- `onRerunAnalysis`: () => void (optional)

**Layout**:
- Left panel: Document viewer with zoom controls
- Right panel: Editable fields with confidence indicators

**Features**:
- Document zoom (50-200%)
- Real-time field editing
- Line item calculator (auto-updates totals)
- Confidence badges per field
- Grouped sections: Vendor, Invoice Details, Line Items, Totals
- Animated total changes

**Sections**:
1. Vendor Information (name, address)
2. Invoice Details (number, date, due date)
3. Line Items (description, quantity, rate, amount)
4. Totals (subtotal, tax, total)

---

#### 5. StickyActionBar
**Purpose**: Fixed bottom action bar for final review

**Props**:
- `onAcceptAndSync`: () => void (optional)
- `onAcceptOnly`: () => void (optional)
- `onReject`: () => void (optional)
- `isProcessing`: boolean
- `hasProvider`: boolean
- `className`: string (optional)

**Actions**:
- **Primary**: "Accept & Sync" (gradient blue-to-purple)
- **Secondary**: "Accept (Save only)" (shown if no provider)
- **Tertiary**: "Reject / Edit" (red outline)

**Microcopy**:
- With provider: "Accept to sync with your accounting software"
- Without provider: "Accept to save or connect accounting software to sync"

---

#### 6. SyncToast
**Purpose**: Real-time sync status notifications

**Props**:
- `status`: SyncStatus ('idle' | 'syncing' | 'synced' | 'failed')
- `provider`: string (default: 'QuickBooks')
- `externalUrl`: string (optional)
- `errorMessage`: string (optional)
- `onRetry`: () => void (optional)
- `onViewDetails`: () => void (optional)
- `onClose`: () => void (optional)

**States**:
- **Syncing**: Blue spinner + "Posting to {provider}..."
- **Synced**: Green check + "Synced to {provider} ✓ View in {provider}"
- **Failed**: Red X + "Sync failed — Retry or View details"

**Features**:
- Fixed bottom-right position
- Auto-show on status change
- Dismissible (except during syncing)
- External link to provider on success

---

#### 7. OnboardingModal
**Purpose**: First-time user accounting connection prompt

**Props**:
- `isOpen`: boolean
- `onClose`: () => void
- `onConnect`: (provider: string) => void
- `onSkip`: () => void

**Providers**:
- QuickBooks
- Xero
- Wave
- Export (CSV/Excel)

**Microcopy**:
- Title: "Connect your accounting software"
- Subtitle: "Connect now so we can post approved invoices directly to your books. You can skip and connect later from Settings."
- Primary CTA: "Connect {Provider}"
- Secondary CTA: "Skip for now"

**Trigger**:
- First sign-in (created_at < 5 minutes ago)
- No existing active provider integration

---

#### 8. ConnectionBanner
**Purpose**: Persistent reminder to connect accounting software

**Props**:
- `onConnect`: () => void
- `onDismiss`: () => void

**Microcopy**:
- "Connect an accounting tool to auto-sync approved invoices"
- Subtitle: "Set up QuickBooks, Xero, Wave, or other integrations to automatically post approved invoices to your books."
- CTA: "Connect now"

**Display Logic**:
- Show if onboarding skipped OR
- Show if user has no active provider integration
- Dismissible (hides until next session)

---

## User Flow States

### 1. Landing Page Upload
**State**: Initial
**Actions**:
- Drag/drop file → Show auth modal
- Click "Choose File" → Show auth modal
**Next**: Auth modal → Sign In / Sign Up

### 2. Auth Modal
**State**: File pending
**Actions**:
- "Create Free Account" → Redirect to /signup
- "Sign In" → Redirect to /login
**Data**: File name stored in sessionStorage
**Next**: Post-auth redirect to /dashboard/home with file attached

### 3. Upload (Home Flow)
**State**: currentStep = 'upload'
**Component**: UploadCard
**Actions**:
- File selected → Upload to storage → Trigger analysis
**Next**: currentStep = 'analyze'

### 4. AI Analysis
**State**: currentStep = 'analyze', analysisStatus = 'analyzing'
**Component**: AIAnalysisNode
**Flow**:
1. Upload file to Supabase storage
2. Call /api/analyze-invoice
3. Show progress (0% → 100%)
4. Save extracted data to database
5. Display confidence chips
6. Auto-advance to preview after 1 second

**Next**: currentStep = 'preview'

### 5. Preview & Edit
**State**: currentStep = 'preview'
**Components**: PreviewPane + StickyActionBar
**Features**:
- Edit any field inline
- Line items recalc totals in real-time
- Document viewer with zoom
- Re-run analysis option

**Actions**:
- "Accept & Sync" → Validate → Sync
- "Accept (Save only)" → Save as approved
- "Reject / Edit" → Mark rejected → Reset flow

### 6. Sync
**State**: currentStep = 'sync', syncStatus = 'syncing'
**Components**: FlowCanvas (success view) + SyncToast
**Flow**:
1. Update invoice status to 'approved'
2. If provider connected:
   - Call /api/sync-invoice
   - Show "Syncing..." toast
   - On success: Update status to 'synced', show success animation
   - On failure: Show retry option
3. If no provider:
   - Save as "Approved (Pending Sync)"
   - Show banner to connect

**Next**: Auto-reset flow after 2-3 seconds

---

## Data Flow

### Invoice Data Schema
```typescript
interface InvoiceData {
  vendor_name?: string
  vendor_address?: string
  invoice_number?: string
  invoice_date?: string
  due_date?: string
  subtotal?: number
  tax?: number
  total?: number
  line_items?: LineItem[]
  confidence?: {
    vendor_name?: number
    invoice_number?: number
    total?: number
  }
}

interface LineItem {
  description: string
  quantity: number
  rate: number
  amount: number
}
```

### API Endpoints

#### POST /api/analyze-invoice
**Input**: FormData with file
**Output**:
```json
{
  "vendor_name": "string",
  "vendor_address": "string",
  "invoice_number": "string",
  "invoice_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD",
  "subtotal": 0,
  "tax": 0,
  "total": 0,
  "line_items": [
    {
      "description": "string",
      "quantity": 0,
      "rate": 0,
      "amount": 0
    }
  ],
  "confidence": {
    "vendor_name": 0.95,
    "invoice_number": 0.88,
    "total": 0.92,
    "overall": 0.91
  }
}
```

#### POST /api/sync-invoice
**Input**:
```json
{
  "invoice_id": "uuid",
  "company_id": "uuid"
}
```
**Output**:
```json
{
  "external_id": "string",
  "external_url": "string",
  "provider": "QuickBooks"
}
```

---

## Animation Guidelines

### Micro-transitions
- Duration: 200-500ms
- Easing: ease-in-out
- Respect `prefers-reduced-motion`

### Key Animations
1. **File upload**: Scale 102% on drag-over
2. **Progress timeline**: Gradient fill left-to-right
3. **Confidence chips**: Fade-in with stagger
4. **Total recalc**: Subtle color flash on change
5. **Sync success**: Card "travels" to book icon
6. **Step transitions**: Fade-out/fade-in with slide

### Reduced Motion Fallbacks
- Replace spinners with static icons
- Remove scale/transform effects
- Use instant transitions
- Keep color changes

---

## Accessibility

### Keyboard Navigation
- Tab order: Upload → Fields → Actions
- Enter/Space: Activate buttons
- Escape: Close modals
- Arrow keys: Navigate between fields

### Screen Reader
- `aria-live="polite"` on status changes
- Announcements:
  - "File uploaded. Analyzing invoice."
  - "Analysis complete. 3 fields low confidence."
  - "Invoice synced successfully."

### Focus Management
- Trap focus in modals
- Restore focus on modal close
- Visible focus indicators

### Touch Targets
- Minimum: 44x44px
- Spacing: 8px between targets

---

## Microcopy Reference

### Upload
- "Drop your invoice here or click to upload"
- "Supports PDF, PNG, JPG • Max 10MB"
- "Your files are encrypted and secure"

### Analysis
- "File received — analyzing now"
- "Analyzing… extracting vendor, totals, and line items"
- "Extraction complete"
- "Low confidence — please verify this field"

### Actions
- "Accept & Sync" (primary)
- "Accept (Save only)" (secondary)
- "Reject / Edit" (tertiary)
- "Save as Approved (Pending Sync)" (no provider)

### Sync
- "Posting to QuickBooks…"
- "Synced to QuickBooks ✓ View in QuickBooks"
- "Sync failed — Retry or View details"

### Onboarding
- Title: "Connect your accounting software"
- Subtitle: "Connect now so we can post approved invoices directly to your books. You can skip and connect later from Settings."

### Banner
- "Connect an accounting tool to auto-sync approved invoices. Connect now / Remind me later."

---

## Settings Integration

### Accounting Integrations
**Location**: /dashboard/settings?tab=integrations
**Features**:
- List of available providers
- OAuth connection flow
- Toggle: "Auto-post on Accept" (default: ON)
- Disconnect option
- Queue behavior: Sync pending invoices on connect

### Auto-post Toggle
- **ON**: Accept & Sync posts immediately
- **OFF**: Accept saves as approved, shows "Post to Accounting" button

---

## Acceptance Criteria

✅ File upload on landing prompts Sign in/Sign up
✅ After auth, user returns to Home with file attached
✅ File upload triggers visible animation and begins AI extraction
✅ Live extraction populates preview fields with confidence chips
✅ User can edit fields inline; totals recalc instantly
✅ Accept & Sync posts to connected accounting provider automatically
✅ Onboarding modal shows on first sign-in if no provider
✅ Banner shows if provider not connected
✅ Settings → Integrations allows connecting later
✅ All animations respect reduced-motion preferences
✅ Sync errors surface with clear retry/edit options
✅ Keyboard-first navigation
✅ Screen reader announcements for state changes

---

## Component File Map

```
components/flow/
├── flow-canvas.tsx          (FlowCanvas)
├── upload-card.tsx          (UploadCard)
├── ai-analysis-node.tsx     (AIAnalysisNode)
├── preview-pane.tsx         (PreviewPane)
├── sticky-action-bar.tsx    (StickyActionBar)
├── sync-toast.tsx           (SyncToast)
├── onboarding-modal.tsx     (OnboardingModal)
├── connection-banner.tsx    (ConnectionBanner)
└── index.ts                 (Exports)

app/dashboard/home/page.tsx  (Main flow orchestrator)
app/page.tsx                 (Landing with upload + auth modal)
```

---

## Mobile Adaptations

### Stacked Layout
- Progress timeline: Horizontal scrollable
- Preview: Document viewer above, fields below
- Action bar: Sticky bottom with vertical stack

### Touch Optimizations
- Larger touch targets (min 44px)
- Swipe gestures for zoom
- Simplified field layouts
- Bottom sheet for line items

---

## Performance Targets

- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Animation frame rate: 60fps
- File upload start: < 200ms
- API response handling: < 100ms
- No layout shift during transitions

---

## Error Handling

### Upload Errors
- File too large → "File exceeds 10MB limit"
- Invalid format → "Please upload PDF, PNG, or JPG"
- Network error → "Upload failed. Check connection and retry."

### Analysis Errors
- API failure → "Analysis failed. Please try again."
- Low confidence → Inline warnings + "Needs review" status
- Timeout → "Analysis taking longer than expected. Continue waiting?"

### Sync Errors
- Provider unreachable → "Cannot connect to QuickBooks. Retry?"
- Auth expired → "Session expired. Reconnect to QuickBooks."
- Validation error → "Invoice data invalid. Please review and try again."

---

## Testing Checklist

- [ ] Upload file on landing → Auth prompt appears
- [ ] Auth with pending file → Redirect to /dashboard/home with file
- [ ] File upload → Analysis starts with progress indicator
- [ ] Analysis complete → Fields populate with confidence chips
- [ ] Edit field → Total recalculates in real-time
- [ ] Accept & Sync (with provider) → Invoice syncs successfully
- [ ] Accept (no provider) → Saves as "Pending Sync"
- [ ] First sign-in → Onboarding modal shows
- [ ] Skip onboarding → Banner shows on flow page
- [ ] Reduced motion → Animations disabled
- [ ] Keyboard navigation → All actions accessible
- [ ] Screen reader → State changes announced
- [ ] Mobile → Layout adapts, touch targets adequate
- [ ] Error states → Clear retry/edit options

---

## Future Enhancements

- Bulk upload (multiple invoices)
- Template matching for recurring vendors
- Custom field extraction
- Email forwarding to process
- Mobile app with camera scan
- OCR training per company
- Duplicate detection before upload
- Invoice approval workflows

---

End of specification.
