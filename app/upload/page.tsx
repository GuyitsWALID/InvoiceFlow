'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Upload, FileText, CheckCircle2, X, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function UploadPage() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [invoiceId, setInvoiceId] = useState<string | null>(null)
  const [fileInfo, setFileInfo] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check authentication
    const checkAuthAndFile = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // Get pending file from sessionStorage
      const pendingFileData = sessionStorage.getItem('pendingInvoiceFile')
      if (!pendingFileData) {
        // No file to upload, redirect to dashboard
        router.push('/dashboard/inbox')
        return
      }

      try {
        const fileData = JSON.parse(pendingFileData)
        setFileInfo(fileData)
        // Auto-start upload
        handleUpload(fileData)
      } catch (err) {
        console.error('Failed to parse pending file data:', err)
        setError('Failed to load file data')
      }
    }

    checkAuthAndFile()
  }, [])

  const handleUpload = async (fileData: any) => {
    setUploading(true)
    setError(null)
    setProgress(10)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('You must be logged in to upload files')
        setUploading(false)
        return
      }

      setProgress(20)

      // Get user's company_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', session.user.id)
        .single()

      if (userError || !userData) {
        setError('User profile not found. Please contact support.')
        setUploading(false)
        return
      }

      setProgress(30)

      // Check invoice limit
      const { data: companyData } = await supabase
        .from('companies')
        .select(`
          subscription_plan_id,
          subscription_plan:subscription_plans(
            display_name,
            max_invoices_per_month
          )
        `)
        .eq('id', userData.company_id)
        .single()

      if (companyData) {
        const subscriptionPlan = Array.isArray(companyData.subscription_plan)
          ? companyData.subscription_plan[0]
          : companyData.subscription_plan
        const maxInvoices = subscriptionPlan?.max_invoices_per_month
        
        if (maxInvoices && maxInvoices > 0) {
          const startOfMonth = new Date()
          startOfMonth.setDate(1)
          startOfMonth.setHours(0, 0, 0, 0)

          const { count } = await supabase
            .from('invoices')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', userData.company_id)
            .gte('created_at', startOfMonth.toISOString())

          if (count !== null && count >= maxInvoices) {
            setError(`You've reached your plan limit of ${maxInvoices} invoice${maxInvoices > 1 ? 's' : ''} per month. Upgrade to Pro for unlimited invoices!`)
            setUploading(false)
            setTimeout(() => router.push('/dashboard/plans'), 2000)
            return
          }
        }
      }

      setProgress(50)

      // Convert base64 to blob
      const response = await fetch(fileData.data)
      const blob = await response.blob()
      const file = new File([blob], fileData.name, { type: fileData.type })

      setProgress(60)

      // Upload to Supabase Storage
      const fileExt = fileData.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${userData.company_id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(filePath, file)

      if (uploadError) {
        setError('Failed to upload file: ' + uploadError.message)
        setUploading(false)
        return
      }

      setProgress(70)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('invoices')
        .getPublicUrl(filePath)

      setProgress(80)

      // Create invoice record
      const { data: newInvoice, error: insertError } = await supabase
        .from('invoices')
        .insert({
          company_id: userData.company_id,
          attachment_urls: [publicUrl],
          mime_types: [fileData.type],
          total: 0,
          status: 'inbox',
          confidence: { overall: 0, fields: {} },
        })
        .select('id')
        .single()

      if (insertError) {
        setError('Failed to create invoice record: ' + insertError.message)
        setUploading(false)
        return
      }

      setProgress(90)

      // Trigger OCR processing
      if (newInvoice?.id) {
        setInvoiceId(newInvoice.id)
        
        fetch('/api/process-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoice_id: newInvoice.id })
        })
          .then(async (response) => {
            const result = await response.json()
            if (response.ok) {
              console.log('✅ OCR completed:', result)
            } else {
              console.error('❌ OCR failed:', result)
            }
          })
          .catch(err => console.error('❌ Failed to trigger OCR:', err))
      }

      setProgress(100)
      setSuccess(true)
      
      // Clean up sessionStorage
      sessionStorage.removeItem('pendingInvoiceFile')
      
      // Redirect to invoice after a short delay
      setTimeout(() => {
        if (newInvoice?.id) {
          router.push(`/dashboard/invoices/${newInvoice.id}`)
        } else {
          router.push('/dashboard/inbox')
        }
      }, 2000)

    } catch (err: any) {
      setError(err.message || 'Failed to upload file')
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAFF] to-[#F2F6FF] dark:from-[#0B1020] dark:to-[#101329] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#3B82F6] to-[#7C3AED] rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Upload Invoice</CardTitle>
                <CardDescription>Processing your invoice file</CardDescription>
              </div>
            </div>
            <Link href="/dashboard/inbox">
              <Button variant="ghost" size="icon">
                <X className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Info */}
          {fileInfo && (
            <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Upload className="h-5 w-5 text-[#3B82F6]" />
              <div className="flex-1">
                <p className="font-medium text-sm">{fileInfo.name}</p>
                <p className="text-xs text-gray-500">
                  {(fileInfo.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          )}

          {/* Progress */}
          {uploading && !success && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Uploading and processing...</span>
                <span className="text-gray-500">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-gray-500 text-center">
                {progress < 30 && 'Preparing upload...'}
                {progress >= 30 && progress < 60 && 'Checking subscription...'}
                {progress >= 60 && progress < 80 && 'Uploading file...'}
                {progress >= 80 && progress < 100 && 'Creating invoice record...'}
                {progress === 100 && 'Finalizing...'}
              </p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="text-center space-y-4 py-6">
              <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Upload Successful!
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Your invoice is being processed with AI. You'll be redirected shortly...
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-red-800 dark:text-red-400 mb-1">
                    Upload Failed
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
              <div className="mt-4 flex space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    sessionStorage.removeItem('pendingInvoiceFile')
                    router.push('/dashboard/inbox')
                  }}
                >
                  Go to Dashboard
                </Button>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-[#3B82F6] to-[#7C3AED]"
                  onClick={() => window.location.reload()}
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
