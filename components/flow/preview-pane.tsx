'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ZoomIn, ZoomOut, RotateCw, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LineItem {
  description: string
  quantity: number
  rate: number
  amount: number
}

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

interface PreviewPaneProps {
  documentUrl?: string
  invoiceData: InvoiceData
  onChange: (field: string, value: any) => void
  onRerunAnalysis?: () => void
}

export function PreviewPane({
  documentUrl,
  invoiceData,
  onChange,
  onRerunAnalysis
}: PreviewPaneProps) {
  const [zoom, setZoom] = useState(100)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mediaQuery.matches)
    
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'bg-gray-100 dark:bg-gray-800 text-gray-600'
    if (confidence >= 0.9) return 'bg-green-100 dark:bg-green-900/30 text-green-600'
    if (confidence >= 0.7) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600'
    return 'bg-red-100 dark:bg-red-900/30 text-red-600'
  }

  const handleLineItemChange = (index: number, field: keyof LineItem, value: any) => {
    const updatedItems = [...(invoiceData.line_items || [])]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    
    // Recalc amount if quantity or rate changes
    if (field === 'quantity' || field === 'rate') {
      updatedItems[index].amount = updatedItems[index].quantity * updatedItems[index].rate
    }
    
    onChange('line_items', updatedItems)
    
    // Recalc total
    const newSubtotal = updatedItems.reduce((sum, item) => sum + item.amount, 0)
    onChange('subtotal', newSubtotal)
    onChange('total', newSubtotal + (invoiceData.tax || 0))
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Left: Document Viewer */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Document
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.max(50, zoom - 10))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[3rem] text-center">
              {zoom}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.min(200, zoom + 10))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            {documentUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={documentUrl} download>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>

        <div className="border rounded-lg bg-gray-50 dark:bg-gray-800 overflow-auto h-[600px] flex items-center justify-center">
          {documentUrl ? (
            <iframe
              src={documentUrl}
              className="w-full h-full"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
              title="Invoice Document"
            />
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No document preview available
            </p>
          )}
        </div>
      </div>

      {/* Right: Structured Data (Editable) */}
      <div className="space-y-6 overflow-y-auto max-h-[700px]">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Extracted Data
          </h3>
          {onRerunAnalysis && (
            <Button variant="outline" size="sm" onClick={onRerunAnalysis}>
              <RotateCw className="h-4 w-4 mr-2" />
              Re-run
            </Button>
          )}
        </div>

        {/* Vendor Info */}
        <div className="space-y-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="font-medium text-gray-900 dark:text-white">Vendor Information</h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="vendor_name">Vendor Name</Label>
              <Badge className={cn('text-xs', getConfidenceColor(invoiceData.confidence?.vendor_name))}>
                {invoiceData.confidence?.vendor_name ? Math.round(invoiceData.confidence.vendor_name * 100) + '%' : 'N/A'}
              </Badge>
            </div>
            <Input
              id="vendor_name"
              value={invoiceData.vendor_name || ''}
              onChange={(e) => onChange('vendor_name', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor_address">Vendor Address</Label>
            <Input
              id="vendor_address"
              value={invoiceData.vendor_address || ''}
              onChange={(e) => onChange('vendor_address', e.target.value)}
            />
          </div>
        </div>

        {/* Invoice Details */}
        <div className="space-y-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="font-medium text-gray-900 dark:text-white">Invoice Details</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="invoice_number">Invoice #</Label>
                <Badge className={cn('text-xs', getConfidenceColor(invoiceData.confidence?.invoice_number))}>
                  {invoiceData.confidence?.invoice_number ? Math.round(invoiceData.confidence.invoice_number * 100) + '%' : 'N/A'}
                </Badge>
              </div>
              <Input
                id="invoice_number"
                value={invoiceData.invoice_number || ''}
                onChange={(e) => onChange('invoice_number', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice_date">Invoice Date</Label>
              <Input
                id="invoice_date"
                type="date"
                value={invoiceData.invoice_date || ''}
                onChange={(e) => onChange('invoice_date', e.target.value)}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={invoiceData.due_date || ''}
                onChange={(e) => onChange('due_date', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Line Items */}
        {invoiceData.line_items && invoiceData.line_items.length > 0 && (
          <div className="space-y-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white">Line Items</h4>
            
            {invoiceData.line_items.map((item, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor={`item_desc_${idx}`}>Description</Label>
                  <Input
                    id={`item_desc_${idx}`}
                    value={item.description}
                    onChange={(e) => handleLineItemChange(idx, 'description', e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor={`item_qty_${idx}`}>Qty</Label>
                    <Input
                      id={`item_qty_${idx}`}
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleLineItemChange(idx, 'quantity', parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`item_rate_${idx}`}>Rate</Label>
                    <Input
                      id={`item_rate_${idx}`}
                      type="number"
                      step="0.01"
                      value={item.rate}
                      onChange={(e) => handleLineItemChange(idx, 'rate', parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`item_amount_${idx}`}>Amount</Label>
                    <Input
                      id={`item_amount_${idx}`}
                      type="number"
                      step="0.01"
                      value={item.amount}
                      disabled
                      className="bg-gray-100 dark:bg-gray-700"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Totals */}
        <div className="space-y-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <h4 className="font-medium text-gray-900 dark:text-white">Totals</h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="subtotal">Subtotal</Label>
              <Input
                id="subtotal"
                type="number"
                step="0.01"
                value={invoiceData.subtotal || 0}
                onChange={(e) => onChange('subtotal', parseFloat(e.target.value))}
                className="w-32 text-right"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="tax">Tax</Label>
              <Input
                id="tax"
                type="number"
                step="0.01"
                value={invoiceData.tax || 0}
                onChange={(e) => {
                  const tax = parseFloat(e.target.value)
                  onChange('tax', tax)
                  onChange('total', (invoiceData.subtotal || 0) + tax)
                }}
                className="w-32 text-right"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-300 dark:border-gray-600">
              <div className="flex items-center gap-2">
                <Label htmlFor="total" className="text-lg font-bold">Total</Label>
                <Badge className={cn('text-xs', getConfidenceColor(invoiceData.confidence?.total))}>
                  {invoiceData.confidence?.total ? Math.round(invoiceData.confidence.total * 100) + '%' : 'N/A'}
                </Badge>
              </div>
              <Input
                id="total"
                type="number"
                step="0.01"
                value={invoiceData.total || 0}
                onChange={(e) => onChange('total', parseFloat(e.target.value))}
                className={cn(
                  'w-32 text-right text-lg font-bold',
                  !reducedMotion && 'transition-colors duration-300'
                )}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
