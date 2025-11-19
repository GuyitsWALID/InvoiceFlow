'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Cloud, FileSpreadsheet, X } from 'lucide-react'

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  onConnect: (provider: string) => void
  onSkip: () => void
}

const providers = [
  { id: 'quickbooks', name: 'QuickBooks', icon: Cloud },
  { id: 'xero', name: 'Xero', icon: Cloud },
  { id: 'wave', name: 'Wave', icon: Cloud },
  { id: 'export', name: 'Export (CSV/Excel)', icon: FileSpreadsheet },
]

export function OnboardingModal({
  isOpen,
  onClose,
  onConnect,
  onSkip
}: OnboardingModalProps) {
  const [selected, setSelected] = useState<string | null>(null)

  const handleConnect = () => {
    if (selected) {
      onConnect(selected)
      onClose()
    }
  }

  const handleSkip = () => {
    onSkip()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Connect your accounting software</DialogTitle>
          <DialogDescription className="text-base pt-2">
            Connect now so we can post approved invoices directly to your books. You can skip and connect later from Settings.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-6">
          {providers.map((provider) => {
            const Icon = provider.icon
            return (
              <button
                key={provider.id}
                onClick={() => setSelected(provider.id)}
                className={`
                  relative p-6 rounded-lg border-2 transition-all
                  ${selected === provider.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                <div className="flex flex-col items-center gap-3">
                  <Icon className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {provider.name}
                  </span>
                </div>
                {selected === provider.id && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                      <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" />
                    </svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleSkip}
          >
            Skip for now
          </Button>
          <Button
            onClick={handleConnect}
            disabled={!selected}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            Connect {selected && providers.find(p => p.id === selected)?.name}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
