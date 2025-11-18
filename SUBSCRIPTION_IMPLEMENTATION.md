# Subscription System Implementation

## ✅ Completed Features

### 1. **Subscription Plans** - Simplified to 2 Tiers

#### **Free Plan**
- **Price**: $0 (Forever)
- **Invoice Limit**: 1 invoice per month
- **Team Members**: Solo user only (1 member)
- **Features**:
  - ✅ OCR text extraction
  - ✅ AI-powered data extraction
  - ❌ QuickBooks sync
  - ❌ Email integration
  - ❌ Team management
  - ❌ Priority support

#### **Pro Plan**
- **Price**: $9.99/month or $99.99/year (Save $19.89 - 2 months free!)
- **Invoice Limit**: Unlimited invoices
- **Team Members**: Unlimited team members
- **Features**:
  - ✅ OCR text extraction
  - ✅ AI-powered data extraction
  - ✅ QuickBooks sync
  - ✅ Email integration
  - ✅ Team management
  - ✅ Priority support

---

## 🔒 Enforcement Mechanisms

### **Invoice Limits (Free Tier)**
Users on the free plan are limited to **1 invoice per month**. The limit is enforced at:

1. **Upload Dialog** (`components/upload-invoice-dialog.tsx`)
   - Checks invoice count before allowing upload
   - Shows error message with upgrade prompt
   - Automatically redirects to plans page after 2 seconds
   - Applied to:
     - Direct file uploads
     - Google Drive imports
     - Dropbox imports

2. **API Endpoint** (`app/api/invoices/route.ts`)
   - Backend validation for invoice creation
   - Returns 403 error with upgrade message
   - Counts invoices created in current calendar month

### **Team Management Limits (Free Tier)**
Users on the free plan **cannot add team members**. The limit is enforced at:

1. **Team Invitation** (`app/dashboard/team/page.tsx`)
   - Already implemented
   - Checks `max_team_members` from subscription plan
   - Shows error: "Team limit reached! Upgrade to add more members."
   - Blocks invitation dialog when limit reached

---

## 📁 Files Modified

### **Database Migration**
- ✅ `supabase/migrations/add_team_management.sql`
  - Updated subscription plans with new pricing
  - Free: 1 invoice limit, 1 member
  - Pro: Unlimited invoices, unlimited members

- ✅ `supabase/migrations/update_subscription_plans.sql` **(NEW)**
  - SQL script to update existing database
  - Removes old plans (starter, professional, enterprise)
  - Updates free plan limits
  - Creates new Pro plan
  - Migrates existing users to free plan

### **Frontend**
- ✅ `app/dashboard/plans/page.tsx`
  - Updated interface to match new subscription structure
  - Added `getPlanFeatures()` function to dynamically generate feature list
  - Updated pricing display with yearly savings
  - Changed grid from 4 columns to 2 columns
  - Updated billing toggle badge: "Save 2 months!" instead of "Save 17%"
  - Updated footer text to emphasize simplicity

- ✅ `components/upload-invoice-dialog.tsx`
  - Added invoice limit check before upload (3 locations)
  - Shows upgrade prompt when limit reached
  - Auto-redirects to plans page
  - Checks applied to: file upload, Google Drive, Dropbox

### **Backend API**
- ✅ `app/api/invoices/route.ts`
  - Added invoice limit validation in POST endpoint
  - Queries current month's invoice count
  - Returns 403 error with upgrade message when limit exceeded

---

## 🚀 How to Deploy

### Step 1: Update Database
Run the SQL migration in your Supabase SQL Editor:

```sql
-- Run this file:
supabase/migrations/update_subscription_plans.sql
```

This will:
- Remove old subscription plans
- Update free plan to 1 invoice limit
- Create Pro plan ($9.99/month, $99.99/year)
- Migrate existing users to free plan

### Step 2: Deploy Code
Your code is already updated! Just deploy the changes:

```bash
# Push to production
git add .
git commit -m "Implement subscription system with invoice limits"
git push
```

### Step 3: Test the Flow

#### Test Free Tier Limits:
1. Create a new user (auto-assigned to free plan)
2. Upload 1 invoice → ✅ Should work
3. Try to upload 2nd invoice → ❌ Should show error and redirect to plans
4. Try to invite team member → ❌ Should show "Team limit reached"

#### Test Pro Tier:
1. Manually update a user's company to 'pro' plan:
   ```sql
   UPDATE companies SET subscription_plan_id = 'pro' WHERE id = 'YOUR_COMPANY_ID';
   ```
2. Upload multiple invoices → ✅ Should work
3. Invite team members → ✅ Should work

---

## 💳 Payment Integration (Next Steps)

The subscription page has a placeholder for payment integration. To implement:

### Option 1: Stripe Integration
```typescript
// In app/dashboard/plans/page.tsx, replace handleUpgrade():

const handleUpgrade = async (planId: string) => {
  try {
    const response = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_id: planId,
        billing_cycle: billingCycle
      })
    })
    
    const { checkout_url } = await response.json()
    window.location.href = checkout_url
  } catch (error) {
    toast.error('Failed to initiate upgrade')
  }
}
```

### Create Stripe Checkout API:
```typescript
// app/api/stripe/create-checkout/route.ts

import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  const { plan_id, billing_cycle } = await request.json()
  
  const priceId = billing_cycle === 'monthly' 
    ? process.env.STRIPE_PRO_MONTHLY_PRICE_ID 
    : process.env.STRIPE_PRO_YEARLY_PRICE_ID
  
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/plans?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/plans?canceled=true`,
  })
  
  return Response.json({ checkout_url: session.url })
}
```

### Handle Stripe Webhook:
```typescript
// app/api/stripe/webhook/route.ts

export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature')!
  const body = await request.text()
  
  const event = stripe.webhooks.constructEvent(
    body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
  
  if (event.type === 'checkout.session.completed') {
    // Update company subscription
    await supabase
      .from('companies')
      .update({ subscription_plan_id: 'pro' })
      .eq('id', event.data.object.client_reference_id)
  }
  
  return Response.json({ received: true })
}
```

---

## 📊 Monitoring & Analytics

### Track Conversions:
- Monitor how many users hit the invoice limit
- Track clicks to the plans page from upgrade prompts
- Measure conversion rate from free to pro

### Suggested Metrics:
```sql
-- Users who hit invoice limit this month
SELECT COUNT(DISTINCT company_id) 
FROM invoices 
WHERE created_at >= date_trunc('month', CURRENT_DATE)
GROUP BY company_id
HAVING COUNT(*) >= 1;

-- Free plan users
SELECT COUNT(*) FROM companies WHERE subscription_plan_id = 'free';

-- Pro plan users
SELECT COUNT(*) FROM companies WHERE subscription_plan_id = 'pro';

-- Conversion rate
SELECT 
  (SELECT COUNT(*) FROM companies WHERE subscription_plan_id = 'pro')::float / 
  (SELECT COUNT(*) FROM companies)::float * 100 as conversion_rate_percent;
```

---

## 🎯 User Experience Flow

### Free User Hits Limit:
1. User uploads their first invoice → ✅ Success
2. User tries to upload 2nd invoice → 
   - ❌ Error message: "You've reached your plan limit of 1 invoice per month. Upgrade to Pro for unlimited invoices!"
   - 🔄 Auto-redirect to plans page after 2 seconds
3. User sees pricing: $9.99/month or $99.99/year
4. User clicks "Upgrade" → Payment flow (when implemented)
5. After payment → Unlimited invoices ✅

### Free User Tries to Add Team:
1. User goes to Team page
2. Clicks "Invite Member" →
   - ❌ Error: "Team limit reached! Your Free plan allows 1 member. Please upgrade to add more members."
   - Shows upgrade prompt with link to plans page

---

## ✨ Key Features

- **Clean & Simple**: Only 2 plans (Free vs Pro)
- **Clear Value Prop**: Free = Try it out, Pro = Unlimited everything
- **Yearly Discount**: Save 2 months when paying yearly ($99.99 vs $119.88)
- **Automatic Enforcement**: Backend + Frontend validation
- **Smooth UX**: Auto-redirect to upgrade page when limits hit
- **Existing Features Protected**: Team management already had limits implemented

---

## 🔧 Environment Variables Needed (For Stripe)

Add to `.env.local`:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
```

---

## 🐛 Troubleshooting

### Issue: Users can still upload multiple invoices
**Solution**: Make sure you ran the SQL migration to update `max_invoices_per_month` to 1 for free plan

### Issue: Team invitation limit not working
**Solution**: The team limit was already implemented. Check `app/dashboard/team/page.tsx` line 222

### Issue: Supabase returning array instead of object for subscription_plan
**Solution**: Already fixed! We handle both array and object cases with:
```typescript
const subscriptionPlan = Array.isArray(companyData.subscription_plan)
  ? companyData.subscription_plan[0]
  : companyData.subscription_plan
```

---

## 📝 Testing Checklist

- [ ] Free user can upload 1 invoice
- [ ] Free user blocked on 2nd invoice with upgrade message
- [ ] Free user cannot invite team members
- [ ] Pro user can upload unlimited invoices
- [ ] Pro user can invite unlimited team members
- [ ] Plans page displays correctly (2 plans, correct pricing)
- [ ] Yearly plan shows savings ($19.89 saved)
- [ ] Upgrade button triggers payment flow (when implemented)
- [ ] Auto-redirect to plans page works on limit hit

---

## 🎉 Summary

**You now have a complete subscription system with:**
- ✅ 2 clear pricing tiers (Free & Pro)
- ✅ Invoice limits enforced (1 for free, unlimited for pro)
- ✅ Team member limits enforced (1 for free, unlimited for pro)
- ✅ Beautiful pricing page with yearly discount
- ✅ Upgrade prompts throughout the app
- ✅ Ready for Stripe payment integration

**Next step**: Integrate Stripe for payment processing!
