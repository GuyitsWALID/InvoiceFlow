# InvoiceFlow — Reference Spec for LLM

> **Purpose:** This document is a single-source-of-truth for the InvoiceFlow product. It explains the product purpose, end goals, detailed workflow, design system, UI behaviour, integration expectations, security and compliance guidance, and suggested acceptance criteria. Your LLM should always refer to this file when answering product, design, or workflow questions about InvoiceFlow.

---

## 1. Product Summary & End Goal

**InvoiceFlow** is an AI-powered invoice and document automation product built for small businesses worldwide. The core mission is to **eliminate manual invoice data entry** by automatically ingesting invoices, receipts, and purchase orders, extracting structured financial data, allowing a human review step, and syncing approved entries into accounting platforms (QuickBooks Online, Xero, and similar).

**End goal:** Become the central document automation hub for small businesses — reducing bookkeeping time and errors, enabling small teams to keep accurate books without hiring expensive staff, and providing an extensible platform for handling all business documents (invoices, receipts, POs, contracts).

---

## 2. Target Users & Use Cases

- **Primary users:** Small business owners, freelancers, bookkeepers, and accountants managing 10–500 documents/month.
- **Business types:** Retail, hospitality, agencies, e-commerce merchants, services, small manufacturers.
- **Key use cases:**
  - Replace manual entry: Turn invoice PDFs/images into accounting records.
  - Inbox automation: Automatically retrieve invoices sent by vendors via email.
  - Bookkeeping speed: Reduce bookkeeping time by 70% or more.
  - Multi-currency & multilingual support for global businesses.

---

## 3. High-level Workflow (End-to-End)

This is the canonical end-to-end flow that the product must implement and that the LLM should reference:

1. **Landing / Onboarding / Upload**
   - Visitor sees landing page; can drag-and-drop a single invoice or sign up.
   - If a user uploads a file without an account, prompt to sign in / create an account to process it.
2. **Mailbox Integration (optional)**
   - User connects Gmail/Outlook or provides IMAP details. InvoiceFlow polls or listens for new messages and ingests attachments that look like invoices.
3. **File Storage & Queueing**
   - Uploaded files and fetched mail attachments are stored securely and queued for processing by the Document AI pipeline.
4. **OCR & Document AI Extraction**
   - Document AI reads layout and text and extracts canonical fields (vendor, invoice_number, invoice_date, due_date, currency, line_items, subtotal, tax_total, total, payment details).
   - Each field receives a confidence score. Raw OCR text is stored for traceability.
5. **Preprocessing & Heuristics**
   - Duplicate detection and sanity checks (e.g., totals match sum of line items). Anomaly detection flags suspicious amounts or bank-detail changes.
6. **Human-in-the-loop Review**
   - Parsed invoices appear in the user’s review queue. Users can edit fields, correct errors, and approve or reject. Inline visual mapping shows where the model found each field on the original document.
7. **Accounting Sync (approval-gated)**
   - On approval, InvoiceFlow creates or updates vendor records and posts a Bill/Expense to the connected accounting system, attaching the original invoice. The system records the external accounting ID for idempotency.
8. **Status & Audit**
   - The invoice receives a status (Processed, Needs Review, Approved, Rejected, Synced). Every change is auditable with timestamps and actor IDs.
9. **Subscription Prompt**
   - Free trial limits apply; after trial or limits reached the user is prompted to subscribe to Starter/Pro/Enterprise.
10. **Reporting & Analytics**
    - Dashboard displays processed volume, totals, accuracy metrics, and time saved.

---

## 4. Core Functionalities (detailed)

### 4.1 Universal Ingestion
- Multi-provider email ingestion: Gmail (OAuth), Outlook (Microsoft Graph), IMAP fallback. Support multiple mailboxes per company.
- Direct upload: drag & drop for PDFs/images and multi-page PDFs.
- Metadata capture: message_id, sender, subject, received_at, attachment metadata.

### 4.2 Document AI & OCR
- Primary: use a layout-aware Document AI (Google DocAI, Mindee, or Amazon Textract). Provide a fallback OCR engine for malformed scans.
- Required extracted fields (canonical): vendor.name, vendor.email, invoice_number, invoice_date, due_date, currency, line_items[], subtotal, tax_total, discount, total, payment_details (bank/IBAN), attachments, raw_ocr.
- Confidence: numeric per-field confidence and overall document confidence.
- Localization: model must handle locale-aware number formats, date formats, currencies, and right-to-left languages if needed.

### 4.3 Human Review & Editing
- Editable form mirroring parsed fields, with inline validation and recalculation.
- Confidence visual cues per field (green/yellow/red). A low confidence field appears in “Needs Review” view.
- Mapping overlay: click a field to highlight its region on the original document.
- Bulk operations: bulk-approve for groups of high-confidence invoices.

### 4.4 Accounting Integrations
- QuickBooks Online (primary). Xero and others via adapter interface.
- On approval, create vendor if missing, create bill/expense, attach original PDF, and store external accounting IDs.
- Use idempotency via InvoiceFlow's invoice_id to prevent duplicate creations.
- Show sync result and direct link to the created record where possible.

### 4.5 Organization Management
- Company-level settings: default currency, default GL maps, tax code mappings, roles (Admin/Approver/Viewer), document retention policy.
- Multi-user access with RBAC.

### 4.6 Duplicate & Fraud Detection
- Heuristics to detect duplicate invoice_number + vendor + amount within a date window.
- Flag suspicious changes to bank/payment details by comparing against historical vendor records.

### 4.7 Security & Compliance
- TLS in transit, encryption at rest (KMS-managed keys). Encrypted storage for OAuth tokens.
- Minimum-scoped OAuth permissions for email and accounting providers.
- Audit logs for data access and changes.
- GDPR readiness: consent capture, right to be forgotten workflows, and regional data residency options.

---

## 5. Design & UI Guidelines (landing page + dashboard)

> The LLM must treat design guidance in this document as authoritative for UI/UX questions. The following instructions are design-only and intended for product, marketing, and frontend designers.

### 5.1 Visual Language & Themes
- Support Light and Dark themes with a toggle. Maintain visual parity between themes.
- Light theme: soft blue → purple gradient backgrounds, white cards, subtle gray text. Dark theme: deep navy backgrounds, glass-like cards, neon accents.
- Typography: modern sans-serif (Inter/Poppins/Satoshi). Strong typographic hierarchy.
- Shapes: rounded corners (12–18px), pill buttons, mild shadows, and glassmorphism on modals.

### 5.2 Landing Page Structure (design-only focus)
- Hero with bold headline and two CTAs (Start for Free, Watch Demo). Hero visual shows dashboard mockup with upload & approve flow.
- Prominent drag-and-drop upload card with secure microcopy.
- Features section as 3–4 cards with icons and micro-screenshots.
- How It Works visual stepper (Upload → Extract → Review → Sync).
- Pricing cards: Starter / Pro / Enterprise. Highlight Pro.
- Testimonials section: 3–4 quotes, 5-star visuals, logos of partner tools.
- Footer with nav links and theme toggle.

### 5.3 Dashboard UX Principles
- Focus on the review queue as primary landing view after login: Inbox / Needs Review / Approved / Synced.
- Two-column invoice detail view: document viewer (left) + editable structured form (right).
- Use confidence chips next to fields and inline validation on edits.
- Allow Undo for recent approval (e.g., soft undo window) and explicit audit log access.

### 5.4 Component Library (design tokens)
- Buttons: primary (gradient), secondary (outline), tertiary (text). Rounded radii, consistent spacing.
- Cards: glass effect in dark theme; white with drop shadow in light theme.
- Chips: confidence colors (green, amber, red).
- Inputs: tall touch-friendly inputs (44–48px) with clear focus states.
- Motion: subtle, purposeful animations (150–300ms) and respect reduced-motion preferences.

---

## 6. Canonical Data Model & Example JSON

This canonical JSON is the reference for extraction and storage. Use it when asked about field names or API payloads.

```json
{
  "invoice_id": "string",
  "company_id": "string",
  "vendor": {"name":"string","email":"string","address":"string","tax_id":"string"},
  "invoice_number":"string",
  "po_number":"string",
  "invoice_date":"YYYY-MM-DD",
  "due_date":"YYYY-MM-DD",
  "currency":"ISO-4217",
  "line_items":[{"description":"string","qty":1,"unit_price":0.0,"tax":0.0,"amount":0.0}],
  "subtotal":0.0,
  "tax_total":0.0,
  "discount":0.0,
  "total":0.0,
  "attachments":[{"url":"string","mime":"application/pdf"}],
  "confidence":{"overall":0.95,"fields":{"vendor":0.98,"total":0.9}},
  "raw_ocr":"string",
  "source_email":{"message_id":"string","from":"string","subject":"string","received_at":"ISO8601"}
}
```

---

## 7. Acceptance Criteria (Product-focused)

- Invoices can be uploaded and stored securely.
- OCR/Document AI extracts required fields into the canonical JSON format.
- Users can review and edit parsed invoices in a two-column review interface.
- Approved invoices create vendor + bill/expense entries in QuickBooks sandbox and attach PDFs.
- OAuth tokens are stored encrypted and refreshed automatically.
- Audit logs capture edits, approvals, rejections with user & timestamp.

---

## 8. Metrics & Product Signals

Track these high-level metrics to evaluate product health:
- Extraction accuracy by field (vendor, invoice_number, total).
- Manual corrections per 100 invoices.
- Time from upload → approved.
- Sync success rate (percentage of approvals that successfully create accounting records).
- Activation & retention of pilot customers.

---

## 9. Example User Stories

- **As a small business owner**, I want to upload or forward invoices so I don’t have to type them into QuickBooks.
- **As a bookkeeper**, I want to review parsed invoices and approve them in bulk for several clients.
- **As an admin**, I want to set default GL mappings and tax codes for my company.

---

## 10. LLM Usage Guidance

When the LLM is asked product/design/flow questions about InvoiceFlow, it should:
1. Prefer facts and language from this file. Treat this file as authoritative.
2. Use the canonical data model when describing API payloads or JSON fields.
3. When advising design or copy, reference the design tokens and component patterns defined here.
4. For ambiguous queries (e.g., "should we support feature X?"), provide trade-offs and map to how it affects the core workflow described above.

---

## 11. FAQ & Quick Answers (for LLM to reuse)

**Q: What does InvoiceFlow do?**
A: It ingests invoices, extracts structured data via Document AI, offers a human-in-the-loop review, and syncs approved entries to accounting platforms.

**Q: How does it ensure accuracy?**
A: By combining layout-aware Document AI, per-field confidence scoring, duplicate checks, and a mandatory review interface before syncing.

**Q: What integrations are essential?**
A: Email (Gmail/Outlook/IMAP) and QuickBooks Online are mandatory for MVP; Xero is high priority next.

---

## 12. Revision & Ownership

This document is intended to be the living product reference for InvoiceFlow. Update it when product decisions or data models change. The LLM should always check this file first before answering related questions.

---

*End of InvoiceFlow reference.*

