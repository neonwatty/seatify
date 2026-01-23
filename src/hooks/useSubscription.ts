'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Subscription, SubscriptionPlan, PlanLimits } from '@/types/subscription';
import { getPlanLimits, isWithinLimit } from '@/types/subscription';

// Re-export for convenience
export { getPlanLimits, isWithinLimit } from '@/types/subscription';
export type { SubscriptionPlan, PlanLimits } from '@/types/subscription';

interface UseSubscriptionReturn {
  subscription: Subscription | null;
  plan: SubscriptionPlan;
  limits: PlanLimits;
  isLoading: boolean;
  error: string | null;
  isPro: boolean;
  isTeam: boolean;
  isEnterprise: boolean;
  isFree: boolean;
  canCreateEvent: (currentEventCount: number) => boolean;
  canAddGuest: (currentGuestCount: number) => boolean;
  hasWatermark: boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook to access and manage user subscription
 */
export function useSubscription(): UseSubscriptionReturn {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Not authenticated - use free limits
        setSubscription(null);
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        // If no subscription found, user is on free plan
        if (fetchError.code === 'PGRST116') {
          setSubscription(null);
        } else {
          console.error('Error fetching subscription:', fetchError);
          setError(fetchError.message);
        }
      } else if (data) {
        // Map snake_case to camelCase
        setSubscription({
          id: data.id,
          userId: data.user_id,
          plan: data.plan as SubscriptionPlan,
          status: data.status,
          stripeCustomerId: data.stripe_customer_id,
          stripeSubscriptionId: data.stripe_subscription_id,
          stripePriceId: data.stripe_price_id,
          currentPeriodStart: data.current_period_start,
          currentPeriodEnd: data.current_period_end,
          cancelAtPeriodEnd: data.cancel_at_period_end,
          canceledAt: data.canceled_at,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
      }
    } catch (err) {
      console.error('Error in useSubscription:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();

    // Subscribe to auth changes
    const supabase = createClient();
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          fetchSubscription();
        } else {
          setSubscription(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      authSubscription.unsubscribe();
    };
  }, [fetchSubscription]);

  // Derive plan and limits
  const plan: SubscriptionPlan = subscription?.plan || 'free';
  const limits = getPlanLimits(plan);

  // Convenience booleans
  const isFree = plan === 'free';
  const isPro = plan === 'pro';
  const isTeam = plan === 'team';
  const isEnterprise = plan === 'enterprise';

  // Limit check helpers
  const canCreateEvent = useCallback(
    (currentEventCount: number) => isWithinLimit(limits.maxEvents, currentEventCount),
    [limits.maxEvents]
  );

  const canAddGuest = useCallback(
    (currentGuestCount: number) => isWithinLimit(limits.maxGuestsPerEvent, currentGuestCount),
    [limits.maxGuestsPerEvent]
  );

  return {
    subscription,
    plan,
    limits,
    isLoading,
    error,
    isPro,
    isTeam,
    isEnterprise,
    isFree,
    canCreateEvent,
    canAddGuest,
    hasWatermark: limits.hasWatermark,
    refresh: fetchSubscription,
  };
}
