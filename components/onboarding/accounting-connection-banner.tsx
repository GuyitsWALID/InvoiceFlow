'use client'

import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { X, Cloud } from 'lucide-react'

interface AccountingConnectionBannerProps {
  onConnect: () => void
}

export function AccountingConnectionBanner({ onConnect }: AccountingConnectionBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
      <Cloud className="h-4 w-4 text-blue-600" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-blue-900 dark:text-blue-100">
          <strong>Connect your accounting software</strong> to automatically post approved invoices.
        </span>
        <div className="flex items-center gap-2">
          <Button
            onClick={onConnect}
            size="sm"
            variant="default"
            className="bg-blue-600 hover:bg-blue-700"
          >
            Connect now
          </Button>
          <Button
            onClick={() => setDismissed(true)}
            size="sm"
            variant="ghost"
            className="text-blue-600 hover:text-blue-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
