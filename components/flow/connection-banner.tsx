'use client'

import { AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ConnectionBannerProps {
  onConnect: () => void
  onDismiss: () => void
}

export function ConnectionBanner({ onConnect, onDismiss }: ConnectionBannerProps) {
  return (
    <div className="relative bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Connect an accounting tool to auto-sync approved invoices
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Set up QuickBooks, Xero, Wave, or other integrations to automatically post approved invoices to your books.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onConnect}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Connect now
          </Button>
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
