/**
 * Base Accounting Adapter Interface
 * 
 * All accounting provider adapters (QuickBooks, Xero, Wave, etc.) must implement this interface.
 * This ensures consistent behavior across all providers and makes it easy to add new providers.
 */

export interface OAuthCredentials {
  code: string
  state: string
  redirect_uri: string
}

export interface ConnectionMetadata {
  provider_company_id: string
  provider_company_name: string
  access_token_encrypted: string
  refresh_token_encrypted?: string
  token_expires_at?: Date
  scopes: string[]
  metadata?: Record<string, any>
}

export interface ConnectionStatus {
  is_connected: boolean
  provider_name: string
  company_name?: string
  last_sync_at?: Date
  last_error?: string
  token_expires_at?: Date
  needs_reconnection: boolean
}

export interface Vendor {
  id: string
  name: string
  email?: string
  address?: string
  tax_id?: string
  external_id?: string
}

export interface VendorPayload {
  name: string
  email?: string
  address?: string
  tax_id?: string
  phone?: string
}

export interface LineItem {
  description: string
  quantity: number
  unit_price: number
  amount: number
  tax_amount?: number
  gl_account?: string
  tax_code?: string
}

export interface BillPayload {
  invoice_number: string
  invoice_date: string
  due_date?: string
  vendor_id: string
  vendor_email?: string
  line_items: Array<{
    description: string
    amount: number
    quantity?: number
    account_ref?: string
  }>
  subtotal: number
  tax_total: number
  total: number
  currency: string
  notes?: string
}

export interface BillResult {
  success: boolean
  bill_id?: string
  bill_url?: string
  vendor_id?: string
  created_at: Date
  error?: string
}

export interface SyncError {
  code: string
  message: string
  is_transient: boolean // Can retry?
  retry_after?: number // Seconds to wait before retry
  details?: Record<string, any>
}

/**
 * Base Accounting Adapter
 * All provider adapters should extend this class
 */
export abstract class AccountingAdapter {
  protected connectionId: string
  protected companyId: string
  
  constructor(connectionId: string, companyId: string) {
    this.connectionId = connectionId
    this.companyId = companyId
  }

  /**
   * OAuth connection flow
   */
  abstract connect(credentials: OAuthCredentials): Promise<ConnectionMetadata>
  
  /**
   * Disconnect and revoke tokens
   */
  abstract disconnect(): Promise<void>
  
  /**
   * Refresh OAuth access token if needed
   */
  abstract refreshTokenIfNeeded(): Promise<void>
  
  /**
   * Get connection status and health
   */
  abstract getConnectionStatus(): Promise<ConnectionStatus>

  /**
   * Vendor operations
   */
  abstract getVendors(query: string): Promise<Vendor[]>
  abstract getVendorById(externalId: string): Promise<Vendor | null>
  abstract createVendor(payload: VendorPayload): Promise<string>
  abstract updateVendor(externalId: string, payload: Partial<VendorPayload>): Promise<void>

  /**
   * Bill/Expense operations
   */
  abstract createBill(payload: BillPayload): Promise<BillResult>
  abstract getBill(externalBillId: string): Promise<any>
  abstract attachFile(externalBillId: string, fileUrl: string, fileName: string): Promise<void>
  
  /**
   * Idempotency check - has this invoice already been synced?
   */
  abstract checkIdempotency(invoiceFlowId: string): Promise<boolean>

  /**
   * Map InvoiceFlow data to provider-specific format
   * Override this in each adapter for provider-specific mappings
   */
  protected abstract mapBillPayload(payload: BillPayload): any

  /**
   * Handle provider-specific errors
   */
  protected abstract handleProviderError(error: any): SyncError
}

/**
 * Factory function to get the right adapter for a provider
 */
export function getAccountingAdapter(
  provider: string,
  connectionId: string,
  companyId: string
): AccountingAdapter {
  switch (provider.toLowerCase()) {
    case 'quickbooks':
      // Will be implemented
      throw new Error('QuickBooks adapter not yet implemented')
    case 'xero':
      // Will be implemented
      throw new Error('Xero adapter not yet implemented')
    case 'wave':
      // Will be implemented
      throw new Error('Wave adapter not yet implemented')
    default:
      throw new Error(`Unsupported accounting provider: ${provider}`)
  }
}

/**
 * Provider configuration
 */
export const PROVIDER_CONFIG = {
  quickbooks: {
    name: 'QuickBooks',
    oauth_url: 'https://appcenter.intuit.com/connect/oauth2',
    api_url: 'https://quickbooks.api.intuit.com/v3',
    scopes: ['com.intuit.quickbooks.accounting'],
    icon: '/icons/quickbooks.svg',
    color: '#2CA01C'
  },
  xero: {
    name: 'Xero',
    oauth_url: 'https://login.xero.com/identity/connect/authorize',
    api_url: 'https://api.xero.com/api.xro/2.0',
    scopes: ['accounting.transactions', 'accounting.contacts'],
    icon: '/icons/xero.svg',
    color: '#13B5EA'
  },
  wave: {
    name: 'Wave',
    oauth_url: 'https://api.waveapps.com/oauth2/authorize',
    api_url: 'https://gql.waveapps.com/graphql/public',
    scopes: ['read:business', 'write:bill'],
    icon: '/icons/wave.svg',
    color: '#4D4D4D'
  },
  excel: {
    name: 'Excel',
    oauth_url: '', // No OAuth needed
    api_url: '', // Local file system
    scopes: [],
    icon: '/icons/excel.svg',
    color: '#217346'
  }
} as const

export type ProviderName = keyof typeof PROVIDER_CONFIG
