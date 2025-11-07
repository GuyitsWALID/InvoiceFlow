'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, X, FileSpreadsheet, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { PROVIDER_CONFIG, type ProviderName } from '@/lib/accounting/adapters/base'

interface AccountingSetupModalProps {
  isOpen: boolean
  onClose: () => void
  onSkip: () => void
  onConnect: (provider: ProviderName) => Promise<void>
}

export function AccountingSetupModal({
  isOpen,
  onClose,
  onSkip,
  onConnect
}: AccountingSetupModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<ProviderName | null>(null)
  const [connecting, setConnecting] = useState(false)

  const handleConnect = async () => {
    if (!selectedProvider) {
      toast.error('Please select an accounting provider')
      return
    }

    setConnecting(true)
    
    try {
      // Redirect to OAuth flow
      if (selectedProvider === 'quickbooks') {
        window.location.href = '/api/accounting/quickbooks/connect'
      } else if (selectedProvider === 'xero') {
        // TODO: Implement Xero OAuth
        toast.error('Xero integration coming soon!')
        setConnecting(false)
      } else if (selectedProvider === 'wave') {
        // TODO: Implement Wave OAuth
        toast.error('Wave integration coming soon!')
        setConnecting(false)
      }
    } catch (error) {
      toast.error('Failed to connect. Please try again.')
      console.error('Connection error:', error)
      setConnecting(false)
    }
  }

  const handleSkip = () => {
    onSkip()
    onClose()
  }

  const providers: Array<{ key: ProviderName; recommended?: boolean }> = [
    { key: 'quickbooks', recommended: true },
    { key: 'xero' },
    { key: 'wave' }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Connect your accounting software</DialogTitle>
          <DialogDescription className="text-base">
            Choose where InvoiceFlow should post approved invoices. You can skip this step and connect later from Settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Provider Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers.map(({ key, recommended }) => {
              const config = PROVIDER_CONFIG[key]
              const isSelected = selectedProvider === key
              
              return (
                <Card
                  key={key}
                  className={`
                    p-6 cursor-pointer transition-all relative
                    ${isSelected 
                      ? 'border-2 border-primary ring-2 ring-primary/20' 
                      : 'border border-gray-200 dark:border-gray-700 hover:border-primary/50'
                    }
                  `}
                  onClick={() => setSelectedProvider(key)}
                >
                  {recommended && (
                    <Badge className="absolute -top-2 -right-2 bg-green-600">
                      Recommended
                    </Badge>
                  )}
                  
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                    </div>
                  )}

                  <div className="flex items-start space-x-4">
                    {/* Provider Icon Placeholder */}
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: config.color }}
                    >
                      {config.name.substring(0, 2).toUpperCase()}
                    </div>

                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{config.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {key === 'quickbooks' && 'Most popular for small businesses'}
                        {key === 'xero' && 'Great for international teams'}
                        {key === 'wave' && 'Free accounting software'}
                      </p>
                    </div>
                  </div>
                </Card>
              )
            })}

            {/* CSV Export Option */}
            <Card
              className={`
                p-6 cursor-pointer transition-all
                ${selectedProvider === null 
                  ? 'border border-gray-200 dark:border-gray-700 hover:border-primary/50' 
                  : 'border border-gray-200 dark:border-gray-700'
                }
              `}
              onClick={() => setSelectedProvider(null)}
            >
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-lg bg-gray-500 flex items-center justify-center">
                  <FileSpreadsheet className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">Excel / CSV Export</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Export approved invoices manually
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>💡 Tip:</strong> Connecting now means approved invoices automatically appear in your accounting software. 
              You can always disconnect or change providers later in Settings.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="ghost"
              onClick={handleSkip}
              disabled={connecting}
            >
              Skip for now
            </Button>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={connecting}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              
              <Button
                onClick={handleConnect}
                disabled={!selectedProvider || connecting}
                className="min-w-[160px]"
              >
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Connect {selectedProvider && PROVIDER_CONFIG[selectedProvider].name}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
