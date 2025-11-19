'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  FlowCanvas,
  UploadCard,
  AIAnalysisNode,
  PreviewPane,
  StickyActionBar,
  SyncToast,
  OnboardingModal,
  ConnectionBanner,
  type FlowStep,
  type AnalysisStatus,
  type SyncStatus
} from '@/components/flow'
import { toast } from 'sonner'

interface InvoiceData {
  vendor_name?: string
  vendor_address?: string
  invoice_number?: string
  invoice_date?: string
  due_date?: string
  subtotal?: number
  tax?: number
  total?: number
  line_items?: Array<{
    description: string
    quantity: number
    rate: number
    amount: number
  }>
  confidence?: {
    vendor_name?: number
    invoice_number?: number
    total?: number
  }
}

export default function HomePage() {
  const router = useRouter()
  const supabase = createClient()
  
  // Flow state
  const [currentStep, setCurrentStep] = useState<FlowStep>('upload')
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle')
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  
  // Data state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({})
  const [documentUrl, setDocumentUrl] = useState<string>()
  const [invoiceId, setInvoiceId] = useState<string>()
  
  // User & settings state
  const [userId, setUserId] = useState<string>()
  const [companyId, setCompanyId] = useState<string>()
  const [hasProvider, setHasProvider] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showConnectionBanner, setShowConnectionBanner] = useState(false)
  const [isFirstSignIn, setIsFirstSignIn] = useState(false)
  
  // Progress
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  // Check auth and provider status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/login')
        return
      }

      setUserId(session.user.id)

      const { data: userData } = await supabase
        .from('users')
        .select('company_id, created_at')
        .eq('id', session.user.id)
        .single()

      if (userData) {
        setCompanyId(userData.company_id)
        
        // Check if first sign-in (created within last 5 minutes)
        const createdAt = new Date(userData.created_at)
        const now = new Date()
        const diffMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60
        const isFirst = diffMinutes < 5
        setIsFirstSignIn(isFirst)

        // Check for connected provider
        const { data: integrations } = await supabase
          .from('company_integrations')
          .select('provider, is_active')
          .eq('company_id', userData.company_id)
          .eq('is_active', true)
          .limit(1)
          .single()

        const hasConnectedProvider = !!integrations
        setHasProvider(hasConnectedProvider)
        
        // Show onboarding modal for first-time users without provider
        if (isFirst && !hasConnectedProvider) {
          setShowOnboarding(true)
        } else if (!hasConnectedProvider) {
          setShowConnectionBanner(true)
        }
      }
    }

    checkAuth()
  }, [supabase, router])

  // Handle file upload
  const handleFileSelect = async (file: File) => {
    if (!userId || !companyId) return

    setSelectedFile(file)
    setCurrentStep('analyze')
    setAnalysisStatus('analyzing')
    setAnalysisProgress(0)
    
    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${companyId}/${Date.now()}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('invoices')
        .getPublicUrl(fileName)

      setDocumentUrl(publicUrl)

      // Simulate progress
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      // Call AI analysis API
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/analyze-invoice', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setAnalysisProgress(100)

      if (!response.ok) {
        throw new Error('Analysis failed')
      }

      const result = await response.json()
      
      // Save to database
      const { data: invoice, error: dbError } = await supabase
        .from('invoices')
        .insert({
          company_id: companyId,
          uploaded_by: userId,
          file_name: file.name,
          file_url: publicUrl,
          storage_path: fileName,
          vendor_name: result.vendor_name,
          vendor_address: result.vendor_address,
          invoice_number: result.invoice_number,
          invoice_date: result.invoice_date,
          due_date: result.due_date,
          subtotal: result.subtotal,
          tax: result.tax,
          total: result.total,
          line_items: result.line_items,
          confidence: result.confidence,
          status: result.confidence?.overall > 0.7 ? 'inbox' : 'needs_review'
        })
        .select()
        .single()

      if (dbError) throw dbError

      setInvoiceId(invoice.id)
      setInvoiceData(result)
      
      // Check if low confidence
      const hasLowConfidence = Object.values(result.confidence || {}).some(
        (conf: any) => typeof conf === 'number' && conf < 0.7
      )
      
      setAnalysisStatus(hasLowConfidence ? 'low-confidence' : 'complete')
      
      // Auto-advance to preview after 1 second
      setTimeout(() => {
        setCurrentStep('preview')
      }, 1000)

    } catch (error) {
      console.error('Upload/analysis error:', error)
      setAnalysisStatus('failed')
      toast.error('Failed to analyze invoice. Please try again.')
    }
  }

  // Handle field changes in preview
  const handleFieldChange = (field: string, value: any) => {
    setInvoiceData(prev => ({ ...prev, [field]: value }))
  }

  // Re-run analysis
  const handleRerunAnalysis = async () => {
    if (!selectedFile) return
    
    setCurrentStep('analyze')
    setAnalysisStatus('analyzing')
    setAnalysisProgress(0)
    
    // Re-trigger analysis
    await handleFileSelect(selectedFile)
  }

  // Accept & Sync
  const handleAcceptAndSync = async () => {
    if (!invoiceId || !companyId) return

    setIsProcessing(true)
    setCurrentStep('sync')

    try {
      // Update invoice status
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          status: 'approved',
          ...invoiceData,
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId
        })
        .eq('id', invoiceId)

      if (updateError) throw updateError

      if (hasProvider) {
        // Sync to accounting provider
        setSyncStatus('syncing')
        
        const syncResponse = await fetch('/api/sync-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoice_id: invoiceId,
            company_id: companyId
          })
        })

        if (!syncResponse.ok) {
          throw new Error('Sync failed')
        }

        const syncResult = await syncResponse.json()
        
        // Update with external ID
        await supabase
          .from('invoices')
          .update({
            status: 'synced',
            external_id: syncResult.external_id,
            external_url: syncResult.external_url,
            synced_at: new Date().toISOString()
          })
          .eq('id', invoiceId)

        setSyncStatus('synced')
        toast.success(`Invoice synced to ${syncResult.provider}!`)
        
        // Reset after 3 seconds
        setTimeout(() => {
          resetFlow()
        }, 3000)
      } else {
        toast.success('Invoice saved as Approved (Pending Sync)')
        setTimeout(() => {
          resetFlow()
        }, 2000)
      }
    } catch (error) {
      console.error('Accept/sync error:', error)
      setSyncStatus('failed')
      toast.error('Failed to sync invoice')
    } finally {
      setIsProcessing(false)
    }
  }

  // Accept only (no sync)
  const handleAcceptOnly = async () => {
    if (!invoiceId) return

    setIsProcessing(true)

    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'approved',
          ...invoiceData,
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId
        })
        .eq('id', invoiceId)

      if (error) throw error

      toast.success('Invoice approved and saved')
      setTimeout(() => {
        resetFlow()
      }, 1500)
    } catch (error) {
      console.error('Accept error:', error)
      toast.error('Failed to save invoice')
    } finally {
      setIsProcessing(false)
    }
  }

  // Reject invoice
  const handleReject = async () => {
    if (!invoiceId) return

    setIsProcessing(true)

    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId
        })
        .eq('id', invoiceId)

      if (error) throw error

      toast.success('Invoice rejected')
      setTimeout(() => {
        resetFlow()
      }, 1500)
    } catch (error) {
      console.error('Reject error:', error)
      toast.error('Failed to reject invoice')
    } finally {
      setIsProcessing(false)
    }
  }

  // Connect provider
  const handleConnectProvider = (provider: string) => {
    router.push(`/dashboard/settings?tab=integrations&connect=${provider}`)
  }

  // Reset flow
  const resetFlow = () => {
    setCurrentStep('upload')
    setAnalysisStatus('idle')
    setSyncStatus('idle')
    setSelectedFile(null)
    setInvoiceData({})
    setDocumentUrl(undefined)
    setInvoiceId(undefined)
    setAnalysisProgress(0)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4">
        {/* Connection Banner */}
        {showConnectionBanner && !hasProvider && (
          <div className="max-w-[1100px] mx-auto">
            <ConnectionBanner
              onConnect={() => router.push('/dashboard/settings?tab=integrations')}
              onDismiss={() => setShowConnectionBanner(false)}
            />
          </div>
        )}

        {/* Flow Canvas */}
        <FlowCanvas currentStep={currentStep}>
          {currentStep === 'upload' && (
            <UploadCard
              onFileSelect={handleFileSelect}
              isProcessing={isProcessing}
            />
          )}

          {currentStep === 'analyze' && (
            <AIAnalysisNode
              status={analysisStatus}
              progress={analysisProgress}
              fileName={selectedFile?.name}
              fields={Object.entries(invoiceData).slice(0, 6).map(([key, value]) => ({
                name: key.replace(/_/g, ' ').toUpperCase(),
                value: String(value),
                confidence: invoiceData.confidence?.[key as keyof typeof invoiceData.confidence] || 0
              }))}
              onCancel={resetFlow}
              onRerun={handleRerunAnalysis}
            />
          )}

          {currentStep === 'preview' && (
            <PreviewPane
              documentUrl={documentUrl}
              invoiceData={invoiceData}
              onChange={handleFieldChange}
              onRerunAnalysis={handleRerunAnalysis}
            />
          )}

          {currentStep === 'sync' && (
            <div className="text-center py-12 space-y-6">
              <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 flex items-center justify-center">
                <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {syncStatus === 'syncing' && 'Syncing invoice...'}
                  {syncStatus === 'synced' && 'Invoice synced successfully!'}
                  {syncStatus === 'failed' && 'Sync failed'}
                  {syncStatus === 'idle' && 'Processing...'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {syncStatus === 'syncing' && 'Posting to your accounting software'}
                  {syncStatus === 'synced' && 'Your invoice has been posted to your books'}
                  {syncStatus === 'failed' && 'Please try again or check your connection'}
                </p>
              </div>
            </div>
          )}
        </FlowCanvas>

        {/* Sticky Action Bar (shown during preview) */}
        {currentStep === 'preview' && (
          <StickyActionBar
            onAcceptAndSync={handleAcceptAndSync}
            onAcceptOnly={!hasProvider ? handleAcceptOnly : undefined}
            onReject={handleReject}
            isProcessing={isProcessing}
            hasProvider={hasProvider}
          />
        )}

        {/* Sync Toast */}
        <SyncToast
          status={syncStatus}
          provider="QuickBooks"
          onRetry={handleAcceptAndSync}
          onClose={() => setSyncStatus('idle')}
        />

        {/* Onboarding Modal */}
        <OnboardingModal
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onConnect={handleConnectProvider}
          onSkip={() => setShowConnectionBanner(true)}
        />
      </div>
    </div>
  )
}
