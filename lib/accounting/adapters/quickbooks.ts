import {
  AccountingAdapter,
  OAuthCredentials,
  ConnectionMetadata,
  ConnectionStatus,
  Vendor,
  VendorPayload,
  BillPayload,
  BillResult,
  SyncError,
} from './base'

interface QuickBooksTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  x_refresh_token_expires_in: number
  token_type: string
}

interface QuickBooksCompanyInfo {
  realmId: string
  companyName: string
}

/**
 * QuickBooks Online Adapter
 * Implements OAuth 2.0 and QBO API v3
 */
export class QuickBooksAdapter extends AccountingAdapter {
  private baseUrl: string
  private realmId: string | null = null
  private accessToken: string | null = null

  constructor(connectionId: string, companyId: string) {
    super(connectionId, companyId)
    
    // Use sandbox for development, production for live
    const environment = process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox'
    this.baseUrl = environment === 'sandbox'
      ? 'https://sandbox-quickbooks.api.intuit.com/v3'
      : 'https://quickbooks.api.intuit.com/v3'
  }

  /**
   * Step 1: Get OAuth authorization URL
   */
  static getAuthorizationUrl(state: string, redirectUri: string): string {
    const clientId = process.env.QUICKBOOKS_CLIENT_ID
    const scopes = ['com.intuit.quickbooks.accounting']
    
    const params = new URLSearchParams({
      client_id: clientId!,
      scope: scopes.join(' '),
      redirect_uri: redirectUri,
      response_type: 'code',
      state: state,
    })

    return `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`
  }

  /**
   * Step 2: Exchange authorization code for tokens
   */
  async connect(credentials: OAuthCredentials): Promise<ConnectionMetadata> {
    const clientId = process.env.QUICKBOOKS_CLIENT_ID!
    const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET!
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: credentials.code,
        redirect_uri: credentials.redirect_uri,
      }),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json()
      throw new Error(`QuickBooks OAuth failed: ${error.error_description || error.error}`)
    }

    const tokens: QuickBooksTokenResponse = await tokenResponse.json()
    
    // Extract realmId from state (it's passed by QuickBooks in the callback)
    const urlParams = new URLSearchParams(credentials.state)
    const realmId = urlParams.get('realmId') || ''
    
    this.accessToken = tokens.access_token
    this.realmId = realmId

    // Get company info
    const companyInfo = await this.getCompanyInfo(realmId, tokens.access_token)

    return {
      provider_company_id: realmId,
      provider_company_name: companyInfo.CompanyName,
      access_token_encrypted: tokens.access_token, // TODO: Encrypt before saving
      refresh_token_encrypted: tokens.refresh_token, // TODO: Encrypt before saving
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000),
      scopes: ['com.intuit.quickbooks.accounting'],
      metadata: {
        refresh_token_expires_at: new Date(Date.now() + tokens.x_refresh_token_expires_in * 1000),
      },
    }
  }

  /**
   * Disconnect and revoke tokens
   */
  async disconnect(): Promise<void> {
    // QuickBooks doesn't have a revoke endpoint
    // Just delete from database
    console.log('QuickBooks connection disconnected')
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokenIfNeeded(): Promise<void> {
    // TODO: Check if token is expired
    // TODO: Get refresh_token from database
    // TODO: Call refresh endpoint
    // TODO: Update tokens in database
    
    const clientId = process.env.QUICKBOOKS_CLIENT_ID!
    const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET!
    const refreshToken = 'from_database' // TODO: Get from DB

    const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to refresh QuickBooks token')
    }

    const tokens: QuickBooksTokenResponse = await response.json()
    
    // TODO: Update tokens in database
    this.accessToken = tokens.access_token
  }

  /**
   * Get connection status
   */
  async getConnectionStatus(): Promise<ConnectionStatus> {
    // TODO: Implement - check if tokens are valid
    return {
      is_connected: true,
      provider_name: 'QuickBooks',
      company_name: 'Test Company',
      needs_reconnection: false,
    }
  }

  /**
   * Search for vendors by name
   */
  async getVendors(query: string): Promise<Vendor[]> {
    await this.refreshTokenIfNeeded()

    const qboQuery = `SELECT * FROM Vendor WHERE DisplayName LIKE '%${query}%' MAXRESULTS 10`
    const response = await this.makeRequest(`/company/${this.realmId}/query?query=${encodeURIComponent(qboQuery)}`)

    const vendors = response.QueryResponse?.Vendor || []
    
    return vendors.map((v: any) => ({
      id: v.Id,
      name: v.DisplayName,
      email: v.PrimaryEmailAddr?.Address,
      address: v.BillAddr?.Line1,
      external_id: v.Id,
    }))
  }

  /**
   * Get vendor by ID
   */
  async getVendorById(externalId: string): Promise<Vendor | null> {
    await this.refreshTokenIfNeeded()

    try {
      const response = await this.makeRequest(`/company/${this.realmId}/vendor/${externalId}`)
      const v = response.Vendor

      return {
        id: v.Id,
        name: v.DisplayName,
        email: v.PrimaryEmailAddr?.Address,
        address: v.BillAddr?.Line1,
        external_id: v.Id,
      }
    } catch (error) {
      return null
    }
  }

  /**
   * Create a new vendor
   */
  async createVendor(payload: VendorPayload): Promise<string> {
    await this.refreshTokenIfNeeded()

    const vendorData = {
      DisplayName: payload.name,
      PrimaryEmailAddr: payload.email ? { Address: payload.email } : undefined,
      BillAddr: payload.address ? { Line1: payload.address } : undefined,
    }

    const response = await this.makeRequest(`/company/${this.realmId}/vendor`, {
      method: 'POST',
      body: JSON.stringify(vendorData),
    })

    return response.Vendor.Id
  }

  /**
   * Update vendor (not used for now)
   */
  async updateVendor(externalId: string, payload: Partial<VendorPayload>): Promise<void> {
    // TODO: Implement if needed
    throw new Error('Not implemented')
  }

  /**
   * Create a bill in QuickBooks
   */
  async createBill(payload: BillPayload): Promise<BillResult> {
    await this.refreshTokenIfNeeded()

    // Check idempotency first
    const exists = await this.checkIdempotency(payload.invoice_flow_id)
    if (exists) {
      throw new Error('Bill already exists for this invoice')
    }

    // Map to QuickBooks format
    const billData = this.mapBillPayload(payload)

    const response = await this.makeRequest(`/company/${this.realmId}/bill`, {
      method: 'POST',
      body: JSON.stringify(billData),
    })

    const bill = response.Bill

    return {
      external_bill_id: bill.Id,
      external_bill_url: `https://app.sandbox.qbo.intuit.com/app/bill?txnId=${bill.Id}`,
      external_vendor_id: payload.vendor_id,
      created_at: new Date(),
      provider_response: response,
    }
  }

  /**
   * Get bill by ID
   */
  async getBill(externalBillId: string): Promise<any> {
    await this.refreshTokenIfNeeded()
    
    const response = await this.makeRequest(`/company/${this.realmId}/bill/${externalBillId}`)
    return response.Bill
  }

  /**
   * Attach file to bill
   */
  async attachFile(externalBillId: string, fileUrl: string, fileName: string): Promise<void> {
    await this.refreshTokenIfNeeded()

    // QuickBooks requires downloading the file and uploading as multipart
    // This is complex - simplified for now
    console.log('File attachment not yet implemented for QuickBooks')
    // TODO: Implement file upload
  }

  /**
   * Check if invoice has already been synced
   */
  async checkIdempotency(invoiceFlowId: string): Promise<boolean> {
    await this.refreshTokenIfNeeded()

    // Search for bill with matching DocNumber (invoice number) or custom field
    // For now, we'll search by DocNumber
    const query = `SELECT * FROM Bill WHERE DocNumber = '${invoiceFlowId}' MAXRESULTS 1`
    const response = await this.makeRequest(`/company/${this.realmId}/query?query=${encodeURIComponent(query)}`)

    return (response.QueryResponse?.Bill || []).length > 0
  }

  /**
   * Map InvoiceFlow bill payload to QuickBooks format
   */
  protected mapBillPayload(payload: BillPayload): any {
    return {
      VendorRef: {
        value: payload.vendor_id,
      },
      TxnDate: payload.invoice_date,
      DueDate: payload.due_date,
      DocNumber: payload.invoice_flow_id, // Use as idempotency key
      PrivateNote: payload.memo,
      Line: payload.line_items.map((item, index) => ({
        Id: (index + 1).toString(),
        Amount: item.amount,
        DetailType: 'AccountBasedExpenseLineDetail',
        Description: item.description,
        AccountBasedExpenseLineDetail: {
          AccountRef: {
            value: item.gl_account || '1', // Default expense account
          },
          BillableStatus: 'NotBillable',
          TaxCodeRef: item.tax_code ? { value: item.tax_code } : undefined,
        },
      })),
      TotalAmt: payload.total,
    }
  }

  /**
   * Handle QuickBooks-specific errors
   */
  protected handleProviderError(error: any): SyncError {
    // QuickBooks error format: { Fault: { Error: [ { code, message, Detail } ] } }
    const qboError = error.Fault?.Error?.[0]
    
    if (!qboError) {
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message || 'Unknown error occurred',
        is_transient: false,
      }
    }

    const code = qboError.code
    const message = qboError.message
    
    // Determine if error is transient (can retry)
    const transientCodes = ['500', '503', '429']
    const is_transient = transientCodes.includes(code)

    return {
      code: code,
      message: message,
      is_transient: is_transient,
      retry_after: code === '429' ? 60 : undefined, // Wait 1 min for rate limit
      details: qboError.Detail,
    }
  }

  /**
   * Helper: Make authenticated request to QuickBooks API
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.accessToken || !this.realmId) {
      throw new Error('Not authenticated with QuickBooks')
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw this.handleProviderError(data)
    }

    return data
  }

  /**
   * Helper: Get company info
   */
  private async getCompanyInfo(realmId: string, accessToken: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/company/${realmId}/companyinfo/${realmId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to get company info')
    }

    const data = await response.json()
    return data.CompanyInfo
  }
}
