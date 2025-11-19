'use client'

import { useState, useEffect } from 'react'
import { Zap, Loader2, AlertCircle, CheckCircle2, Pause, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export type AnalysisStatus = 'idle' | 'analyzing' | 'complete' | 'low-confidence' | 'failed'

interface ConfidenceField {
  name: string
  value: string
  confidence: number
}

interface AIAnalysisNodeProps {
  status: AnalysisStatus
  progress: number
  fields?: ConfidenceField[]
  fileName?: string
  onPause?: () => void
  onCancel?: () => void
  onRerun?: () => void
}

export function AIAnalysisNode({
  status,
  progress,
  fields = [],
  fileName,
  onPause,
  onCancel,
  onRerun
}: AIAnalysisNodeProps) {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mediaQuery.matches)
    
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-100 dark:bg-green-900/30'
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30'
    return 'text-red-600 bg-red-100 dark:bg-red-900/30'
  }

  return (
    <div className="space-y-6">
      {/* File Info */}
      {fileName && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {fileName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              File received — analyzing now
            </p>
          </div>
        </div>
      )}

      {/* Analysis Progress */}
      {status === 'analyzing' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Loader2 className={cn(
              'h-6 w-6 text-blue-600',
              !reducedMotion && 'animate-spin'
            )} />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Analyzing… extracting vendor, totals, and line items
              </p>
              <Progress value={progress} className="mt-2" />
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-2">
            {onPause && (
              <Button variant="outline" size="sm" onClick={onPause}>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            )}
            {onCancel && (
              <Button variant="outline" size="sm" onClick={onCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Complete - Show Fields with Confidence */}
      {(status === 'complete' || status === 'low-confidence') && fields.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Extraction complete
              </p>
            </div>
            {onRerun && (
              <Button variant="outline" size="sm" onClick={onRerun}>
                Re-run analysis
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field, idx) => (
              <div
                key={idx}
                className={cn(
                  'p-4 rounded-lg border',
                  field.confidence < 0.7 && 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/10'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                    {field.name}
                  </p>
                  <span className={cn(
                    'text-xs font-bold px-2 py-1 rounded',
                    getConfidenceColor(field.confidence)
                  )}>
                    {Math.round(field.confidence * 100)}%
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {field.value}
                </p>
                {field.confidence < 0.7 && (
                  <p className="text-xs text-yellow-700 dark:text-yellow-500 mt-1">
                    Low confidence — please verify this field
                  </p>
                )}
              </div>
            ))}
          </div>

          {status === 'low-confidence' && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                  Low confidence on some fields
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                  Please review the highlighted fields carefully before proceeding
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Failed */}
      {status === 'failed' && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900 dark:text-red-200">
              Analysis failed
            </p>
            <p className="text-xs text-red-700 dark:text-red-400 mt-1">
              Unable to extract data from this invoice. Please try again or upload a different file.
            </p>
          </div>
          {onRerun && (
            <Button variant="outline" size="sm" onClick={onRerun} className="flex-shrink-0">
              Retry
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
