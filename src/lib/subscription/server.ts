import { createClient } from '@/lib/supabase/server';
import type { SubscriptionPlan, PlanLimits } from '@/types/subscription';
import { getPlanLimits } from '@/types/subscription';

/**
 * Get subscription limits for server-side operations
 * Use this in server actions and API routes
 */
export async function getServerSubscription(userId: string): Promise<{
  plan: SubscriptionPlan;
  limits: PlanLimits;
}> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', userId)
    .single();

  const plan: SubscriptionPlan = data?.plan || 'free';
  return {
    plan,
    limits: getPlanLimits(plan),
  };
}

/**
 * Check if user can create an event
 */
export async function canUserCreateEvent(userId: string, currentEventCount: number): Promise<boolean> {
  const { limits } = await getServerSubscription(userId);
  if (limits.maxEvents === -1) return true;
  return currentEventCount < limits.maxEvents;
}

/**
 * Check if user can add guests to an event
 */
export async function canUserAddGuests(userId: string, currentGuestCount: number): Promise<boolean> {
  const { limits } = await getServerSubscription(userId);
  if (limits.maxGuestsPerEvent === -1) return true;
  return currentGuestCount < limits.maxGuestsPerEvent;
}
