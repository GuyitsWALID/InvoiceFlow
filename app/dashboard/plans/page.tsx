'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Loader2, Sparkles, Building2, Users as UsersIcon, Crown } from 'lucide-react'
import { toast } from 'sonner'

interface SubscriptionPlan {
  id: string
  name: string
  display_name: string
  description: string
  price_monthly: number
  price_yearly: number
  max_team_members: number
  features: string[]
  is_popular?: boolean
}

interface Company {
  id: string
  name: string
  plan_id: string
  active_members_count: number
  subscription_plan: {
    name: string
    display_name: string
    max_team_members: number
  }
}

export default function PlansPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [company, setCompany] = useState<Company | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [upgradingTo, setUpgradingTo] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load current user and company
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/auth/signin'
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', session.user.id)
        .single()

      if (userData?.company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select(`
            *,
            subscription_plan:subscription_plans(
              name,
              display_name,
              max_team_members
            )
          `)
          .eq('id', userData.company_id)
          .single()

        setCompany(companyData as Company)
      }

      // Load all available plans
      const { data: plansData } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true })

      if (plansData) {
        setPlans(plansData.map(plan => ({
          ...plan,
          is_popular: plan.name === 'PROFESSIONAL'
        })))
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading plans:', error)
      toast.error('Failed to load subscription plans')
      setLoading(false)
    }
  }

  const handleUpgrade = async (planId: string) => {
    if (!company) return

    setUpgradingTo(planId)

    try {
      // TODO: Integrate with Stripe or other payment provider
      // For now, show a placeholder message
      toast.info('Payment integration coming soon!', {
        description: 'Contact support to upgrade your plan.'
      })

      // In production, you would:
      // 1. Create Stripe checkout session
      // 2. Redirect to Stripe checkout
      // 3. Handle webhook on successful payment
      // 4. Update company.plan_id in database

      // Example Stripe integration:
      // const response = await fetch('/api/stripe/create-checkout', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     plan_id: planId,
      //     billing_cycle: billingCycle
      //   })
      // })
      // const { checkout_url } = await response.json()
      // window.location.href = checkout_url

    } catch (error) {
      console.error('Upgrade error:', error)
      toast.error('Failed to initiate upgrade')
    }

    setUpgradingTo(null)
  }

  const getPlanPrice = (plan: SubscriptionPlan) => {
    const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly
    if (price === 0) return 'Free'
    
    if (billingCycle === 'yearly') {
      const monthlyEquivalent = price / 12
      return (
        <div>
          <span className="text-3xl font-bold">${monthlyEquivalent.toFixed(0)}</span>
          <span className="text-gray-600">/month</span>
          <div className="text-sm text-gray-500">Billed ${price}/year</div>
        </div>
      )
    }
    
    return (
      <div>
        <span className="text-3xl font-bold">${price}</span>
        <span className="text-gray-600">/month</span>
      </div>
    )
  }

  const isCurrentPlan = (planId: string) => {
    return company?.plan_id === planId
  }

  const canDowngrade = (plan: SubscriptionPlan) => {
    if (!company) return false
    
    // Can't downgrade if current team size exceeds plan limit
    if (plan.max_team_members !== -1 && company.active_members_count > plan.max_team_members) {
      return false
    }
    
    return true
  }

  const getPlanIcon = (planName: string) => {
    switch (planName) {
      case 'FREE':
        return <UsersIcon className="h-6 w-6" />
      case 'STARTER':
        return <Building2 className="h-6 w-6" />
      case 'PROFESSIONAL':
        return <Sparkles className="h-6 w-6" />
      case 'ENTERPRISE':
        return <Crown className="h-6 w-6" />
      default:
        return <UsersIcon className="h-6 w-6" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Choose Your Plan</h1>
        <p className="text-gray-600 mb-6">
          Scale your team as you grow. Upgrade or downgrade anytime.
        </p>

        {company && (
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <span className="text-sm text-gray-700">Current plan:</span>
            <span className="font-semibold text-blue-900">
              {company.subscription_plan.display_name}
            </span>
            <span className="text-sm text-gray-600">
              ({company.active_members_count} / {company.subscription_plan.max_team_members === -1 ? '∞' : company.subscription_plan.max_team_members} members)
            </span>
          </div>
        )}
      </div>

      {/* Billing Cycle Toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-lg border border-gray-200 p-1">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'yearly'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Yearly
            <span className="ml-1.5 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative ${
              plan.is_popular
                ? 'border-blue-500 border-2 shadow-lg'
                : isCurrentPlan(plan.id)
                ? 'border-green-500 border-2'
                : ''
            }`}
          >
            {plan.is_popular && (
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  MOST POPULAR
                </span>
              </div>
            )}

            <CardHeader className="text-center pb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4 text-blue-600">
                {getPlanIcon(plan.name)}
              </div>
              <CardTitle className="text-xl">{plan.display_name}</CardTitle>
              <CardDescription className="text-sm h-12">
                {plan.description}
              </CardDescription>
              
              <div className="mt-4">
                {getPlanPrice(plan)}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Team Members */}
              <div className="flex items-center gap-2 text-sm font-medium pb-3 border-b">
                <UsersIcon className="h-4 w-4 text-gray-400" />
                <span>
                  {plan.max_team_members === -1
                    ? 'Unlimited members'
                    : `Up to ${plan.max_team_members} ${plan.max_team_members === 1 ? 'member' : 'members'}`}
                </span>
              </div>

              {/* Features */}
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Action Button */}
              <div className="pt-4">
                {isCurrentPlan(plan.id) ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled
                  >
                    Current Plan
                  </Button>
                ) : !canDowngrade(plan) ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled
                  >
                    Reduce team size first
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={upgradingTo !== null}
                    className="w-full"
                    variant={plan.is_popular ? "default" : "outline"}
                  >
                    {upgradingTo === plan.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : plan.price_monthly === 0 ? (
                      'Downgrade'
                    ) : company && plan.price_monthly < (plans.find(p => p.id === company.plan_id)?.price_monthly || 0) ? (
                      'Downgrade'
                    ) : (
                      'Upgrade'
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FAQ or Additional Info */}
      <div className="max-w-3xl mx-auto mt-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Need help choosing?</h2>
        <p className="text-gray-600 mb-6">
          All plans include OCR processing, AI-powered data extraction, and QuickBooks integration.
          Upgrade anytime as your team grows.
        </p>
        <Button variant="outline" asChild>
          <a href="mailto:support@invoiceflow.com">Contact Sales</a>
        </Button>
      </div>
    </div>
  )
}
