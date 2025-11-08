'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Invoice } from '@/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency, formatDate } from '@/lib/utils'
import { 
  FileCheck, 
  FileX, 
  Search, 
  ExternalLink, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  Calendar,
  Building2
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

// Helper to safely convert amount to number
const parseAmount = (amount: number | string): number => {
  if (typeof amount === 'number') return amount
  return parseFloat(amount) || 0
}

interface SyncedInvoice extends Invoice {
  sync_logs?: Array<{
    id: string
    provider: string
    status: string
    external_bill_id?: string
    external_bill_url?: string
    error_message?: string
    synced_at: string
  }>
}

export default function SyncedPage() {
  const [invoices, setInvoices] = useState<SyncedInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'success' | 'failed'>('all')
  const supabase = createClient()

  useEffect(() => {
    loadSyncedInvoices()
  }, [])

  const loadSyncedInvoices = async () => {
    setLoading(true)
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      toast.error('Please sign in to view synced invoices')
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

    // Fetch invoices with sync status
    const { data: invoicesData, error: invoicesError } = await supabase
      .from('invoices')
      .select(`
        *,
        vendor:vendors(name, email)
      `)
      .eq('company_id', userData.company_id)
      .in('sync_status', ['synced', 'failed'])
      .order('last_synced_at', { ascending: false })

    if (invoicesError) {
      console.error('Error fetching synced invoices:', invoicesError)
      toast.error('Failed to load synced invoices')
      setLoading(false)
      return
    }

    // Fetch sync logs for each invoice
    if (invoicesData && invoicesData.length > 0) {
      const invoiceIds = invoicesData.map(inv => inv.id)
      const { data: logsData } = await supabase
        .from('invoice_sync_logs')
        .select('*')
        .in('invoice_id', invoiceIds)
        .order('synced_at', { ascending: false })

      // Map logs to invoices
      const invoicesWithLogs = invoicesData.map(invoice => ({
        ...invoice,
        sync_logs: logsData?.filter(log => log.invoice_id === invoice.id) || []
      }))

      setInvoices(invoicesWithLogs as any)
    } else {
      setInvoices([])
    }

    setLoading(false)
  }

  const handleRetrySync = async (invoiceId: string) => {
    const toastId = toast.loading('Retrying sync...')
    
    try {
      const response = await fetch('/api/accounting/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoiceId })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast.success('Sync successful!', { id: toastId })
        await loadSyncedInvoices()
      } else {
        toast.error(`Sync failed: ${result.error}`, { id: toastId })
      }
    } catch (error) {
      toast.error('Failed to retry sync', { id: toastId })
      console.error('Retry sync error:', error)
    }
  }

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = 
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.external_bill_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      !searchTerm
    
    if (activeTab === 'all') return matchesSearch
    if (activeTab === 'success') return matchesSearch && invoice.sync_status === 'synced'
    if (activeTab === 'failed') return matchesSearch && invoice.sync_status === 'failed'
    
    return matchesSearch
  })

  const successCount = invoices.filter(inv => inv.sync_status === 'synced').length
  const failedCount = invoices.filter(inv => inv.sync_status === 'failed').length

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
                Synced Invoices
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Track all invoices synced to your accounting software
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {successCount} synced
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {failedCount} failed
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="mb-6 flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search by invoice number, vendor, or bill ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={loadSyncedInvoices}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">
              All ({invoices.length})
            </TabsTrigger>
            <TabsTrigger value="success" className="text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Successful ({successCount})
            </TabsTrigger>
            <TabsTrigger value="failed" className="text-red-700 dark:text-red-400">
              <XCircle className="h-4 w-4 mr-1" />
              Failed ({failedCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {filteredInvoices.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="flex flex-col items-center space-y-4">
                  {activeTab === 'failed' ? (
                    <FileX className="h-16 w-16 text-gray-400" />
                  ) : (
                    <FileCheck className="h-16 w-16 text-gray-400" />
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      No {activeTab === 'all' ? 'synced' : activeTab} invoices
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {activeTab === 'failed' 
                        ? 'No failed syncs found. Great job!' 
                        : 'Approved invoices will appear here after syncing to your accounting software'}
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredInvoices.map((invoice) => {
                  const latestLog = invoice.sync_logs?.[0]
                  const isSuccess = invoice.sync_status === 'synced'
                  
                  return (
                    <Card key={invoice.id} className="p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Link 
                              href={`/dashboard/invoices/${invoice.id}`}
                              className="text-lg font-semibold text-gray-900 dark:text-white hover:text-primary"
                            >
                              {invoice.invoice_number || 'N/A'}
                            </Link>
                            <Badge variant={isSuccess ? 'default' : 'destructive'}>
                              {isSuccess ? (
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                              ) : (
                                <XCircle className="h-3 w-3 mr-1" />
                              )}
                              {isSuccess ? 'Synced' : 'Failed'}
                            </Badge>
                            {latestLog && (
                              <Badge variant="outline">
                                {latestLog.provider}
                              </Badge>
                            )}
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
                              <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                              <div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Amount</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {formatCurrency(parseAmount(invoice.amount))}
                                </p>
                              </div>
                            </div>

                            <div>
                              <p className="text-xs text-gray-600 dark:text-gray-400">Synced At</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {invoice.last_synced_at 
                                  ? formatDate(invoice.last_synced_at)
                                  : 'N/A'}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-600 dark:text-gray-400">Bill ID</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {invoice.external_bill_id || 'N/A'}
                              </p>
                            </div>
                          </div>

                          {/* Error Message */}
                          {!isSuccess && latestLog?.error_message && (
                            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                              <p className="text-sm text-red-800 dark:text-red-200">
                                <span className="font-medium">Error: </span>
                                {latestLog.error_message}
                              </p>
                            </div>
                          )}

                          {/* Sync History */}
                          {invoice.sync_logs && invoice.sync_logs.length > 1 && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                Sync History ({invoice.sync_logs.length} attempts)
                              </p>
                              <div className="space-y-1">
                                {invoice.sync_logs.slice(0, 3).map((log) => (
                                  <div key={log.id} className="flex items-center space-x-2 text-xs">
                                    {log.status === 'success' ? (
                                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                                    ) : (
                                      <XCircle className="h-3 w-3 text-red-600" />
                                    )}
                                    <span className="text-gray-600 dark:text-gray-400">
                                      {formatDate(log.synced_at)}
                                    </span>
                                    <span className="text-gray-500">•</span>
                                    <span className="text-gray-600 dark:text-gray-400">
                                      {log.provider}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          {!isSuccess && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetrySync(invoice.id)}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Retry
                            </Button>
                          )}
                          {invoice.external_bill_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <a 
                                href={invoice.external_bill_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                View Bill
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <Link href={`/dashboard/invoices/${invoice.id}`}>
                              View Details
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
