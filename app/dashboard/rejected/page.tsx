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
  FileX, 
  Search, 
  RotateCcw,
  Trash2,
  Eye,
  Calendar,
  Building2,
  DollarSign
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

// Helper to safely convert amount to number
const parseAmount = (amount: number | string): number => {
  if (typeof amount === 'number') return amount
  return parseFloat(amount) || 0
}

export default function RejectedPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadRejectedInvoices()
  }, [])

  const loadRejectedInvoices = async () => {
    setLoading(true)
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      toast.error('Please sign in to view rejected invoices')
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
      .eq('status', 'rejected')
      .order('reviewed_at', { ascending: false })

    if (error) {
      console.error('Error fetching rejected invoices:', error)
      toast.error('Failed to load rejected invoices')
    } else {
      setInvoices(data as any)
    }

    setLoading(false)
  }

  const handleMoveToReview = async (invoiceId: string) => {
    const toastId = toast.loading('Moving to review...')
    
    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'needs_review',
        reviewed_at: null
      })
      .eq('id', invoiceId)

    if (error) {
      toast.error('Failed to move invoice to review', { id: toastId })
    } else {
      toast.success('Invoice moved to review', { id: toastId })
      await loadRejectedInvoices()
    }
  }

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return

    const toastId = toast.loading('Deleting invoice...')
    
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceToDelete)

    if (error) {
      toast.error('Failed to delete invoice', { id: toastId })
    } else {
      toast.success('Invoice deleted permanently', { id: toastId })
      setDeleteDialogOpen(false)
      setInvoiceToDelete(null)
      await loadRejectedInvoices()
    }
  }

  const confirmDelete = (invoiceId: string) => {
    setInvoiceToDelete(invoiceId)
    setDeleteDialogOpen(true)
  }

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = 
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      !searchTerm
    
    return matchesSearch
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Rejected Invoices
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Invoices that have been rejected and need attention
              </p>
            </div>
            <Badge variant="destructive" className="text-lg px-4 py-2">
              {invoices.length} rejected
            </Badge>
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
              placeholder="Search by invoice number or vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Invoice List */}
        {filteredInvoices.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center space-y-4">
              <FileX className="h-16 w-16 text-gray-400" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  No rejected invoices
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {searchTerm 
                    ? 'No rejected invoices match your search' 
                    : 'Great! You have no rejected invoices.'}
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredInvoices.map((invoice) => (
              <Card key={invoice.id} className="p-6 hover:shadow-lg transition-shadow border-l-4 border-l-red-500">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Link 
                        href={`/dashboard/invoices/${invoice.id}`}
                        className="text-lg font-semibold text-gray-900 dark:text-white hover:text-primary"
                      >
                        {invoice.invoice_number || 'No Invoice Number'}
                      </Link>
                      <Badge variant="destructive">
                        Rejected
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
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
                          <p className="text-xs text-gray-600 dark:text-gray-400">Received</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatDate(invoice.created_at)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Rejected At</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {invoice.reviewed_at 
                            ? formatDate(invoice.reviewed_at)
                            : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Rejection Reason (if notes exist) */}
                    {invoice.notes && (
                      <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                        <p className="text-sm text-red-800 dark:text-red-200">
                          <span className="font-medium">Reason: </span>
                          {invoice.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end space-y-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMoveToReview(invoice.id)}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Move to Review
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <Link href={`/dashboard/invoices/${invoice.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => confirmDelete(invoice.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
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
            <AlertDialogTitle>Delete Invoice Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the invoice
              and all associated data from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInvoiceToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInvoice}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
