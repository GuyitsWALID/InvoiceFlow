'use client'

import { Button } from '@/components/ui/button'
import { CheckCircle2, Save, XCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StickyActionBarProps {
  onAcceptAndSync?: () => void
  onAcceptOnly?: () => void
  onReject?: () => void
  isProcessing?: boolean
  hasProvider?: boolean
  className?: string
}

export function StickyActionBar({
  onAcceptAndSync,
  onAcceptOnly,
  onReject,
  isProcessing = false,
  hasProvider = false,
  className
}: StickyActionBarProps) {
  return (
    <div className={cn(
      'sticky bottom-0 left-0 right-0 z-40 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg',
      className
    )}>
      <div className="max-w-[1100px] mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Review complete?
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {hasProvider 
                ? 'Accept to sync with your accounting software' 
                : 'Accept to save or connect accounting software to sync'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {onReject && (
              <Button
                variant="outline"
                size="lg"
                onClick={onReject}
                disabled={isProcessing}
                className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <XCircle className="h-5 w-5 mr-2" />
                Reject / Edit
              </Button>
            )}

            {onAcceptOnly && !hasProvider && (
              <Button
                variant="outline"
                size="lg"
                onClick={onAcceptOnly}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Save className="h-5 w-5 mr-2" />
                )}
                Accept (Save only)
              </Button>
            )}

            {onAcceptAndSync && (
              <Button
                size="lg"
                onClick={onAcceptAndSync}
                disabled={isProcessing}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
              >
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                )}
                {hasProvider ? 'Accept & Sync' : 'Save as Approved (Pending Sync)'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
