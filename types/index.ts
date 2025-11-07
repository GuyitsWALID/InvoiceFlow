export type UserRole = 'admin' | 'accountant' | 'approver' | 'viewer'

export type InvoiceStatus = 
  | 'inbox' 
  | 'needs_review' 
  | 'approved' 
  | 'synced' 
  | 'rejected' 
  | 'duplicate'

export type IntegrationType = 
  | 'quickbooks' 
  | 'xero' 
  | 'gmail' 
  | 'outlook' 
  | 'imap'

export interface Company {
  id: string
  name: string
  default_currency: string
  default_tax_code?: string
  default_gl_account?: string
  duplicate_detection_sensitivity: number
  require_invoice_number: boolean
  max_file_size_mb: number
  data_retention_days: number
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  company_id: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Vendor {
  id: string
  company_id: string
  name: string
  email?: string
  address?: string
  tax_id?: string
  bank_account?: string
  iban?: string
  swift?: string
  created_at: string
  updated_at: string
}

export interface LineItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  tax: number
  amount: number
  gl_account?: string
  tax_code?: string
  created_at: string
}

export interface ConfidenceScore {
  overall: number
  fields: {
    [key: string]: number
  }
}

export interface SourceEmail {
  message_id: string
  from: string
  subject: string
  received_at: string
}

export interface Invoice {
  id: string
  company_id: string
  vendor_id?: string
  invoice_number?: string
  po_number?: string
  invoice_date?: string
  due_date?: string
  payment_terms?: string
  currency: string
  subtotal: number
  tax_total: number
  discount: number
  total: number
  status: InvoiceStatus
  confidence: ConfidenceScore
  raw_ocr?: string
  extracted_data?: Record<string, any>
  source_email?: SourceEmail
  attachment_urls: string[]
  mime_types: string[]
  language_detected?: string
  sync_error?: string
  external_id?: string
  reviewed_by?: string
  reviewed_at?: string
  synced_at?: string
  created_at: string
  updated_at: string
  line_items?: LineItem[]
  vendor?: Vendor
}

export interface AuditLog {
  id: string
  company_id: string
  invoice_id?: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  changes?: Record<string, any>
  previous_value?: Record<string, any>
  new_value?: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: string
}

export interface Integration {
  id: string
  company_id: string
  type: IntegrationType
  display_name: string
  access_token_encrypted: string
  refresh_token_encrypted?: string
  token_expires_at?: string
  config?: Record<string, any>
  is_active: boolean
  last_sync_at?: string
  last_error?: string
  created_at: string
  updated_at: string
}

export interface CompanySettings {
  id: string
  company_id: string
  confidence_threshold: number
  auto_approve_high_confidence: boolean
  duplicate_check_window_days: number
  enable_fraud_detection: boolean
  notify_on_low_confidence: boolean
  notify_on_duplicate: boolean
  notify_on_anomaly: boolean
  created_at: string
  updated_at: string
}

export interface DashboardMetrics {
  total_processed: number
  total_value: number
  average_confidence: number
  manual_correction_rate: number
  sync_success_rate: number
  documents_this_month: number
  documents_by_status: Record<InvoiceStatus, number>
}

export interface OAuthState {
  company_id: string
  user_id: string
  redirect_uri: string
  integration_type: IntegrationType
}

export interface ParsedInvoice {
  vendor: {
    name: string
    email?: string
    address?: string
    tax_id?: string
  }
  invoice_number?: string
  po_number?: string
  invoice_date?: string
  due_date?: string
  currency: string
  line_items: Array<{
    description: string
    quantity: number
    unit_price: number
    tax: number
    amount: number
  }>
  subtotal: number
  tax_total: number
  discount: number
  total: number
  confidence: ConfidenceScore
  raw_ocr: string
  language_detected?: string
  payment_details?: {
    bank_account?: string
    iban?: string
    swift?: string
  }
}
