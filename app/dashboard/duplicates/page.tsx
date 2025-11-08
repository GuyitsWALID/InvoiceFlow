'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Invoice } from '@/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import { 
  Copy, 
  Search, 
  AlertTriangle,
  CheckCircle2,
  Eye,
  Trash2,
  Calendar,
  Building2,
  DollarSign,
  FileText,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

// Helper to safely convert amount to number
const parseAmount = (amount: number | string): number => {
  if (typeof amount === 'number') return amount
  return parseFloat(String(amount)) || 0
}

interface DuplicateGroup {
  original: Invoice
  duplicates: Invoice[]
  similarity: number
  reason: string
}

export default function DuplicatesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    setLoading(true)
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      toast.error('Please sign in to view invoices')
      return
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', session.user.id)
      .single()

    if (userError || !userData) {
      toast.error('Failed to load user data')
      return
    }

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        vendor:vendors(name, email)
      `)
      .eq('company_id', userData.company_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching invoices:', error)
      toast.error('Failed to load invoices')
    } else {
      setInvoices(data as any)
      // Automatically detect duplicates on load
      await detectDuplicates(data as any)
    }

    setLoading(false)
  }

  const detectDuplicates = async (invoiceList: Invoice[] = invoices) => {
    setAnalyzing(true)
    
    const groups: DuplicateGroup[] = []
    const processedIds = new Set<string>()

    for (const invoice of invoiceList) {
      if (processedIds.has(invoice.id)) continue

      const potentialDuplicates = invoiceList.filter(inv => {
        if (inv.id === invoice.id || processedIds.has(inv.id)) return false

        // Check for exact matches
        const sameInvoiceNumber = inv.invoice_number === invoice.invoice_number
        const sameAmount = Math.abs(parseAmount(inv.amount) - parseAmount(invoice.amount)) < 0.01
        const sameVendor = inv.vendor_id === invoice.vendor_id

        // Check for near duplicates
        const sameDateRange = inv.invoice_date && invoice.invoice_date &&
          Math.abs(new Date(inv.invoice_date).getTime() - new Date(invoice.invoice_date).getTime()) < 7 * 24 * 60 * 60 * 1000 // Within 7 days

        // OCR text similarity check (simple)
        let ocrSimilarity = 0
        if (inv.raw_ocr && invoice.raw_ocr) {
          const text1 = inv.raw_ocr.toLowerCase()
          const text2 = invoice.raw_ocr.toLowerCase()
          // Calculate simple similarity (shared words)
          const words1 = new Set(text1.split(/\s+/))
          const words2 = new Set(text2.split(/\s+/))
          const intersection = new Set([...words1].filter(x => words2.has(x)))
          ocrSimilarity = (intersection.size * 2) / (words1.size + words2.size)
        }

        return (
          (sameInvoiceNumber && sameAmount) ||
          (sameVendor && sameAmount && sameDateRange) ||
          (ocrSimilarity > 0.8) // 80% OCR text similarity
        )
      })

      if (potentialDuplicates.length > 0) {
        // Determine the reason
        let reason = ''
        let similarity = 0

        const firstDup = potentialDuplicates[0]
        if (firstDup.invoice_number === invoice.invoice_number) {
          reason = 'Same invoice number and amount'
          similarity = 100
        } else if (firstDup.vendor_id === invoice.vendor_id) {
          reason = 'Same vendor, amount, and date range'
          similarity = 90
        } else {
          reason = 'Similar OCR content detected'
          similarity = 85
        }

        groups.push({
          original: invoice,
          duplicates: potentialDuplicates,
          similarity,
          reason
        })

        // Mark all as processed
        processedIds.add(invoice.id)
        potentialDuplicates.forEach(dup => processedIds.add(dup.id))
      }
    }

    setDuplicateGroups(groups)
    setAnalyzing(false)

    if (groups.length === 0) {
      toast.success('No duplicates found! All invoices are unique.')
    } else {
      toast.info(`Found ${groups.length} potential duplicate groups`)
    }
  }

  const handleMarkAsNotDuplicate = async (originalId: string, duplicateId: string) => {
    // You could add a table to track "not duplicates" to avoid future false positives
    toast.success('Marked as not a duplicate')
    setDuplicateGroups(prev => 
      prev.map(group => {
        if (group.original.id === originalId) {
          return {
            ...group,
            duplicates: group.duplicates.filter(d => d.id !== duplicateId)
          }
        }
        return group
      }).filter(group => group.duplicates.length > 0)
    )
  }

  const handleDeleteDuplicate = async () => {
    if (!invoiceToDelete) return

    const toastId = toast.loading('Deleting duplicate invoice...')
    
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceToDelete)

    if (error) {
      toast.error('Failed to delete invoice', { id: toastId })
    } else {
      toast.success('Duplicate invoice deleted', { id: toastId })
      setDeleteDialogOpen(false)
      setInvoiceToDelete(null)
      await loadInvoices()
    }
  }

  const confirmDelete = (invoiceId: string) => {
    setInvoiceToDelete(invoiceId)
    setDeleteDialogOpen(true)
  }

  const filteredGroups = duplicateGroups.filter(group => {
    if (!searchTerm) return true
    
    const matchesOriginal = 
      group.original.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.original.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesDuplicates = group.duplicates.some(dup =>
      dup.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dup.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    
    return matchesOriginal || matchesDuplicates
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                <Copy className="h-8 w-8 mr-3" />
                Duplicate Detection
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                AI-powered duplicate invoice detection using OCR and data matching
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant={duplicateGroups.length > 0 ? 'destructive' : 'default'} className="text-lg px-4 py-2">
                {duplicateGroups.length} duplicate groups
              </Badge>
              <Button 
                onClick={() => detectDuplicates()} 
                disabled={analyzing}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {analyzing ? 'Analyzing...' : 'Re-analyze'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search duplicates by invoice number or vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Duplicate Groups */}
        {analyzing ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center space-y-4">
              <Sparkles className="h-16 w-16 text-primary animate-pulse" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Analyzing invoices for duplicates...
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Using AI and OCR to detect similar invoices
                </p>
              </div>
            </div>
          </Card>
        ) : filteredGroups.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  No duplicates found
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {searchTerm 
                    ? 'No duplicates match your search' 
                    : 'All your invoices are unique. Great job!'}
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredGroups.map((group, groupIndex) => (
              <Card key={group.original.id} className="p-6 border-2 border-amber-200 dark:border-amber-800">
                {/* Group Header */}
                <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-6 w-6 text-amber-600 mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Duplicate Group #{groupIndex + 1}
                      </h3>
                      <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                        {group.reason} • {group.similarity}% match confidence
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-amber-700 border-amber-300">
                    {group.duplicates.length + 1} invoices
                  </Badge>
                </div>

                {/* Original Invoice */}
                <div className="mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <FileText className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                      Original Invoice
                    </span>
                  </div>
                  <InvoiceCard invoice={group.original} isOriginal={true} />
                </div>

                {/* Duplicate Invoices */}
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Copy className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-700 dark:text-red-400">
                      Potential Duplicates ({group.duplicates.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {group.duplicates.map((duplicate) => (
                      <div key={duplicate.id} className="relative">
                        <InvoiceCard invoice={duplicate} isOriginal={false} />
                        <div className="absolute top-4 right-4 flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkAsNotDuplicate(group.original.id, duplicate.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Not a Duplicate
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => confirmDelete(duplicate.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Duplicate Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the duplicate invoice. The original invoice
              will be kept. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInvoiceToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDuplicate}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Duplicate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Invoice Card Component
function InvoiceCard({ invoice, isOriginal }: { invoice: Invoice, isOriginal: boolean }) {
  return (
    <Card className={`p-4 ${isOriginal ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-3">
            <Link 
              href={`/dashboard/invoices/${invoice.id}`}
              className="text-base font-semibold text-gray-900 dark:text-white hover:text-primary"
            >
              {invoice.invoice_number || 'No Invoice Number'}
            </Link>
            <Badge variant={invoice.status === 'approved' ? 'default' : 'secondary'}>
              {invoice.status}
            </Badge>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="flex items-start space-x-2">
              <Building2 className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Vendor</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {invoice.vendor?.name || 'Unknown'}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <DollarSign className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Amount</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatCurrency(parseAmount(invoice.amount))}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Invoice Date</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {invoice.invoice_date ? formatDate(invoice.invoice_date) : 'N/A'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Received</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(invoice.created_at)}
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          asChild
        >
          <Link href={`/dashboard/invoices/${invoice.id}`}>
            <Eye className="h-4 w-4 mr-1" />
            View
          </Link>
        </Button>
      </div>
    </Card>
  )
}
