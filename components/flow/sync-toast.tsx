'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Loader2, ExternalLink, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'failed'

interface SyncToastProps {
  status: SyncStatus
  provider?: string
  externalUrl?: string
  errorMessage?: string
  onRetry?: () => void
  onViewDetails?: () => void
  onClose?: () => void
}

export function SyncToast({
  status,
  provider = 'QuickBooks',
  externalUrl,
  errorMessage,
  onRetry,
  onViewDetails,
  onClose
}: SyncToastProps) {
  const [show, setShow] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mediaQuery.matches)
    
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (status !== 'idle') {
      setShow(true)
    }
  }, [status])

  const handleClose = () => {
    setShow(false)
    setTimeout(() => onClose?.(), 300)
  }

  if (!show) return null

  return (
    <div className={cn(
      'fixed bottom-6 right-6 z-50 w-96 rounded-lg border shadow-2xl p-6 bg-white dark:bg-gray-900',
      !reducedMotion && 'animate-in slide-in-from-bottom-5 duration-300',
      status === 'syncing' && 'border-blue-300 dark:border-blue-700',
      status === 'synced' && 'border-green-300 dark:border-green-700',
      status === 'failed' && 'border-red-300 dark:border-red-700'
    )}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {status === 'syncing' && (
              <>
                <Loader2 className={cn('h-6 w-6 text-blue-600', !reducedMotion && 'animate-spin')} />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    Posting to {provider}...
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    This may take a few moments
                  </p>
                </div>
              </>
            )}
            
            {status === 'synced' && (
              <>
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    Synced to {provider} ✓
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Invoice posted successfully
                  </p>
                </div>
              </>
            )}
            
            {status === 'failed' && (
              <>
                <XCircle className="h-6 w-6 text-red-600" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    Sync failed
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {errorMessage || 'Unable to sync invoice'}
                  </p>
                </div>
              </>
            )}
          </div>

          {status !== 'syncing' && (
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XCircle className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Actions */}
        {status === 'synced' && externalUrl && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            asChild
          >
            <a href={externalUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              View in {provider}
            </a>
          </Button>
        )}

        {status === 'failed' && (
          <div className="flex gap-2">
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={onRetry}
              >
                Retry
              </Button>
            )}
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={onViewDetails}
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                View details
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
