'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Invoice } from '@/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Check,
  X,
  Download,
  ZoomIn,
  ZoomOut,
  Sparkles,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const invoiceId = params.id as string

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [extractingOCR, setExtractingOCR] = useState(false)
  const [zoom, setZoom] = useState(100)

  useEffect(() => {
    loadInvoice()
  }, [invoiceId])

  const loadInvoice = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        vendor:vendors(id, name, email, address)
      `)
      .eq('id', invoiceId)
      .single()

    if (error) {
      console.error('❌ Error loading invoice:', error)
      toast.error('Failed to load invoice')
      return
    }

    setInvoice(data as any)
    setLoading(false)
  }

  const handleAnalyzeWithAI = async () => {
    setAnalyzing(true)
    const toastId = toast.loading('🤖 Analyzing invoice with AI...')

    try {
      const response = await fetch('/api/analyze-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoiceId })
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('✨ AI analysis completed! Invoice data extracted successfully.', { id: toastId })
        await loadInvoice()
      } else if (response.status === 429 || response.status === 503) {
        // Handle rate limit (429) or model loading (503) with auto-retry
        const retryAfter = result.retry_after || 30
        const errorMsg = response.status === 503 
          ? '🔄 AI model is starting up...' 
          : '⏱️ Rate limit exceeded...'
        
        toast.info(
          `${errorMsg} Retrying in ${retryAfter} seconds...`,
          { id: toastId, duration: (retryAfter + 5) * 1000 }
        )
        
        // Auto-retry after the specified delay
        setTimeout(() => {
          toast.info('🔄 Retrying AI analysis...', { duration: 3000 })
          handleAnalyzeWithAI()
        }, retryAfter * 1000)
      } else {
        toast.error(`❌ AI analysis failed: ${result.error || 'Unknown error'}`, { id: toastId })
      }
    } catch (error) {
      toast.error('❌ Failed to analyze invoice with AI', { id: toastId })
    } finally {
      if (!analyzing) {
        setAnalyzing(false)
      }
    }
  }

  const handleExtractOCR = async () => {
    setExtractingOCR(true)
    const toastId = toast.loading('📄 Extracting text from invoice...')

    try {
      const response = await fetch('/api/process-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoiceId })
      })

      const result = await response.json()

      if (response.ok) {
        toast.success(`✅ OCR extraction completed! Extracted ${result.text_length || 0} characters.`, { id: toastId })
        await loadInvoice()
      } else {
        toast.error(`❌ OCR extraction failed: ${result.error || 'Unknown error'}`, { id: toastId })
        console.error('OCR extraction error:', result)
      }
    } catch (error) {
      toast.error('❌ Failed to extract OCR text', { id: toastId })
      console.error('OCR extraction error:', error)
    } finally {
      setExtractingOCR(false)
    }
  }

  const handleApprove = async () => {
    if (!invoice?.extracted_data) {
      toast.error('Please analyze the invoice with AI first before approving.')
      return
    }

    const toastId = toast.loading('Approving invoice...')

    // Step 1: Approve the invoice
    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)

    if (error) {
      toast.error('Failed to approve invoice', { id: toastId })
      return
    }

    toast.success('✅ Invoice approved successfully!', { id: toastId })

    // Step 2: Check if there's an active accounting connection
    const { data: connection } = await supabase
      .from('accounting_connections')
      .select('*')
      .eq('company_id', invoice.company_id)
      .eq('is_active', true)
      .eq('is_default', true)
      .maybeSingle()

    // Step 3: If connection exists, sync to accounting platform
    if (connection) {
      const syncToastId = toast.loading(`Syncing to ${connection.provider_company_name || connection.provider}...`)
      
      try {
        const response = await fetch('/api/accounting/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoice_id: invoiceId })
        })

        const result = await response.json()

        if (response.ok && result.success) {
          toast.success(
            `🎉 Synced to ${connection.provider_company_name || connection.provider}!`,
            { id: syncToastId }
          )
          
          // If bill URL is available, show it
          if (result.bill_url) {
            toast.info(
              <div>
                Bill created successfully!{' '}
                <a 
                  href={result.bill_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  View in {connection.provider_company_name || connection.provider}
                </a>
              </div>,
              { duration: 8000 }
            )
          }
        } else {
          toast.error(
            `Failed to sync: ${result.error || 'Unknown error'}`,
            { id: syncToastId }
          )
        }
      } catch (error) {
        toast.error('Failed to sync invoice to accounting platform', { id: syncToastId })
        console.error('Sync error:', error)
      }
    }

    // Redirect after a delay
    setTimeout(() => router.push('/dashboard/inbox'), 2000)
  }

  const handleReject = async () => {
    const toastId = toast.loading('Rejecting invoice...')

    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)

    if (error) {
      toast.error('Failed to reject invoice', { id: toastId })
    } else {
      toast.success('Invoice rejected', { id: toastId })
      setTimeout(() => router.push('/dashboard/inbox'), 1000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Invoice Not Found</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          The invoice you're looking for doesn't exist or you don't have access to it.
        </p>
        <Button asChild>
          <Link href="/dashboard/inbox">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Inbox
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" asChild>
                <Link href="/dashboard/inbox">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Link>
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-2xl font-bold">
                  Invoice {invoice.invoice_number || 'N/A'}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {invoice.vendor?.name || 'Unknown Vendor'}
                </p>
              </div>
              <Badge className={invoice.status === 'needs_review' ? 'bg-yellow-500' : ''}>
                {invoice.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={handleReject}>
                <X className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button onClick={handleApprove} disabled={!invoice.extracted_data}>
                <Check className="mr-2 h-4 w-4" />
                Approve
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Document Viewer */}
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Invoice Document</h2>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom(Math.max(50, zoom - 10))}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[60px] text-center">
                    {zoom}%
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom(Math.min(200, zoom + 10))}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Separator orientation="vertical" className="h-6" />
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={invoice.attachment_urls?.[0]}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-auto bg-gray-100 dark:bg-gray-800 flex items-center justify-center min-h-[600px]">
                {invoice.attachment_urls?.[0] ? (
                  invoice.mime_types?.[0]?.includes('pdf') ? (
                    <iframe
                      src={invoice.attachment_urls[0]}
                      className="w-full h-[800px]"
                      style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
                    />
                  ) : (
                    <img
                      src={invoice.attachment_urls[0]}
                      alt="Invoice"
                      className="max-w-full h-auto"
                      style={{ transform: `scale(${zoom / 100})` }}
                    />
                  )
                ) : (
                  <p className="text-gray-500">No document attached</p>
                )}
              </div>
            </Card>
          </div>

          {/* Right Column - OCR Text & AI Analysis */}
          <div className="space-y-6">
            {/* Raw OCR Text */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Raw OCR Text</h2>
              {invoice.raw_ocr ? (
                <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <pre className="font-mono text-xs whitespace-pre-wrap text-gray-700 dark:text-gray-300 max-h-96 overflow-y-auto">
                    {invoice.raw_ocr}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No OCR text extracted yet</p>
                  <p className="text-sm">Click "Analyze with AI" to extract and analyze</p>
                </div>
              )}

              {/* AI Analyze Button */}
              <div className="mt-6 space-y-3">
                {/* Extract OCR Button (Manual Trigger) */}
                <Button
                  onClick={handleExtractOCR}
                  disabled={extractingOCR}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  {extractingOCR ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Extracting OCR text...
                    </>
                  ) : (
                    <>
                      <AlertCircle className="mr-2 h-5 w-5" />
                      {invoice.raw_ocr ? 'Re-extract OCR Text' : 'Extract OCR Text'}
                    </>
                  )}
                </Button>

                {/* AI Analyze Button */}
                <Button
                  onClick={handleAnalyzeWithAI}
                  disabled={analyzing || !invoice.raw_ocr}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  size="lg"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Analyzing with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Analyze with AI
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Step 1: Extract OCR text → Step 2: Analyze with AI
                </p>
              </div>
            </Card>

            {/* Detailed AI Analysis Card (only shows after AI analysis) */}
            {invoice.extracted_data && (
              <>
                {/* Card 1: Comprehensive Analysis Details */}
                <Card className="p-6 border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
                  <h2 className="text-lg font-semibold mb-6 flex items-center">
                    <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
                    Detailed AI Analysis
                  </h2>
                  
                  {/* 1. General Invoice Information */}
                  {invoice.extracted_data.general_info && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                        1. General Invoice Information
                      </h3>
                      <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            <tr>
                              <td className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 w-1/3">Invoice Number</td>
                              <td className="px-4 py-3 font-semibold">{invoice.extracted_data.general_info.invoice_number || 'N/A'}</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Date of Issue</td>
                              <td className="px-4 py-3">{invoice.extracted_data.general_info.date_of_issue || 'N/A'}</td>
                            </tr>
                            {invoice.extracted_data.general_info.due_date && (
                              <tr>
                                <td className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Due Date</td>
                                <td className="px-4 py-3">{invoice.extracted_data.general_info.due_date}</td>
                              </tr>
                            )}
                            <tr>
                              <td className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Currency</td>
                              <td className="px-4 py-3">
                                {invoice.extracted_data.general_info.currency} 
                                {invoice.extracted_data.general_info.currency_symbol && 
                                  ` (${invoice.extracted_data.general_info.currency_symbol})`}
                              </td>
                            </tr>
                            {invoice.extracted_data.general_info.payment_terms && (
                              <tr>
                                <td className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Payment Terms</td>
                                <td className="px-4 py-3">{invoice.extracted_data.general_info.payment_terms}</td>
                              </tr>
                            )}
                            {invoice.extracted_data.general_info.po_number && (
                              <tr>
                                <td className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">PO Number</td>
                                <td className="px-4 py-3">{invoice.extracted_data.general_info.po_number}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 2. Seller Details */}
                  {invoice.extracted_data.seller && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                        2. Seller Details
                      </h3>
                      <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            <tr>
                              <td className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 w-1/3">Company Name</td>
                              <td className="px-4 py-3 font-semibold">{invoice.extracted_data.seller.company_name || 'N/A'}</td>
                            </tr>
                            {invoice.extracted_data.seller.address && (
                              <tr>
                                <td className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Address</td>
                                <td className="px-4 py-3">{invoice.extracted_data.seller.address}</td>
                              </tr>
                            )}
                            {invoice.extracted_data.seller.tax_id && (
                              <tr>
                                <td className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Tax ID</td>
                                <td className="px-4 py-3">{invoice.extracted_data.seller.tax_id}</td>
                              </tr>
                            )}
                            {invoice.extracted_data.seller.iban && (
                              <tr>
                                <td className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">IBAN</td>
                                <td className="px-4 py-3 font-mono text-xs">{invoice.extracted_data.seller.iban}</td>
                              </tr>
                            )}
                            {invoice.extracted_data.seller.email && (
                              <tr>
                                <td className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Email</td>
                                <td className="px-4 py-3">{invoice.extracted_data.seller.email}</td>
                              </tr>
                            )}
                            {invoice.extracted_data.seller.phone && (
                              <tr>
                                <td className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Phone</td>
                                <td className="px-4 py-3">{invoice.extracted_data.seller.phone}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 3. Client Details */}
                  {invoice.extracted_data.client && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                        3. Client Details
                      </h3>
                      <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            <tr>
                              <td className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 w-1/3">Company Name</td>
                              <td className="px-4 py-3 font-semibold">{invoice.extracted_data.client.company_name || 'N/A'}</td>
                            </tr>
                            {invoice.extracted_data.client.address && (
                              <tr>
                                <td className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Address</td>
                                <td className="px-4 py-3">{invoice.extracted_data.client.address}</td>
                              </tr>
                            )}
                            {invoice.extracted_data.client.tax_id && (
                              <tr>
                                <td className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Tax ID</td>
                                <td className="px-4 py-3">{invoice.extracted_data.client.tax_id}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 4. Itemized Products & Services */}
                  {invoice.extracted_data.line_items && invoice.extracted_data.line_items.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                        4. Itemized Products & Services
                      </h3>
                      <div className="bg-white dark:bg-gray-900 rounded-lg overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold">No.</th>
                              <th className="px-3 py-2 text-left font-semibold">Description</th>
                              <th className="px-3 py-2 text-right font-semibold">Qty</th>
                              <th className="px-3 py-2 text-center font-semibold">Unit</th>
                              <th className="px-3 py-2 text-right font-semibold">Unit Price</th>
                              <th className="px-3 py-2 text-right font-semibold">Net Worth</th>
                              <th className="px-3 py-2 text-center font-semibold">VAT %</th>
                              <th className="px-3 py-2 text-right font-semibold">Gross Worth</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {invoice.extracted_data.line_items.map((item: any, index: number) => (
                              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-3 py-3 font-medium">{item.item_number}</td>
                                <td className="px-3 py-3 max-w-xs">{item.description}</td>
                                <td className="px-3 py-3 text-right">{item.quantity}</td>
                                <td className="px-3 py-3 text-center">{item.unit}</td>
                                <td className="px-3 py-3 text-right">${item.unit_price?.toFixed(2)}</td>
                                <td className="px-3 py-3 text-right font-medium">${item.net_worth?.toFixed(2)}</td>
                                <td className="px-3 py-3 text-center">{item.vat_rate}%</td>
                                <td className="px-3 py-3 text-right font-semibold">${item.gross_worth?.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 5. Financial Summary */}
                  {invoice.extracted_data.financial_summary && (
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                        5. Financial Summary
                      </h3>
                      <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            <tr>
                              <td className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Total Net Worth</td>
                              <td className="px-4 py-3 text-right font-semibold">
                                ${invoice.extracted_data.financial_summary.subtotal?.toFixed(2) || '0.00'}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Total VAT</td>
                              <td className="px-4 py-3 text-right font-semibold">
                                ${invoice.extracted_data.financial_summary.total_vat?.toFixed(2) || '0.00'}
                              </td>
                            </tr>
                            {invoice.extracted_data.financial_summary.discount > 0 && (
                              <tr>
                                <td className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Discount</td>
                                <td className="px-4 py-3 text-right font-semibold text-red-600">
                                  -${invoice.extracted_data.financial_summary.discount?.toFixed(2)}
                                </td>
                              </tr>
                            )}
                            <tr className="bg-green-50 dark:bg-green-900/20">
                              <td className="px-4 py-3 font-bold text-lg">Total Gross Worth</td>
                              <td className="px-4 py-3 text-right font-bold text-lg text-green-600">
                                ${invoice.extracted_data.financial_summary.total?.toFixed(2) || '0.00'}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </Card>

                {/* Card 2: Invoice Preview for Accounting Insertion */}
                <Card className="p-6 border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold flex items-center">
                      <Check className="h-5 w-5 mr-2 text-blue-600" />
                      Invoice Preview - Ready for Accounting
                    </h2>
                    <Badge className="bg-blue-600">
                      {invoice.status === 'approved' ? 'Approved' : 'Pending Approval'}
                    </Badge>
                  </div>

                  <div className="bg-white dark:bg-gray-900 rounded-lg p-6 space-y-6">
                    {/* Header Section */}
                    <div className="flex justify-between items-start border-b pb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {invoice.extracted_data.seller?.company_name || 'Vendor Name'}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {invoice.extracted_data.seller?.address || 'Vendor Address'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 dark:text-gray-400">INVOICE</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          #{invoice.extracted_data.general_info?.invoice_number || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {invoice.extracted_data.general_info?.date_of_issue || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Bill To */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Bill To</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {invoice.extracted_data.client?.company_name || 'Client Name'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {invoice.extracted_data.client?.address || 'Client Address'}
                      </p>
                    </div>

                    {/* Line Items Summary */}
                    <div>
                      <table className="w-full text-sm">
                        <thead className="border-b-2 border-gray-300 dark:border-gray-700">
                          <tr>
                            <th className="text-left py-2 font-semibold">Description</th>
                            <th className="text-right py-2 font-semibold">Qty</th>
                            <th className="text-right py-2 font-semibold">Price</th>
                            <th className="text-right py-2 font-semibold">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {invoice.extracted_data.line_items?.slice(0, 5).map((item: any, index: number) => (
                            <tr key={index}>
                              <td className="py-2">{item.description}</td>
                              <td className="text-right py-2">{item.quantity} {item.unit}</td>
                              <td className="text-right py-2">${item.unit_price?.toFixed(2)}</td>
                              <td className="text-right py-2 font-medium">${item.gross_worth?.toFixed(2)}</td>
                            </tr>
                          ))}
                          {invoice.extracted_data.line_items?.length > 5 && (
                            <tr>
                              <td colSpan={4} className="py-2 text-center text-sm text-gray-500 italic">
                                + {invoice.extracted_data.line_items.length - 5} more items
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Totals */}
                    <div className="border-t-2 border-gray-300 dark:border-gray-700 pt-4">
                      <div className="flex justify-end space-y-2">
                        <div className="w-64 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                            <span className="font-medium">
                              ${invoice.extracted_data.financial_summary?.subtotal?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                            <span className="font-medium">
                              ${invoice.extracted_data.financial_summary?.total_vat?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                          {invoice.extracted_data.financial_summary?.discount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                              <span className="font-medium text-red-600">
                                -${invoice.extracted_data.financial_summary.discount.toFixed(2)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-lg font-bold border-t pt-2">
                            <span>Total:</span>
                            <span className="text-green-600">
                              ${invoice.extracted_data.financial_summary?.total?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Payment Terms */}
                    {invoice.extracted_data.general_info?.payment_terms && (
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                          Payment Terms
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {invoice.extracted_data.general_info.payment_terms}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-6 pt-6 border-t border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
                      Review the invoice details above. When ready, approve to sync with your accounting tool.
                    </p>
                    <div className="flex gap-3">
                      <Button 
                        onClick={handleReject}
                        variant="outline" 
                        className="flex-1"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                      <Button 
                        onClick={handleApprove}
                        disabled={invoice.status === 'approved'}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <Check className="mr-2 h-4 w-4" />
                        {invoice.status === 'approved' ? 'Already Approved' : 'Approve & Sync'}
                      </Button>
                    </div>
                  </div>
                </Card>
              </>
            )}
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Description</th>
                            <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-400">Qty</th>
                            <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-400">Unit Price</th>
                            <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-400">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {invoice.line_items.map((item, index) => (
                            <tr key={item.id || index}>
                              <td className="px-3 py-2">{item.description}</td>
                              <td className="px-3 py-2 text-right">{item.quantity}</td>
                              <td className="px-3 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                              <td className="px-3 py-2 text-right font-semibold">{formatCurrency(item.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* AI Confidence Score */}
                {invoice.confidence && (
                  <div className="pt-4 border-t border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-3 rounded-lg">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">AI Confidence Score</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300">
                        {Math.round((invoice.confidence.overall || 0) * 100)}% Accurate
                      </Badge>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
