import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}

export function getConfidenceColor(confidence: number): string {
  // Handle both 0-1 and 0-100 ranges
  const normalizedConfidence = confidence > 1 ? confidence / 100 : confidence
  
  if (normalizedConfidence >= 0.9) return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950'
  if (normalizedConfidence >= 0.7) return 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950'
  return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950'
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    inbox: 'bg-gray-100 text-gray-800',
    needs_review: 'bg-amber-100 text-amber-800',
    approved: 'bg-green-100 text-green-800',
    synced: 'bg-blue-100 text-blue-800',
    rejected: 'bg-red-100 text-red-800',
    duplicate: 'bg-purple-100 text-purple-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    inbox: 'Inbox',
    needs_review: 'Needs Review',
    approved: 'Approved',
    synced: 'Synced',
    rejected: 'Rejected',
    duplicate: 'Duplicate',
  }
  return labels[status] || status
}

export function calculateLineTotal(
  quantity: number,
  unitPrice: number,
  tax: number
): number {
  return quantity * unitPrice + tax
}

export function validateInvoiceTotals(
  lineItems: Array<{ amount: number }>,
  subtotal: number,
  taxTotal: number,
  discount: number,
  total: number
): { isValid: boolean; message?: string } {
  const calculatedSubtotal = lineItems.reduce((sum, item) => sum + item.amount, 0)
  const calculatedTotal = calculatedSubtotal + taxTotal - discount

  const tolerance = 0.01 // Allow 1 cent difference for rounding

  if (Math.abs(calculatedSubtotal - subtotal) > tolerance) {
    return {
      isValid: false,
      message: `Subtotal mismatch: line items sum to ${formatCurrency(
        calculatedSubtotal
      )}, but subtotal is ${formatCurrency(subtotal)}`,
    }
  }

  if (Math.abs(calculatedTotal - total) > tolerance) {
    return {
      isValid: false,
      message: `Total mismatch: calculated total is ${formatCurrency(
        calculatedTotal
      )}, but total is ${formatCurrency(total)}`,
    }
  }

  return { isValid: true }
}

export function fuzzyMatch(str1: string, str2: string): number {
  // Simple Levenshtein distance-based similarity
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1

  if (longer.length === 0) return 1.0

  const editDistance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase())
  return (longer.length - editDistance) / longer.length
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}

export function detectDuplicateInvoice(
  invoice: {
    vendor_id?: string
    invoice_number?: string
    total: number
    invoice_date?: string
  },
  existingInvoices: Array<{
    vendor_id?: string
    invoice_number?: string
    total: number
    invoice_date?: string
  }>,
  windowDays: number = 90
): { isDuplicate: boolean; matches: any[] } {
  const matches = existingInvoices.filter((existing) => {
    // Same vendor
    if (invoice.vendor_id && invoice.vendor_id !== existing.vendor_id) {
      return false
    }

    // Invoice number match (if both present)
    if (invoice.invoice_number && existing.invoice_number) {
      if (invoice.invoice_number === existing.invoice_number) {
        return true
      }
    }

    // Amount match (within 1%)
    const amountDiff = Math.abs(invoice.total - existing.total)
    const amountThreshold = invoice.total * 0.01
    if (amountDiff > amountThreshold) {
      return false
    }

    // Date proximity check
    if (invoice.invoice_date && existing.invoice_date) {
      const date1 = new Date(invoice.invoice_date)
      const date2 = new Date(existing.invoice_date)
      const daysDiff = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24)
      if (daysDiff > windowDays) {
        return false
      }
    }

    return true
  })

  return {
    isDuplicate: matches.length > 0,
    matches,
  }
}

export async function uploadFile(
  file: File,
  companyId: string,
  supabase: any
): Promise<{ url: string; error?: string }> {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${companyId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(fileName, file)

    if (uploadError) {
      throw uploadError
    }

    const { data } = supabase.storage.from('invoices').getPublicUrl(fileName)

    return { url: data.publicUrl }
  } catch (error: any) {
    return { url: '', error: error.message }
  }
}
