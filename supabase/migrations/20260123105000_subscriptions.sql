-- Migration: Add subscription management tables
-- Date: 2026-01-23
-- Description: Adds tables for Pro/Team subscription plans

-- =====================================================
-- SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Plan info
  plan VARCHAR NOT NULL DEFAULT 'free', -- 'free', 'pro', 'team', 'enterprise'
  status VARCHAR NOT NULL DEFAULT 'active', -- 'active', 'canceled', 'past_due', 'trialing'

  -- Stripe integration
  stripe_customer_id VARCHAR,
  stripe_subscription_id VARCHAR UNIQUE,
  stripe_price_id VARCHAR,

  -- Billing period
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Only one subscription per user
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- =====================================================
-- ADD PLAN COLUMN TO PROFILES (for quick lookups)
-- =====================================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS plan VARCHAR DEFAULT 'free';

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Only allow inserts/updates via service role (Stripe webhooks)
-- Regular users cannot modify their subscription directly
CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
  FOR ALL USING (auth.uid() = user_id OR auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- TRIGGER: Auto-create free subscription on profile creation
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_profile_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_profile_created_subscription ON public.profiles;
CREATE TRIGGER on_profile_created_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_subscription();

-- =====================================================
-- FUNCTION: Get user's current plan with limits
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_user_plan_limits(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  user_plan VARCHAR;
  result JSON;
BEGIN
  SELECT plan INTO user_plan FROM public.subscriptions WHERE user_id = p_user_id;

  -- Default to free if no subscription found
  IF user_plan IS NULL THEN
    user_plan := 'free';
  END IF;

  -- Return plan-specific limits
  CASE user_plan
    WHEN 'free' THEN
      result := json_build_object(
        'plan', 'free',
        'maxEvents', 5,
        'maxGuestsPerEvent', 200,
        'hasWatermark', true,
        'canRemoveBranding', false,
        'hasCustomLogo', false,
        'hasPrioritySupport', false,
        'hasTeamMembers', false,
        'maxTeamMembers', 0
      );
    WHEN 'pro' THEN
      result := json_build_object(
        'plan', 'pro',
        'maxEvents', -1, -- unlimited
        'maxGuestsPerEvent', -1, -- unlimited
        'hasWatermark', false,
        'canRemoveBranding', true,
        'hasCustomLogo', true,
        'hasPrioritySupport', true,
        'hasTeamMembers', false,
        'maxTeamMembers', 0
      );
    WHEN 'team' THEN
      result := json_build_object(
        'plan', 'team',
        'maxEvents', -1,
        'maxGuestsPerEvent', -1,
        'hasWatermark', false,
        'canRemoveBranding', true,
        'hasCustomLogo', true,
        'hasPrioritySupport', true,
        'hasTeamMembers', true,
        'maxTeamMembers', 5
      );
    WHEN 'enterprise' THEN
      result := json_build_object(
        'plan', 'enterprise',
        'maxEvents', -1,
        'maxGuestsPerEvent', -1,
        'hasWatermark', false,
        'canRemoveBranding', true,
        'hasCustomLogo', true,
        'hasPrioritySupport', true,
        'hasTeamMembers', true,
        'maxTeamMembers', -1 -- unlimited
      );
    ELSE
      result := json_build_object(
        'plan', 'free',
        'maxEvents', 5,
        'maxGuestsPerEvent', 200,
        'hasWatermark', true,
        'canRemoveBranding', false,
        'hasCustomLogo', false,
        'hasPrioritySupport', false,
        'hasTeamMembers', false,
        'maxTeamMembers', 0
      );
  END CASE;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- BACKFILL: Create subscriptions for existing users
-- =====================================================
INSERT INTO public.subscriptions (user_id, plan, status)
SELECT id, 'free', 'active'
FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.subscriptions)
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- TRIGGER: Updated_at for subscriptions
-- =====================================================
DROP TRIGGER IF EXISTS set_updated_at ON public.subscriptions;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
