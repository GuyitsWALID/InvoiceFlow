"use client"

import * as React from "react"
import { Upload, HardDrive, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"
import { useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { useRouter } from "next/navigation"
import { GoogleDrivePicker } from "./google-drive-picker"
import { DropboxPicker } from "./dropbox-picker"

interface UploadInvoiceDialogProps {
  onUploadComplete?: () => void
}

export function UploadInvoiceDialog({ onUploadComplete }: UploadInvoiceDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [googleTokens, setGoogleTokens] = React.useState<any>(null)
  const [showGooglePicker, setShowGooglePicker] = React.useState(false)
  const [dropboxTokens, setDropboxTokens] = React.useState<any>(null)
  const [showDropboxPicker, setShowDropboxPicker] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()
  const searchParams = useSearchParams()

  // Check for Google and Dropbox tokens in URL on mount
  React.useEffect(() => {
    const googleTokensParam = searchParams.get('google_tokens')
    const dropboxTokensParam = searchParams.get('dropbox_tokens')
    
    if (googleTokensParam) {
      try {
        const tokens = JSON.parse(decodeURIComponent(googleTokensParam))
        setGoogleTokens(tokens)
        setShowGooglePicker(true)
        setOpen(true)
        // Clean up URL
        window.history.replaceState({}, '', '/dashboard/inbox')
      } catch (err) {
        console.error('Failed to parse Google tokens:', err)
      }
    }
    
    if (dropboxTokensParam) {
      try {
        const tokens = JSON.parse(decodeURIComponent(dropboxTokensParam))
        setDropboxTokens(tokens)
        setShowDropboxPicker(true)
        setOpen(true)
        // Clean up URL
        window.history.replaceState({}, '', '/dashboard/inbox')
      } catch (err) {
        console.error('Failed to parse Dropbox tokens:', err)
      }
    }
  }, [searchParams])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const validFiles = files.filter(file => {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
      return validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024 // 10MB max
    })

    if (validFiles.length !== files.length) {
      setError('Some files were skipped. Only PDF and images under 10MB are allowed.')
    } else {
      setError(null)
    }

    setSelectedFiles(prev => [...prev, ...validFiles])
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setUploading(true)
    setError(null)
    setProgress(0)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('You must be logged in to upload files')
        setUploading(false)
        return
      }

      // Get user's company_id
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', session.user.id)
        .single()

      if (!userData) {
        setError('User profile not found')
        setUploading(false)
        return
      }

      const totalFiles = selectedFiles.length
      let uploadedCount = 0

      for (const file of selectedFiles) {
        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${userData.company_id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('invoices')
          .upload(filePath, file)

        if (uploadError) {
          console.error('Upload error:', uploadError)
          continue
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('invoices')
          .getPublicUrl(filePath)

        // Create invoice record
        const { data: newInvoice, error: insertError } = await supabase.from('invoices').insert({
          company_id: userData.company_id,
          attachment_urls: [publicUrl],
          mime_types: [file.type],
          total: 0,
          status: 'inbox',
          confidence: { overall: 0, fields: {} },
        }).select('id').single()

        if (insertError) {
          // Surface detailed insert errors in the browser console for debugging (RLS or validation issues)
          try {
            console.error('Invoice insert error:', JSON.stringify(insertError))
          } catch (e) {
            console.error('Invoice insert error (non-serializable):', insertError)
          }
          setError('Failed to create invoice record: ' + (insertError.message || JSON.stringify(insertError)))
          // Skip triggering OCR for this file
          uploadedCount++
          setProgress((uploadedCount / totalFiles) * 100)
          continue
        }

        // Trigger OCR processing automatically
        if (newInvoice?.id) {
          fetch('/api/process-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoice_id: newInvoice.id })
          }).catch(err => console.error('Failed to trigger OCR:', err))
        }

        uploadedCount++
        setProgress((uploadedCount / totalFiles) * 100)
      }

      // Success
      setOpen(false)
      setSelectedFiles([])
      setProgress(0)
      if (onUploadComplete) {
        onUploadComplete()
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to upload files')
    } finally {
      setUploading(false)
    }
  }

  const handleGoogleDrive = () => {
    // Redirect to Google OAuth
    window.location.href = '/api/auth/google'
  }

  const handleGoogleFilesSelected = async (googleFiles: any[]) => {
    setUploading(true)
    setError(null)
    setProgress(0)
    setShowGooglePicker(false)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('You must be logged in to upload files')
        setUploading(false)
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', session.user.id)
        .single()

      if (!userData) {
        setError('User profile not found')
        setUploading(false)
        return
      }

      const totalFiles = googleFiles.length
      let uploadedCount = 0

      for (const googleFile of googleFiles) {
        try {
          // Download file from Google Drive
          const downloadResponse = await fetch('/api/google-drive/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tokens: googleTokens,
              fileId: googleFile.id,
              fileName: googleFile.name,
            }),
          })

          if (!downloadResponse.ok) {
            console.error(`Failed to download ${googleFile.name}`)
            continue
          }

          const blob = await downloadResponse.blob()
          const file = new File([blob], googleFile.name, { type: googleFile.mimeType })

          // Upload to Supabase Storage
          const fileExt = googleFile.name.split('.').pop()
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
          const filePath = `${userData.company_id}/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('invoices')
            .upload(filePath, file)

          if (uploadError) {
            console.error('Upload error:', uploadError)
            continue
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('invoices')
            .getPublicUrl(filePath)

          // Create invoice record
          const { data: newInvoice, error: insertError } = await supabase.from('invoices').insert({
            company_id: userData.company_id,
            attachment_urls: [publicUrl],
            mime_types: [googleFile.mimeType],
            total: 0,
            status: 'inbox',
            confidence: { overall: 0, fields: {} },
          }).select('id').single()

          if (insertError) {
            try {
              console.error(`Invoice insert error for ${googleFile.name}:`, JSON.stringify(insertError))
            } catch (e) {
              console.error(`Invoice insert error for ${googleFile.name}: (non-serializable)`, insertError)
            }
            setError('Failed to create invoice record: ' + (insertError.message || JSON.stringify(insertError)))
            uploadedCount++
            setProgress((uploadedCount / totalFiles) * 100)
            continue
          }

          // Trigger OCR processing automatically
          if (newInvoice?.id) {
            fetch('/api/process-invoice', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ invoice_id: newInvoice.id })
            }).catch(err => console.error('Failed to trigger OCR:', err))
          }

          uploadedCount++
          setProgress((uploadedCount / totalFiles) * 100)
        } catch (err) {
          console.error(`Error processing ${googleFile.name}:`, err)
        }
      }

      // Success
      setOpen(false)
      setGoogleTokens(null)
      setProgress(0)
      if (onUploadComplete) {
        onUploadComplete()
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to upload files from Google Drive')
    } finally {
      setUploading(false)
    }
  }

  const handleDropbox = () => {
    // Redirect to Dropbox OAuth
    window.location.href = '/api/auth/dropbox'
  }

  const handleDropboxFilesSelected = async (dropboxFiles: any[]) => {
    setUploading(true)
    setError(null)
    setProgress(0)
    setShowDropboxPicker(false)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('You must be logged in to upload files')
        setUploading(false)
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', session.user.id)
        .single()

      if (!userData) {
        setError('User profile not found')
        setUploading(false)
        return
      }

      const totalFiles = dropboxFiles.length
      let uploadedCount = 0

      for (const dropboxFile of dropboxFiles) {
        try {
          // Download file from Dropbox
          const downloadResponse = await fetch('/api/dropbox/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tokens: dropboxTokens,
              path: dropboxFile.path_display,
            }),
          })

          if (!downloadResponse.ok) {
            console.error(`Failed to download ${dropboxFile.name}`)
            continue
          }

          const blob = await downloadResponse.blob()
          const mimeType = blob.type || 'application/octet-stream'
          const file = new File([blob], dropboxFile.name, { type: mimeType })

          // Upload to Supabase Storage
          const fileExt = dropboxFile.name.split('.').pop()
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
          const filePath = `${userData.company_id}/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('invoices')
            .upload(filePath, file)

          if (uploadError) {
            console.error('Upload error:', uploadError)
            continue
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('invoices')
            .getPublicUrl(filePath)

          // Create invoice record
          const { data: newInvoice, error: insertError } = await supabase.from('invoices').insert({
            company_id: userData.company_id,
            attachment_urls: [publicUrl],
            mime_types: [mimeType],
            total: 0,
            status: 'inbox',
            confidence: { overall: 0, fields: {} },
          }).select('id').single()

          if (insertError) {
            try {
              console.error(`Invoice insert error for ${dropboxFile.name}:`, JSON.stringify(insertError))
            } catch (e) {
              console.error(`Invoice insert error for ${dropboxFile.name}: (non-serializable)`, insertError)
            }
            setError('Failed to create invoice record: ' + (insertError.message || JSON.stringify(insertError)))
            uploadedCount++
            setProgress((uploadedCount / totalFiles) * 100)
            continue
          }

          // Trigger OCR processing automatically
          if (newInvoice?.id) {
            fetch('/api/process-invoice', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ invoice_id: newInvoice.id })
            }).catch(err => console.error('Failed to trigger OCR:', err))
          }

          uploadedCount++
          setProgress((uploadedCount / totalFiles) * 100)
        } catch (err) {
          console.error(`Error processing ${dropboxFile.name}:`, err)
        }
      }

      // Success
      setOpen(false)
      setDropboxTokens(null)
      setProgress(0)
      if (onUploadComplete) {
        onUploadComplete()
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to upload files from Dropbox')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {showGooglePicker ? 'Select from Google Drive' : showDropboxPicker ? 'Select from Dropbox' : 'Upload Invoices'}
          </DialogTitle>
          <DialogDescription>
            {showGooglePicker 
              ? 'Choose invoices from your Google Drive to import'
              : showDropboxPicker
              ? 'Choose invoices from your Dropbox to import'
              : 'Upload invoices from your device or connect to cloud storage.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 sm:py-4 overflow-y-auto flex-1">
          {/* Google Drive Picker */}
          {showGooglePicker && googleTokens ? (
            <GoogleDrivePicker
              tokens={googleTokens}
              onFilesSelected={handleGoogleFilesSelected}
              onCancel={() => {
                setShowGooglePicker(false)
                setGoogleTokens(null)
              }}
            />
          ) : showDropboxPicker && dropboxTokens ? (
            <DropboxPicker
              tokens={dropboxTokens}
              onFilesSelected={handleDropboxFilesSelected}
              onCancel={() => {
                setShowDropboxPicker(false)
                setDropboxTokens(null)
              }}
            />
          ) : (
            <>
          {/* Upload Methods */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <Button
              variant="outline"
              className="h-20 sm:h-24 flex flex-col items-center justify-center space-y-1.5 sm:space-y-2 hover:bg-accent transition-colors"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <HardDrive className="h-10 w-10 sm:h-8 sm:w-8 text-gray-600 dark:text-gray-400" />
              <span className="text-xs sm:text-sm font-medium">Local Files</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 sm:h-24 flex flex-col items-center justify-center space-y-1.5 sm:space-y-2 hover:bg-accent transition-colors"
              onClick={handleDropbox}
              disabled={uploading}
            >
              <div className="relative h-6 w-6 sm:h-8 sm:w-8 flex items-center justify-center">
                <Image
                  src="/dropbox-icon.svg"
                  alt="Dropbox"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <span className="text-xs sm:text-sm font-medium">Dropbox</span>
            </Button>

            <Button
              variant="outline"
              className="col-span-2 h-20 sm:h-24 flex flex-col items-center justify-center space-y-1.5 sm:space-y-2 hover:bg-accent transition-colors"
              onClick={handleGoogleDrive}
              disabled={uploading}
            >
              <div className="relative h-6 w-6 sm:h-8 sm:w-8 flex items-center justify-center">
                <Image
                  src="/Google_Drive_icon_(2020).svg"
                  alt="Google Drive"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <span className="text-xs sm:text-sm font-medium">Google Drive</span>
            </Button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            disabled={uploading}
          />

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Selected Files ({selectedFiles.length})</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md"
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <Upload className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm truncate">{file.name}</span>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={uploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-800 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Upload Button */}
          {selectedFiles.length > 0 && (
            <Button
              className="w-full"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} File${selectedFiles.length > 1 ? 's' : ''}`}
            </Button>
          )}

          {/* Info */}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Supported formats: PDF, JPG, PNG. Maximum file size: 10MB per file.
          </p>
          </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
