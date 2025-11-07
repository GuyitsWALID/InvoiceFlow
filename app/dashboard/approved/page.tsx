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
  CheckCircle2, 
  Search, 
  ChevronRight, 
  FileText, 
  Cloud, 
  CloudOff,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function ApprovedPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [syncing, setSyncing] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    setLoading(true)
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      toast.error('No session found')
      return
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', session.user.id)
      .single()

    if (userError || !userData) {
      toast.error('Failed to get user data')
      return
    }

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        vendor:vendors(name, email, address)
      `)
      .eq('company_id', userData.company_id)
      .in('status', ['approved', 'synced'])
      .order('reviewed_at', { ascending: false })

    if (!error && data) {
      setInvoices(data as any)
    } else if (error) {
      toast.error('Failed to load invoices')
      console.error('Error fetching invoices:', error)
    }

    setLoading(false)
  }

  const handleSyncToAccounting = async (invoiceId: string) => {
    setSyncing(invoiceId)
    const toastId = toast.loading('Syncing to accounting platform...')

    try {
      // TODO: Implement actual sync to QuickBooks/Xero
      // For now, just update status to 'synced'
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'synced',
          synced_at: new Date().toISOString(),
        })
        .eq('id', invoiceId)

      if (error) throw error

      toast.success('✅ Invoice synced successfully!', { id: toastId })
      await loadInvoices()
    } catch (error) {
      toast.error('Failed to sync invoice', { id: toastId })
      console.error('Sync error:', error)
    }

    setSyncing(null)
  }

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = 
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      !searchTerm
    
    if (activeTab === 'all') return matchesSearch
    if (activeTab === 'approved') return matchesSearch && invoice.status === 'approved'
    if (activeTab === 'synced') return matchesSearch && invoice.status === 'synced'
    
    return matchesSearch
  })

  const approvedCount = invoices.filter(i => i.status === 'approved').length
  const syncedCount = invoices.filter(i => i.status === 'synced').length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                Approved Invoices
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Review and sync approved invoices to your accounting platform
              </p>
            </div>
            <Button onClick={loadInvoices} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Approved</p>
                  <p className="text-2xl font-bold">{invoices.length}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Ready to Sync</p>
                  <p className="text-2xl font-bold">{approvedCount}</p>
                </div>
                <Cloud className="h-8 w-8 text-blue-600" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Already Synced</p>
                  <p className="text-2xl font-bold">{syncedCount}</p>
                </div>
                <CloudOff className="h-8 w-8 text-gray-400" />
              </div>
            </Card>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search by invoice number or vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="all">
              All ({invoices.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Ready to Sync ({approvedCount})
            </TabsTrigger>
            <TabsTrigger value="synced">
              Synced ({syncedCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {filteredInvoices.length === 0 ? (
              <Card className="p-12">
                <div className="text-center">
                  <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Approved Invoices</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {searchTerm 
                      ? 'No invoices match your search criteria'
                      : 'Approved invoices will appear here after review'
                    }
                  </p>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredInvoices.map((invoice) => (
                  <Card key={invoice.id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                      {/* Left Section - Invoice Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="text-lg font-semibold">
                            {invoice.invoice_number || 'No Invoice Number'}
                          </h3>
                          <Badge className={
                            invoice.status === 'synced' 
                              ? 'bg-green-600' 
                              : 'bg-blue-600'
                          }>
                            {invoice.status === 'synced' ? '✓ Synced' : 'Ready to Sync'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Vendor</p>
                            <p className="font-semibold">{invoice.vendor?.name || 'Unknown'}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Date</p>
                            <p className="font-semibold">
                              {invoice.invoice_date ? formatDate(invoice.invoice_date) : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Total</p>
                            <p className="font-semibold text-green-600">
                              {formatCurrency(invoice.total)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Approved</p>
                            <p className="font-semibold">
                              {invoice.reviewed_at ? formatDate(invoice.reviewed_at) : 'N/A'}
                            </p>
                          </div>
                        </div>

                        {/* AI Confidence Indicator */}
                        {invoice.confidence && (
                          <div className="mt-3 flex items-center gap-2">
                            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                              <AlertCircle className="h-3 w-3" />
                              AI Confidence: 
                              <Badge variant="outline" className="ml-1 bg-green-50 text-green-700">
                                {Math.round((invoice.confidence.overall || 0) * 100)}%
                              </Badge>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Section - Actions */}
                      <div className="flex items-center gap-3 ml-6">
                        {invoice.status === 'approved' && (
                          <Button
                            onClick={() => handleSyncToAccounting(invoice.id)}
                            disabled={syncing === invoice.id}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {syncing === invoice.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Syncing...
                              </>
                            ) : (
                              <>
                                <Cloud className="h-4 w-4 mr-2" />
                                Sync Now
                              </>
                            )}
                          </Button>
                        )}
                        
                        {invoice.status === 'synced' && (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="text-sm font-medium">
                              Synced {invoice.synced_at ? formatDate(invoice.synced_at) : ''}
                            </span>
                          </div>
                        )}

                        <Button variant="outline" asChild>
                          <Link href={`/dashboard/invoices/${invoice.id}`}>
                            View Details
                            <ChevronRight className="h-4 w-4 ml-2" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
