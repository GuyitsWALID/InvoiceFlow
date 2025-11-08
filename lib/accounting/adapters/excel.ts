/**
 * Excel Adapter for InvoiceFlow
 * 
 * This adapter allows users to sync invoices to a local/downloadable Excel spreadsheet.
 * Instead of OAuth, it maintains a persistent Excel file that gets updated with each invoice.
 */

import { 
  AccountingAdapter, 
  OAuthCredentials, 
  ConnectionMetadata, 
  ConnectionStatus,
  Vendor,
  VendorPayload,
  BillPayload,
  BillResult,
  SyncError
} from './base'
import * as XLSX from 'xlsx'

export class ExcelAdapter extends AccountingAdapter {
  private excelFilePath: string = ''

  constructor(connectionId: string, companyId: string) {
    super(connectionId, companyId)
    this.excelFilePath = `invoices_${companyId}.xlsx`
  }

  /**
   * No OAuth needed for Excel - just create a connection record
   */
  async connect(credentials: OAuthCredentials): Promise<ConnectionMetadata> {
    return {
      provider_company_id: this.companyId,
      provider_company_name: 'Excel',
      access_token_encrypted: 'N/A',
      scopes: [],
      metadata: {
        type: 'excel',
        file_name: this.excelFilePath
      }
    }
  }

  /**
   * No need to disconnect from Excel
   */
  async disconnect(): Promise<void> {
    // Nothing to do
  }

  /**
   * No tokens to refresh
   */
  async refreshTokenIfNeeded(): Promise<void> {
    // Nothing to do
  }

  /**
   * Excel is always "connected"
   */
  async getConnectionStatus(): Promise<ConnectionStatus> {
    return {
      is_connected: true,
      provider_name: 'Excel',
      company_name: 'Excel',
      needs_reconnection: false
    }
  }

  /**
   * Excel doesn't have vendor management - return empty
   */
  async getVendors(query: string): Promise<Vendor[]> {
    return []
  }

  async getVendorById(externalId: string): Promise<Vendor | null> {
    return null
  }

  async createVendor(payload: VendorPayload): Promise<string> {
    // Return vendor name as ID
    return payload.name
  }

  async updateVendor(externalId: string, payload: Partial<VendorPayload>): Promise<void> {
    // Nothing to do
  }

  /**
   * Create bill by returning Excel file data
   * This will be used to generate a downloadable Excel file
   */
  async createBill(payload: BillPayload): Promise<BillResult> {
    try {
      // Map invoice data to Excel format
      const excelData = this.mapBillPayload(payload)

      // Return the data - actual file creation happens in the API endpoint
      return {
        success: true,
        bill_id: payload.invoice_number,
        vendor_id: payload.vendor_id || 'N/A',
        bill_url: '', // No URL for local file
        created_at: new Date()
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message || 'Failed to create Excel entry',
        created_at: new Date()
      }
    }
  }

  async getBill(externalBillId: string): Promise<any> {
    // Not applicable for Excel
    return null
  }

  async attachFile(externalBillId: string, fileUrl: string, fileName: string): Promise<void> {
    // Not applicable for Excel
  }

  /**
   * Check if invoice already exists in our system
   * Since Excel doesn't have external IDs, we rely on our database
   */
  async checkIdempotency(invoiceFlowId: string): Promise<boolean> {
    // This will be checked at the database level
    return false
  }

  /**
   * Map InvoiceFlow bill payload to Excel row format
   */
  protected mapBillPayload(payload: BillPayload): any {
    return {
      'Invoice Number': payload.invoice_number,
      'Vendor ID': payload.vendor_id || 'N/A',
      'Invoice Date': payload.invoice_date,
      'Due Date': payload.due_date || 'N/A',
      'Line Items': payload.line_items.map(item => {
        const qty = item.quantity || 1
        const unitPrice = item.amount / qty
        return `${item.description} (${qty} x $${unitPrice.toFixed(2)})`
      }).join('; '),
      'Subtotal': payload.subtotal,
      'Tax': payload.tax_total || 0,
      'Total': payload.total,
      'Currency': payload.currency || 'USD',
      'Notes': payload.notes || '',
      'Synced At': new Date().toLocaleString()
    }
  }

  /**
   * Handle errors (minimal for Excel)
   */
  protected handleProviderError(error: any): SyncError {
    return {
      message: error.message || 'Excel sync error',
      code: 'EXCEL_ERROR',
      is_transient: false
    }
  }

  /**
   * Generate Excel file from invoice data
   * This is a helper method to create the actual Excel file
   */
  static generateExcelFile(invoices: any[]): ArrayBuffer {
    // Create workbook
    const workbook = XLSX.utils.book_new()
    
    // Create worksheet from invoice data
    const worksheet = XLSX.utils.json_to_sheet(invoices)
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // Invoice ID
      { wch: 15 }, // Invoice Number
      { wch: 25 }, // Vendor Name
      { wch: 12 }, // Invoice Date
      { wch: 12 }, // Due Date
      { wch: 40 }, // Line Items
      { wch: 12 }, // Subtotal
      { wch: 10 }, // Tax
      { wch: 12 }, // Total
      { wch: 10 }, // Currency
      { wch: 30 }, // Notes
      { wch: 20 }  // Synced At
    ]
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoices')
    
    // Generate buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    
    return excelBuffer
  }
}
