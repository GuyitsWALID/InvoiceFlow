import { createServerClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, CheckCircle, Clock, XCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

async function getDashboardMetrics(companyId: string) {
  const supabase = await createServerClient()

  // Get invoice counts by status
  const { data: invoices } = await supabase
    .from('invoices')
    .select('status, total, confidence')
    .eq('company_id', companyId)

  const metrics = {
    total_processed: invoices?.length || 0,
    total_value: invoices?.reduce((sum: any, inv: { total: any }) => sum + inv.total, 0) || 0,
    average_confidence: invoices?.length 
      ? invoices.reduce((sum: any, inv: { confidence: { overall: any } }) => sum + (inv.confidence?.overall || 0), 0) / invoices.length 
      : 0,
    by_status: {
      inbox: 0,
      needs_review: 0,
      approved: 0,
      synced: 0,
      rejected: 0,
      duplicate: 0,
    }
  }

  invoices?.forEach((inv: { status: string }) => {
    if (inv.status in metrics.by_status) {
      metrics.by_status[inv.status as keyof typeof metrics.by_status]++
    }
  })

  return metrics
}

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return <div>Not authenticated</div>
  }

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', session.user.id)
    .single()

  if (!userData) {
    return <div>User not found</div>
  }

  const metrics = await getDashboardMetrics(userData.company_id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's your invoice overview.</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Processed</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_processed}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.total_value)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Confidence</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(metrics.average_confidence * 100)}%</div>
            <p className="text-xs text-muted-foreground">Extraction accuracy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.by_status.needs_review}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invoices by Status</CardTitle>
            <CardDescription>Current state of your invoices</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-gray-400"></div>
                <span className="text-sm">Inbox</span>
              </div>
              <span className="text-sm font-medium">{metrics.by_status.inbox}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-amber-400"></div>
                <span className="text-sm">Needs Review</span>
              </div>
              <span className="text-sm font-medium">{metrics.by_status.needs_review}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-green-400"></div>
                <span className="text-sm">Approved</span>
              </div>
              <span className="text-sm font-medium">{metrics.by_status.approved}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-blue-400"></div>
                <span className="text-sm">Synced</span>
              </div>
              <span className="text-sm font-medium">{metrics.by_status.synced}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-red-400"></div>
                <span className="text-sm">Rejected</span>
              </div>
              <span className="text-sm font-medium">{metrics.by_status.rejected}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-purple-400"></div>
                <span className="text-sm">Duplicates</span>
              </div>
              <span className="text-sm font-medium">{metrics.by_status.duplicate}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/dashboard/inbox"
              className="block rounded-lg border p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium">Review Inbox</div>
              <div className="text-sm text-gray-600">
                {metrics.by_status.inbox} invoices waiting
              </div>
            </a>
            <a
              href="/dashboard/review"
              className="block rounded-lg border p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium">Review Low Confidence</div>
              <div className="text-sm text-gray-600">
                {metrics.by_status.needs_review} invoices need attention
              </div>
            </a>
            <a
              href="/dashboard/settings"
              className="block rounded-lg border p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium">Connect Integrations</div>
              <div className="text-sm text-gray-600">
                Set up email and accounting sync
              </div>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
