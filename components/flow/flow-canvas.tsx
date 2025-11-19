'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Upload, Zap, Eye, CheckCircle2, Cloud } from 'lucide-react'

export type FlowStep = 'upload' | 'analyze' | 'preview' | 'review' | 'sync'

interface FlowCanvasProps {
  currentStep: FlowStep
  children: React.ReactNode
  className?: string
}

const steps: { key: FlowStep; label: string; icon: React.ComponentType<any> }[] = [
  { key: 'upload', label: 'Upload', icon: Upload },
  { key: 'analyze', label: 'Analyze', icon: Zap },
  { key: 'preview', label: 'Preview', icon: Eye },
  { key: 'review', label: 'Review', icon: CheckCircle2 },
  { key: 'sync', label: 'Sync', icon: Cloud },
]

export function FlowCanvas({ currentStep, children, className }: FlowCanvasProps) {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mediaQuery.matches)
    
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  const currentStepIndex = steps.findIndex(s => s.key === currentStep)

  return (
    <div className={cn('mx-auto max-w-[1100px] space-y-8', className)}>
      {/* Progress Timeline */}
      <div className="relative">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => {
            const Icon = step.icon
            const isActive = idx === currentStepIndex
            const isCompleted = idx < currentStepIndex
            
            return (
              <div key={step.key} className="flex flex-col items-center flex-1">
                <div className="relative flex items-center w-full">
                  {/* Connecting line (left) */}
                  {idx > 0 && (
                    <div className={cn(
                      'absolute right-1/2 top-1/2 h-0.5 w-full -translate-y-1/2',
                      isCompleted ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gray-200 dark:bg-gray-700',
                      !reducedMotion && 'transition-colors duration-500'
                    )} />
                  )}
                  
                  {/* Step circle */}
                  <div className={cn(
                    'relative z-10 mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2',
                    isActive && 'border-blue-500 bg-blue-500 text-white scale-110',
                    isCompleted && 'border-green-500 bg-green-500 text-white',
                    !isActive && !isCompleted && 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-400',
                    !reducedMotion && 'transition-all duration-300'
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  
                  {/* Connecting line (right) */}
                  {idx < steps.length - 1 && (
                    <div className={cn(
                      'absolute left-1/2 top-1/2 h-0.5 w-full -translate-y-1/2',
                      isCompleted ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gray-200 dark:bg-gray-700',
                      !reducedMotion && 'transition-colors duration-500'
                    )} />
                  )}
                </div>
                
                {/* Step label */}
                <span className={cn(
                  'mt-2 text-sm font-medium',
                  isActive && 'text-blue-600 dark:text-blue-400',
                  isCompleted && 'text-green-600 dark:text-green-400',
                  !isActive && !isCompleted && 'text-gray-500 dark:text-gray-400'
                )}>
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Flow content */}
      <div className={cn(
        'rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg p-8',
        !reducedMotion && 'transition-all duration-300'
      )}>
        {children}
      </div>
    </div>
  )
}
