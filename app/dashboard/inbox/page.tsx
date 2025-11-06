'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Invoice } from '@/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UploadInvoiceDialog } from '@/components/upload-invoice-dialog'
import { formatCurrency, formatDate, formatConfidence, getStatusColor, getConfidenceColor } from '@/lib/utils'
import { FileText, Search, Filter, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function InboxPage() {
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

    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', session.user.id)
      .single()

    if (!userData) return

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        vendor:vendors(name, email)
      `)
      .eq('company_id', userData.company_id)
      .in('status', ['inbox', 'needs_review'])
      .order('created_at', { ascending: false })

    if (!error && data) {
      setInvoices(data as any)
    }

    setLoading(false)
  }

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = 
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.vendor?.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (activeTab === 'all') return matchesSearch
    if (activeTab === 'inbox') return matchesSearch && invoice.status === 'inbox'
    if (activeTab === 'review') return matchesSearch && invoice.status === 'needs_review'
    
    return matchesSearch
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inbox</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Review and process incoming invoices</p>
        </div>
        <UploadInvoiceDialog onUploadComplete={loadInvoices} />
      </div>

      {/* Search and Filters */}
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            All ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="inbox">
            Inbox ({invoices.filter(i => i.status === 'inbox').length})
          </TabsTrigger>
          <TabsTrigger value="review">
            Needs Review ({invoices.filter(i => i.status === 'needs_review').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6 space-y-4">
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
                {searchTerm ? 'Try adjusting your search' : 'Upload your first invoice to get started'}
              </p>
              {!searchTerm && (
                <div className="mt-6">
                  <UploadInvoiceDialog onUploadComplete={loadInvoices} />
                </div>
              )}
            </Card>
          ) : (
            filteredInvoices.map((invoice) => (
              <Link key={invoice.id} href={`/dashboard/invoices/${invoice.id}`}>
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {invoice.vendor?.name || 'Unknown Vendor'}
                            </p>
                            <Badge className={getStatusColor(invoice.status)}>
                              {invoice.status === 'needs_review' ? 'Needs Review' : 'Inbox'}
                            </Badge>
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
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(invoice.total, invoice.currency)}
                        </p>
                        <div className="flex items-center space-x-1 mt-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Confidence:</span>
                          <Badge variant="outline" className={getConfidenceColor(invoice.confidence.overall)}>
                            {formatConfidence(invoice.confidence.overall)}
                          </Badge>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-600" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
