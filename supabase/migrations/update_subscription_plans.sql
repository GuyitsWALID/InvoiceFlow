-- Update Subscription Plans to New Pricing
-- Run this in Supabase SQL Editor to update the plans

-- Delete old plans (starter, professional, enterprise)
DELETE FROM subscription_plans WHERE id IN ('starter', 'professional', 'enterprise');

-- Update free plan
UPDATE subscription_plans
SET 
  name = 'FREE',
  display_name = 'Free',
  description = 'Perfect for getting started',
  price_monthly = 0,
  price_yearly = 0,
  max_team_members = 1,
  max_invoices_per_month = 1,
  features = '{"ocr": true, "ai_extraction": true, "accounting_sync": false, "email_integration": false, "team_management": false}'::jsonb
WHERE id = 'free';

-- Insert Pro plan
INSERT INTO subscription_plans (id, name, display_name, description, price_monthly, price_yearly, max_team_members, max_invoices_per_month, features)
VALUES (
  'pro',
  'PRO',
  'Pro',
  'For small businesses and teams',
  9.99,
  99.99,
  999,
  999999,
  '{"ocr": true, "ai_extraction": true, "accounting_sync": true, "email_integration": true, "team_management": true, "priority_support": true}'::jsonb
)
ON CONFLICT (id) DO UPDATE
SET 
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  max_team_members = EXCLUDED.max_team_members,
  max_invoices_per_month = EXCLUDED.max_invoices_per_month,
  features = EXCLUDED.features,
  updated_at = NOW();

-- Update all existing companies on old plans to free plan
UPDATE companies 
SET subscription_plan_id = 'free'
WHERE subscription_plan_id NOT IN ('free', 'pro');
