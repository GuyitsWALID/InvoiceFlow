# Stripe Integration Guide for Subscription Payments

This guide will help you integrate Stripe for managing subscription payments in InvoiceFlow.

## Overview

The subscription system is already built in the database. This guide covers:
1. Setting up Stripe account and products
2. Creating checkout flow for plan upgrades
3. Handling webhooks for payment events
4. Managing subscription lifecycle

## Prerequisites

- Stripe account (https://stripe.com)
- Basic understanding of webhooks
- Access to your production domain (for webhook endpoints)

## Step 1: Create Stripe Account

1. Go to https://dashboard.stripe.com/register
2. Complete registration
3. Verify your email
4. Add business details (for production)

## Step 2: Install Stripe Package

```bash
npm install stripe @stripe/stripe-js
```

## Step 3: Get API Keys

### For Development
1. Go to Stripe Dashboard
2. Click "Developers" → "API keys"
3. Copy "Publishable key" and "Secret key" (Test mode)

### For Production
1. Toggle to "Production mode"
2. Copy "Publishable key" and "Secret key"

### Add to Environment Variables
Add to `.env.local`:

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx  # We'll get this later

# For webhooks (use ngrok or your production URL)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 4: Create Products in Stripe

### Option A: Via Dashboard (Recommended for first time)

1. Go to Stripe Dashboard → Products
2. Create 4 products matching your database plans:

**FREE Plan**
- Name: InvoiceFlow Free
- Description: For individuals getting started
- Pricing: $0/month (or mark as free product)

**STARTER Plan**
- Name: InvoiceFlow Starter
- Description: For small teams
- Monthly Price: $29/month
- Yearly Price: $290/year (17% discount)

**PROFESSIONAL Plan**
- Name: InvoiceFlow Professional
- Description: For growing businesses
- Monthly Price: $79/month
- Yearly Price: $790/year (17% discount)

**ENTERPRISE Plan**
- Name: InvoiceFlow Enterprise
- Description: For large organizations
- Monthly Price: $199/month
- Yearly Price: $1990/year (17% discount)

3. Copy each product's Price ID (starts with `price_`)
4. Save these IDs - you'll need them!

### Option B: Via Stripe CLI (Automated)

Create `scripts/setup-stripe-products.ts`:

```typescript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

async function setupProducts() {
  const plans = [
    {
      name: 'InvoiceFlow Free',
      description: 'For individuals getting started',
      monthly: 0,
      yearly: 0
    },
    {
      name: 'InvoiceFlow Starter',
      description: 'For small teams',
      monthly: 2900, // cents
      yearly: 29000  // cents (17% discount built in)
    },
    {
      name: 'InvoiceFlow Professional',
      description: 'For growing businesses',
      monthly: 7900,
      yearly: 79000
    },
    {
      name: 'InvoiceFlow Enterprise',
      description: 'For large organizations',
      monthly: 19900,
      yearly: 199000
    }
  ]

  for (const plan of plans) {
    // Create product
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
    })

    // Create monthly price
    if (plan.monthly > 0) {
      const monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.monthly,
        currency: 'usd',
        recurring: { interval: 'month' },
      })
      console.log(`${plan.name} Monthly Price ID: ${monthlyPrice.id}`)
    }

    // Create yearly price
    if (plan.yearly > 0) {
      const yearlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.yearly,
        currency: 'usd',
        recurring: { interval: 'year' },
      })
      console.log(`${plan.name} Yearly Price ID: ${yearlyPrice.id}`)
    }
  }
}

setupProducts()
```

Run: `tsx scripts/setup-stripe-products.ts`

## Step 5: Update Database with Stripe Price IDs

Update `supabase/migrations/add_stripe_price_ids.sql`:

```sql
-- Add Stripe price ID columns
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS stripe_price_id_monthly TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id_yearly TEXT;

-- Update with your actual Stripe Price IDs from Step 4
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = NULL,  -- FREE has no price
  stripe_price_id_yearly = NULL
WHERE name = 'FREE';

UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_xxxxxxxxxx',  -- Replace with actual ID
  stripe_price_id_yearly = 'price_yyyyyyyyyy'
WHERE name = 'STARTER';

UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_xxxxxxxxxx',
  stripe_price_id_yearly = 'price_yyyyyyyyyy'
WHERE name = 'PROFESSIONAL';

UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_xxxxxxxxxx',
  stripe_price_id_yearly = 'price_yyyyyyyyyy'
WHERE name = 'ENTERPRISE';
```

Run this migration in Supabase dashboard.

## Step 6: Create Stripe Checkout API

Create `app/api/stripe/create-checkout/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

export async function POST(request: Request) {
  try {
    const { plan_id, billing_cycle } = await request.json()

    const supabase = await createServerClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user and company
    const { data: user } = await supabase
      .from('users')
      .select('company_id, email')
      .eq('id', session.user.id)
      .single()

    if (!user?.company_id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Get plan details with Stripe price IDs
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .single()

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // Get appropriate price ID
    const priceId = billing_cycle === 'yearly' 
      ? plan.stripe_price_id_yearly 
      : plan.stripe_price_id_monthly

    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured' }, { status: 400 })
    }

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/team?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/plans?canceled=true`,
      customer_email: user.email,
      client_reference_id: user.company_id,
      metadata: {
        company_id: user.company_id,
        plan_id: plan_id,
        user_id: session.user.id,
      },
    })

    return NextResponse.json({ checkout_url: checkoutSession.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
```

## Step 7: Update Plans Page

Update `app/dashboard/plans/page.tsx` to call Stripe API:

```typescript
// Replace the handleUpgrade function (around line 85):

const handleUpgrade = async (planId: string) => {
  if (!company) return

  setUpgradingTo(planId)

  try {
    const response = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_id: planId,
        billing_cycle: billingCycle
      })
    })

    const result = await response.json()

    if (response.ok && result.checkout_url) {
      // Redirect to Stripe Checkout
      window.location.href = result.checkout_url
    } else {
      toast.error(result.error || 'Failed to initiate checkout')
    }
  } catch (error) {
    console.error('Upgrade error:', error)
    toast.error('Failed to initiate upgrade')
  }

  setUpgradingTo(null)
}
```

## Step 8: Set Up Webhooks

Webhooks notify your app when payments succeed/fail.

### Create Webhook Handler

Create `app/api/stripe/webhook/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // Need service role key for admin operations
)

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Handle different event types
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
      break

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
      break

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
      break

    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice)
      break

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const companyId = session.metadata?.company_id
  const planId = session.metadata?.plan_id

  if (!companyId || !planId) {
    console.error('Missing metadata in checkout session')
    return
  }

  // Update company's subscription plan
  const { error } = await supabase
    .from('companies')
    .update({
      plan_id: planId,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
    })
    .eq('id', companyId)

  if (error) {
    console.error('Error updating company subscription:', error)
  } else {
    console.log(`Company ${companyId} upgraded to plan ${planId}`)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Handle subscription changes (upgrades, downgrades)
  console.log('Subscription updated:', subscription.id)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Downgrade to free plan when subscription is canceled
  const { error } = await supabase
    .from('companies')
    .update({
      plan_id: 'FREE_PLAN_ID',  // Replace with actual free plan ID
      stripe_subscription_id: null,
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Error handling subscription deletion:', error)
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Notify user about payment failure
  console.log('Payment failed for invoice:', invoice.id)
  // TODO: Send email notification
}
```

### Add Stripe Customer/Subscription Columns

Create migration `supabase/migrations/add_stripe_columns.sql`:

```sql
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer 
ON companies(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_companies_stripe_subscription 
ON companies(stripe_subscription_id);
```

### Configure Webhook in Stripe Dashboard

#### For Development (Using Stripe CLI)

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
4. Copy the webhook signing secret (starts with `whsec_`)
5. Add to `.env.local`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
   ```

#### For Production

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copy the "Signing secret"
6. Add to production environment variables

## Step 9: Add Subscription Management

Create `app/dashboard/subscription/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<any>(null)

  const handleManageSubscription = async () => {
    // Create Stripe Customer Portal session
    const response = await fetch('/api/stripe/customer-portal', {
      method: 'POST',
    })
    const { url } = await response.json()
    window.location.href = url
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Subscription Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleManageSubscription}>
            Manage Billing
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

Create Customer Portal API `app/api/stripe/customer-portal/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

export async function POST() {
  try {
    const supabase = await createServerClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: user } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', session.user.id)
      .single()

    const { data: company } = await supabase
      .from('companies')
      .select('stripe_customer_id')
      .eq('id', user.company_id)
      .single()

    if (!company?.stripe_customer_id) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: company.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    console.error('Customer portal error:', error)
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
```

## Step 10: Testing

### Test Card Numbers (Development Mode)

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires Auth: `4000 0025 0000 3155`

Use any future expiration date, any CVC, and any postal code.

### Test Flow

1. Start dev server and Stripe webhook forwarding
2. Go to `/dashboard/plans`
3. Click "Upgrade" on a paid plan
4. Use test card: `4242 4242 4242 4242`
5. Complete checkout
6. Verify:
   - Redirected to success page
   - Webhook received and processed
   - Company plan updated in database
   - Team limit increased

## Production Checklist

Before going live:

- [ ] Switch from test to production Stripe keys
- [ ] Update webhook endpoint to production URL
- [ ] Test with real card (refund after)
- [ ] Set up Stripe webhook monitoring
- [ ] Configure Stripe email notifications
- [ ] Add tax calculation (Stripe Tax)
- [ ] Implement proration for mid-cycle upgrades
- [ ] Add grace period for failed payments
- [ ] Create cancellation flow
- [ ] Test upgrade/downgrade scenarios
- [ ] Document refund policy
- [ ] Set up Stripe fraud detection
- [ ] Configure invoice emails
- [ ] Test customer portal

## Common Issues

### Webhook Not Receiving Events
- Check webhook URL is correct
- Verify STRIPE_WEBHOOK_SECRET is set
- Check firewall allows Stripe IPs
- Use Stripe CLI for local testing

### Payment Succeeded But Plan Not Updated
- Check webhook logs in Stripe dashboard
- Verify metadata is passed correctly
- Check Supabase logs for errors
- Ensure service role key has proper permissions

### Customer Portal Not Working
- Verify stripe_customer_id is saved
- Check customer exists in Stripe dashboard
- Ensure return URL is correct

## Next Steps

After Stripe is working:
1. Add usage-based billing (if needed)
2. Implement seat-based pricing
3. Add annual discount promotions
4. Create custom enterprise pricing
5. Set up revenue analytics

## Support Resources

- Stripe Documentation: https://stripe.com/docs
- Stripe Discord: https://stripe.com/community
- API Reference: https://stripe.com/docs/api
- Testing: https://stripe.com/docs/testing
