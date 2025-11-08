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
    if (!invoice?.raw_ocr) {
      toast.error('No OCR text available. Please wait for OCR processing to complete.')
      return
    }

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
      } else {
        toast.error(`❌ AI analysis failed: ${result.error || 'Unknown error'}`, { id: toastId })
      }
    } catch (error) {
      toast.error('❌ Failed to analyze invoice with AI', { id: toastId })
    }

    setAnalyzing(false)
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
                  <p>No OCR text available yet</p>
                  <p className="text-sm">OCR processing may still be running</p>
                </div>
              )}

              {/* AI Analyze Button */}
              <div className="mt-6">
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
                <p className="text-xs text-gray-500 text-center mt-2">
                  AI will extract all invoice fields using vision + OCR
                </p>
              </div>
            </Card>

            {/* Extracted Data Preview (only shows after AI analysis) */}
            {invoice.extracted_data && (
              <Card className="p-6 border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                  <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
                  AI Extracted Data
                </h2>
                
                {/* Vendor Information */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Vendor Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white dark:bg-gray-900 p-4 rounded-lg">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Vendor Name</p>
                      <p className="font-semibold">{invoice.vendor?.name || invoice.extracted_data?.vendor?.name || 'N/A'}</p>
                    </div>
                    {invoice.vendor?.email && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Email</p>
                        <p className="text-sm">{invoice.vendor.email}</p>
                      </div>
                    )}
                    {invoice.vendor?.address && (
                      <div className="col-span-2">
                        <p className="text-xs font-medium text-gray-500 mb-1">Address</p>
                        <p className="text-sm">{invoice.vendor.address}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Invoice Details */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Invoice Information</h3>
                  <div className="grid grid-cols-2 gap-3 bg-white dark:bg-gray-900 p-4 rounded-lg">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Invoice Number</p>
                      <p className="font-semibold">{invoice.invoice_number || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Invoice Date</p>
                      <p className="font-semibold">{invoice.invoice_date ? formatDate(invoice.invoice_date) : 'N/A'}</p>
                    </div>
                    {invoice.due_date && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Due Date</p>
                        <p className="font-semibold">{formatDate(invoice.due_date)}</p>
                      </div>
                    )}
                    {invoice.po_number && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">PO Number</p>
                        <p className="font-semibold">{invoice.po_number}</p>
                      </div>
                    )}
                    {invoice.payment_terms && (
                      <div className="col-span-2">
                        <p className="text-xs font-medium text-gray-500 mb-1">Payment Terms</p>
                        <p className="text-sm">{invoice.payment_terms}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Financial Summary</h3>
                  <div className="bg-white dark:bg-gray-900 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Subtotal</span>
                      <span className="font-semibold">{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Tax</span>
                      <span className="font-semibold">{formatCurrency(invoice.tax_total)}</span>
                    </div>
                    {invoice.discount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Discount</span>
                        <span className="font-semibold text-red-600">-{formatCurrency(invoice.discount)}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-base font-semibold">Total</span>
                        <span className="text-lg font-bold text-green-600">{formatCurrency(invoice.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Line Items */}
                {invoice.line_items && invoice.line_items.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Line Items</h3>
                    <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
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
