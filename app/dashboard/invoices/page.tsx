'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Invoice } from '@/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency, formatDate, getStatusColor, getConfidenceColor } from '@/lib/utils'
import { FileText, Search, Filter, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function ProcessedInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const supabase = createClient()

  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    setLoading(true)
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', session.user.id)
      .single()

    if (userError || !userData) return

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        vendor:vendors(name, email)
      `)
      .eq('company_id', userData.company_id)
      .in('status', ['inbox', 'needs_review', 'approved', 'rejected'])
      .order('created_at', { ascending: false })

    if (!error && data) {
      setInvoices(data as any)
    }

    setLoading(false)
  }

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = 
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      !searchTerm
    
    if (activeTab === 'all') return matchesSearch
    if (activeTab === 'inbox') return matchesSearch && invoice.status === 'inbox'
    if (activeTab === 'review') return matchesSearch && invoice.status === 'needs_review'
    if (activeTab === 'approved') return matchesSearch && invoice.status === 'approved'
    if (activeTab === 'rejected') return matchesSearch && invoice.status === 'rejected'
    
    return matchesSearch
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'needs_review':
        return <AlertCircle className="h-5 w-5 text-amber-600" />
      case 'rejected':
        return <FileText className="h-5 w-5 text-red-600" />
      default:
        return <Clock className="h-5 w-5 text-blue-600" />
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400'
      case 'needs_review':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400'
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400'
    }
  }

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const stats = {
    all: invoices.length,
    inbox: invoices.filter(i => i.status === 'inbox').length,
    review: invoices.filter(i => i.status === 'needs_review').length,
    approved: invoices.filter(i => i.status === 'approved').length,
    rejected: invoices.filter(i => i.status === 'rejected').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Processed Invoices</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View and manage all your processed invoices
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={loadInvoices}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            All ({stats.all})
          </TabsTrigger>
          <TabsTrigger value="inbox">
            Inbox ({stats.inbox})
          </TabsTrigger>
          <TabsTrigger value="review">
            Needs Review ({stats.review})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({stats.approved})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({stats.rejected})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Search */}
          <Card className="p-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search by invoice number or vendor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </div>
          </Card>

          {/* Invoice Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Invoices List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading invoices...</p>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <Card className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">No invoices found</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {searchTerm ? 'Try adjusting your search' : 'Upload invoices to get started'}
                </p>
              </Card>
            ) : (
              filteredInvoices.map((invoice) => (
                <Link key={invoice.id} href={`/dashboard/invoices/${invoice.id}`}>
                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                              {getStatusIcon(invoice.status)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {invoice.vendor?.name || 'Unknown Vendor'}
                              </p>
                              <Badge className={getStatusBadgeColor(invoice.status)}>
                                {getStatusLabel(invoice.status)}
                              </Badge>
                              {invoice.confidence && invoice.confidence.overall > 0 && (
                                <Badge 
                                  variant="outline" 
                                  className={getConfidenceColor(invoice.confidence.overall)}
                                >
                                  {Math.round(invoice.confidence.overall * 100)}% confidence
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 mt-1">
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Invoice #{invoice.invoice_number || 'N/A'}
                              </p>
                              {invoice.invoice_date && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {formatDate(invoice.invoice_date)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        {invoice.total !== null && invoice.total !== undefined && (
                          <div className="text-right">
                            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                              {formatCurrency(invoice.total)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(invoice.created_at)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
