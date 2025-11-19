'use client'

import { useState, useCallback } from 'react'
import { Upload, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface UploadCardProps {
  onFileSelect: (file: File) => void
  isProcessing?: boolean
}

export function UploadCard({ onFileSelect, isProcessing = false }: UploadCardProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0 && files[0]) {
      onFileSelect(files[0])
    }
  }, [onFileSelect])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0 && files[0]) {
      onFileSelect(files[0])
    }
  }, [onFileSelect])

  return (
    <div
      className={cn(
        'relative border-2 border-dashed rounded-2xl transition-all duration-300',
        isDragging && 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 scale-[1.02]',
        !isDragging && 'border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600',
        isProcessing && 'opacity-50 pointer-events-none'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-12 text-center space-y-6">
        <div className={cn(
          'mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center transition-transform',
          isDragging && 'scale-110'
        )}>
          <Upload className="h-10 w-10 text-blue-600 dark:text-blue-400" />
        </div>

        <div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Drop your invoice here or click to upload
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Supports PDF, PNG, JPG • Max 10MB
          </p>
        </div>

        <div className="relative">
          <input
            type="file"
            id="file-upload"
            className="sr-only"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileInput}
            disabled={isProcessing}
          />
          <Button
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 rounded-full"
            onClick={() => document.getElementById('file-upload')?.click()}
            disabled={isProcessing}
          >
            Choose File
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Lock className="h-3 w-3" />
          <span>Your files are encrypted and secure</span>
        </div>
      </div>
    </div>
  )
}
