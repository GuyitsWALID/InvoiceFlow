'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import * as XLSX from 'xlsx'
import { 
  Settings, 
  Building2, 
  Link as LinkIcon, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  Trash2,
  ExternalLink,
  AlertCircle,
  Loader2,
  FileText
} from 'lucide-react'
import { PROVIDER_CONFIG, type ProviderName } from '@/lib/accounting/adapters/base'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface AccountingConnection {
  id: string
  provider: ProviderName
  provider_company_id: string
  provider_company_name: string
  is_active: boolean
  is_default: boolean
  last_synced_at: string | null
  created_at: string
  scopes: string[]
}

interface SyncLog {
  id: string
  invoice_id: string
  sync_status: 'pending' | 'processing' | 'success' | 'failed'
  external_bill_id: string | null
  error_message: string | null
  created_at: string
  completed_at: string | null
  invoice?: {
    invoice_number: string
    total: number
  }
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <SettingsPageContent />
    </Suspense>
  )
}

function SettingsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [connections, setConnections] = useState<AccountingConnection[]>([])
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [connectionToDelete, setConnectionToDelete] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)

  useEffect(() => {
    // Show success/error toasts from OAuth redirect
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success === 'quickbooks_connected') {
      toast.success('QuickBooks connected successfully! 🎉')
      // Clean up URL
      router.replace('/dashboard/settings')
    }

    if (error) {
      toast.error(decodeURIComponent(error))
      router.replace('/dashboard/settings')
    }
  }, [searchParams, router])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Get user's company
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', session.user.id)
        .single()

      if (!userData) return

      setCompanyId(userData.company_id)

      // Load accounting connections
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('accounting_connections')
        .select('*')
        .eq('company_id', userData.company_id)
        .order('created_at', { ascending: false })

      if (connectionsError) throw connectionsError
      setConnections(connectionsData || [])

      // Load recent sync logs
      const { data: logsData, error: logsError } = await supabase
        .from('invoice_sync_logs')
        .select(`
          *,
          invoice:invoices(invoice_number, total)
        `)
        .in('connection_id', (connectionsData || []).map(c => c.id))
        .order('created_at', { ascending: false })
        .limit(20)

      if (logsError) throw logsError
      setSyncLogs(logsData || [])

    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = (provider: ProviderName) => {
    if (provider === 'quickbooks') {
      window.location.href = '/api/accounting/quickbooks/connect'
    } else if (provider === 'xero') {
      toast.info('Xero integration coming soon!')
    } else if (provider === 'wave') {
      toast.info('Wave integration coming soon!')
    } else if (provider === 'excel') {
      handleConnectExcel()
    }
  }

  const handleConnectExcel = async () => {
    try {
      if (!companyId) {
        toast.error('Company not found')
        return
      }

      // Create a "connection" for Excel (no OAuth needed)
      const { data, error } = await supabase
        .from('accounting_connections')
        .insert({
          company_id: companyId,
          provider: 'excel',
          provider_company_id: companyId, // Use company ID as identifier
          provider_company_name: 'Excel Spreadsheet',
          access_token_encrypted: 'N/A', // No token needed
          scopes: [],
          is_active: true,
          is_default: activeConnections.length === 0, // Set as default if first connection
          metadata: { type: 'local_excel' }
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Excel integration connected! Invoices will be added to a downloadable spreadsheet.')
      loadData()
    } catch (error) {
      console.error('Error connecting Excel:', error)
      toast.error('Failed to connect Excel integration')
    }
  }

  const handleDisconnect = async (connectionId: string) => {
    try {
      setDisconnecting(connectionId)

      // Mark connection as inactive
      const { error } = await supabase
        .from('accounting_connections')
        .update({ is_active: false })
        .eq('id', connectionId)

      if (error) throw error

      toast.success('Connection disconnected')
      loadData()
    } catch (error) {
      console.error('Error disconnecting:', error)
      toast.error('Failed to disconnect')
    } finally {
      setDisconnecting(null)
      setConnectionToDelete(null)
    }
  }

  const handleSetDefault = async (connectionId: string) => {
    if (!companyId) return

    try {
      // Unset all defaults
      await supabase
        .from('accounting_connections')
        .update({ is_default: false })
        .eq('company_id', companyId)

      // Set new default
      const { error } = await supabase
        .from('accounting_connections')
        .update({ is_default: true })
        .eq('id', connectionId)

      if (error) throw error

      toast.success('Default connection updated')
      loadData()
    } catch (error) {
      console.error('Error setting default:', error)
      toast.error('Failed to update default')
    }
  }

  const handleRetrySync = async (logId: string) => {
    toast.info('Retry functionality coming soon!')
    // TODO: Implement retry logic
  }

  const handleExportCSV = async () => {
    try {
      toast.info('Preparing CSV export...')

      if (!companyId) {
        toast.error('Company not found')
        return
      }

      // Fetch approved invoices
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })

      if (error) throw error

      if (!invoices || invoices.length === 0) {
        toast.warning('No approved invoices to export')
        return
      }

      // Convert to CSV format
      const headers = [
        'Invoice Number',
        'Vendor Name',
        'Invoice Date',
        'Due Date',
        'Subtotal',
        'Tax',
        'Total',
        'Status',
        'Sync Status',
        'Created At'
      ]

      const rows = invoices.map(inv => {
        const extracted = inv.extracted_data || {}
        return [
          extracted.invoice_number || 'N/A',
          extracted.vendor?.name || 'N/A',
          extracted.invoice_date || 'N/A',
          extracted.due_date || 'N/A',
          extracted.subtotal || '0',
          extracted.tax || '0',
          extracted.total || '0',
          inv.status || 'N/A',
          inv.sync_status || 'not_synced',
          new Date(inv.created_at).toLocaleDateString()
        ]
      })

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      link.setAttribute('href', url)
      link.setAttribute('download', `invoices_export_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success(`Exported ${invoices.length} invoices to CSV`)
    } catch (error) {
      console.error('Error exporting CSV:', error)
      toast.error('Failed to export CSV')
    }
  }

  const handleExportExcel = async () => {
    try {
      toast.info('Preparing Excel export...')

      if (!companyId) {
        toast.error('Company not found')
        return
      }

      // Fetch approved invoices
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })

      if (error) throw error

      if (!invoices || invoices.length === 0) {
        toast.warning('No approved invoices to export')
        return
      }

      // Prepare data for Excel
      const excelData = invoices.map(inv => {
        const extracted = inv.extracted_data || {}
        return {
          'Invoice Number': extracted.invoice_number || 'N/A',
          'Vendor Name': extracted.vendor?.name || 'N/A',
          'Vendor Email': extracted.vendor?.email || 'N/A',
          'Invoice Date': extracted.invoice_date || 'N/A',
          'Due Date': extracted.due_date || 'N/A',
          'Subtotal': extracted.subtotal || 0,
          'Tax': extracted.tax || 0,
          'Total': extracted.total || 0,
          'Currency': extracted.currency || 'USD',
          'Payment Terms': extracted.payment_terms || 'N/A',
          'Status': inv.status || 'N/A',
          'Sync Status': inv.sync_status || 'not_synced',
          'External Bill ID': inv.external_bill_id || 'N/A',
          'Created At': new Date(inv.created_at).toLocaleString()
        }
      })

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(excelData)

      // Set column widths
      const colWidths = [
        { wch: 15 }, // Invoice Number
        { wch: 25 }, // Vendor Name
        { wch: 25 }, // Vendor Email
        { wch: 12 }, // Invoice Date
        { wch: 12 }, // Due Date
        { wch: 12 }, // Subtotal
        { wch: 10 }, // Tax
        { wch: 12 }, // Total
        { wch: 10 }, // Currency
        { wch: 15 }, // Payment Terms
        { wch: 12 }, // Status
        { wch: 12 }, // Sync Status
        { wch: 20 }, // External Bill ID
        { wch: 20 }  // Created At
      ]
      worksheet['!cols'] = colWidths

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoices')

      // Generate Excel file and trigger download
      XLSX.writeFile(workbook, `invoices_export_${new Date().toISOString().split('T')[0]}.xlsx`)

      toast.success(`Exported ${invoices.length} invoices to Excel`)
    } catch (error) {
      console.error('Error exporting Excel:', error)
      toast.error('Failed to export Excel')
    }
  }

  const getProviderIcon = (provider: ProviderName) => {
    const config = PROVIDER_CONFIG[provider]
    return (
      <div 
        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold"
        style={{ backgroundColor: config.color }}
      >
        {provider === 'quickbooks' ? 'QB' : 
         provider === 'xero' ? 'X' : 
         provider === 'wave' ? 'W' :
         provider === 'excel' ? 'XL' : '?'}
      </div>
    )
  }

  const availableProviders: Array<{ key: ProviderName; available: boolean }> = [
    { key: 'quickbooks', available: true },
    { key: 'xero', available: false },
    { key: 'wave', available: false },
    { key: 'excel', available: true },
  ]

  const activeConnections = connections.filter(c => c.is_active)
  const connectedProviders = new Set(activeConnections.map(c => c.provider))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-gray-900 dark:text-gray-100" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your account and integrations</p>
          </div>
        </div>

        <Tabs defaultValue="integrations" className="space-y-6">
          <TabsList>
            <TabsTrigger value="integrations">
              <LinkIcon className="w-4 h-4 mr-2" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="sync-logs">
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync Logs
            </TabsTrigger>
            <TabsTrigger value="company">
              <Building2 className="w-4 h-4 mr-2" />
              Company
            </TabsTrigger>
          </TabsList>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            {/* Connected Integrations */}
            <Card>
              <CardHeader>
                <CardTitle>Connected Accounting Software</CardTitle>
                <CardDescription>
                  Manage your accounting platform connections
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeConnections.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <LinkIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No accounting software connected</p>
                    <p className="text-sm">Connect one below to start syncing invoices</p>
                  </div>
                ) : (
                  activeConnections.map((connection) => {
                    const config = PROVIDER_CONFIG[connection.provider]
                    return (
                      <div
                        key={connection.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          {getProviderIcon(connection.provider)}
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{config.name}</h3>
                              {connection.is_default && (
                                <Badge variant="secondary">Default</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {connection.provider_company_name}
                            </p>
                            {connection.last_synced_at && (
                              <p className="text-xs text-gray-500">
                                Last synced: {new Date(connection.last_synced_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!connection.is_default && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetDefault(connection.id)}
                            >
                              Set as Default
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConnectionToDelete(connection.id)}
                            disabled={disconnecting === connection.id}
                          >
                            {disconnecting === connection.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Disconnect
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            {/* Available Integrations */}
            <Card>
              <CardHeader>
                <CardTitle>Available Integrations</CardTitle>
                <CardDescription>
                  Connect your accounting software to automatically sync invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {availableProviders.map((item) => {
                    const config = PROVIDER_CONFIG[item.key]
                    const isConnected = connectedProviders.has(item.key)

                    return (
                      <div
                        key={item.key}
                        className={cn(
                          "border rounded-lg p-4 space-y-3",
                          isConnected && "opacity-50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          {getProviderIcon(item.key)}
                          {isConnected ? (
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Connected
                            </Badge>
                          ) : !item.available ? (
                            <Badge variant="outline">Coming Soon</Badge>
                          ) : item.key === 'quickbooks' ? (
                            <Badge variant="default">Recommended</Badge>
                          ) : item.key === 'excel' ? (
                            <Badge variant="default" className="bg-green-600">Easy</Badge>
                          ) : null}
                        </div>

                        <div>
                          <h3 className="font-semibold">{config.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {item.key === 'quickbooks' && 'Most popular accounting software'}
                            {item.key === 'xero' && 'Cloud-based accounting'}
                            {item.key === 'wave' && 'Free accounting software'}
                            {item.key === 'excel' && 'Sync to Excel'}
                          </p>
                        </div>

                        <Button
                          className="w-full"
                          variant={isConnected ? "outline" : "default"}
                          disabled={isConnected || !item.available}
                          onClick={() => handleConnect(item.key)}
                        >
                          {isConnected ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Connected
                            </>
                          ) : (
                            <>
                              <LinkIcon className="w-4 h-4 mr-2" />
                              Connect {config.name}
                            </>
                          )}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sync Logs Tab */}
          <TabsContent value="sync-logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Sync Activity</CardTitle>
                <CardDescription>
                  View the history of invoice syncs to your accounting software
                </CardDescription>
              </CardHeader>
              <CardContent>
                {syncLogs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No sync activity yet</p>
                    <p className="text-sm">Approve an invoice to start syncing</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {syncLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900"
                      >
                        <div className="flex items-center gap-3">
                          {log.sync_status === 'success' && (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          )}
                          {log.sync_status === 'failed' && (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                          {log.sync_status === 'processing' && (
                            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                          )}
                          {log.sync_status === 'pending' && (
                            <AlertCircle className="w-5 h-5 text-yellow-600" />
                          )}

                          <div>
                            <p className="font-medium">
                              {log.invoice?.invoice_number || 'Unknown Invoice'}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {new Date(log.created_at).toLocaleString()}
                            </p>
                            {log.error_message && (
                              <p className="text-sm text-red-600">{log.error_message}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              log.sync_status === 'success'
                                ? 'default'
                                : log.sync_status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {log.sync_status}
                          </Badge>
                          {log.sync_status === 'failed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetrySync(log.id)}
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Retry
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Company Tab */}
          <TabsContent value="company" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Settings</CardTitle>
                <CardDescription>
                  Manage your company information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Company settings coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog open={!!connectionToDelete} onOpenChange={() => setConnectionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect accounting software?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop automatic invoice syncing. You can reconnect at any time.
              This action will not delete any data from your accounting software.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => connectionToDelete && handleDisconnect(connectionToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
