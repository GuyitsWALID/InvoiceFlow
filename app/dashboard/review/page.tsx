'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Invoice } from '@/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency, formatDate, getStatusColor, getConfidenceColor } from '@/lib/utils'
import { FileText, Search, Filter, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function NeedsReviewPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    setLoading(true)
    
    console.log('📥 Loading invoices for review...')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.error('❌ No session found')
      return
    }

    console.log('🔍 Looking up user company_id for:', session.user.id)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', session.user.id)
      .single()

    if (userError || !userData) {
      console.error('❌ Failed to get user data:', userError)
      return
    }

    console.log('✅ User company_id:', userData.company_id)
    console.log('🔍 Fetching invoices needing review for company:', userData.company_id)

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        vendor:vendors(name, email)
      `)
      .eq('company_id', userData.company_id)
      .eq('status', 'needs_review')
      .order('created_at', { ascending: false })

    console.log('📊 Query result:', {
      error: error,
      count: data?.length || 0,
      invoices: data
    })

    if (!error && data) {
      console.log('✅ Setting invoices:', data.length)
      setInvoices(data as any)
    } else if (error) {
      console.error('❌ Error fetching invoices:', {
        error: error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
    }

    setLoading(false)
  }

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = 
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      !searchTerm
    
    return matchesSearch
  })

  console.log('🔍 Filtering:', {
    totalInvoices: invoices.length,
    filteredCount: filteredInvoices.length,
    searchTerm,
    invoices: invoices.map(i => ({
      id: i.id,
      status: i.status,
      invoice_number: i.invoice_number,
      vendor: i.vendor?.name || 'No vendor'
    }))
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Needs Review</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Review OCR-processed invoices and approve or reject them
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={loadInvoices}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
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

      {/* Invoice Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''} needing review
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
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">No invoices need review</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {searchTerm ? 'Try adjusting your search' : 'All invoices have been reviewed'}
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
                        <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {invoice.vendor?.name || 'Unknown Vendor'}
                          </p>
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400">
                            Needs Review
                          </Badge>
                          {invoice.confidence && invoice.confidence.overall > 0 && (
                            <Badge 
                              variant="outline" 
                              className={getConfidenceColor(invoice.confidence.overall)}
                            >
                              {Math.round(invoice.confidence.overall)}% confidence
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
                    <div className="flex flex-col items-center">
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Review</span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
