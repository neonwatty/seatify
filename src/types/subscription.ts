/**
 * Subscription types for Pro features
 */

export type SubscriptionPlan = 'free' | 'pro' | 'enterprise';

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;

  // Stripe integration
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;

  // Billing period
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: string;

  createdAt: string;
  updatedAt: string;
}

/**
 * Plan limits configuration
 */
export interface PlanLimits {
  plan: SubscriptionPlan;
  maxEvents: number; // -1 = unlimited
  maxGuestsPerEvent: number; // -1 = unlimited
  hasWatermark: boolean;
  canRemoveBranding: boolean;
  hasCustomLogo: boolean;
  hasPrioritySupport: boolean;
  hasTeamMembers: boolean;
  maxTeamMembers: number; // -1 = unlimited
}

/**
 * Default plan limits
 */
export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    plan: 'free',
    maxEvents: 5,
    maxGuestsPerEvent: 200,
    hasWatermark: true,
    canRemoveBranding: false,
    hasCustomLogo: false,
    hasPrioritySupport: false,
    hasTeamMembers: false,
    maxTeamMembers: 0,
  },
  pro: {
    plan: 'pro',
    maxEvents: -1,
    maxGuestsPerEvent: -1,
    hasWatermark: false,
    canRemoveBranding: true,
    hasCustomLogo: true,
    hasPrioritySupport: true,
    hasTeamMembers: false,
    maxTeamMembers: 0,
  },
  enterprise: {
    plan: 'enterprise',
    maxEvents: -1,
    maxGuestsPerEvent: -1,
    hasWatermark: false,
    canRemoveBranding: true,
    hasCustomLogo: true,
    hasPrioritySupport: true,
    hasTeamMembers: true,
    maxTeamMembers: -1, // Unlimited team members
  },
};

/**
 * Get plan limits for a given plan
 */
export function getPlanLimits(plan: SubscriptionPlan): PlanLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

/**
 * Check if a feature limit allows an action
 * Returns true if within limits, false if limit exceeded
 */
export function isWithinLimit(limit: number, current: number): boolean {
  // -1 means unlimited
  if (limit === -1) return true;
  return current < limit;
}

/**
 * Pricing information for display
 */
export interface PricingTier {
  plan: SubscriptionPlan;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  highlighted?: boolean;
  ctaText: string;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    plan: 'free',
    name: 'Free',
    description: 'Perfect for trying things out',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      'Up to 5 events',
      'Up to 200 guests per event',
      'Basic PDF exports',
      'Guest management & import',
      'Seating optimization',
      'Shareable links & QR codes',
    ],
    ctaText: 'Get Started Free',
  },
  {
    plan: 'pro',
    name: 'Pro',
    description: 'For professional event planners',
    monthlyPrice: 20,
    yearlyPrice: 168,
    features: [
      'Unlimited events',
      'Unlimited guests',
      'Send email invitations & reminders',
      'Remove "Made with Seatify" branding',
      'Custom logo on PDFs',
      'Priority email support',
    ],
    highlighted: true,
    ctaText: 'Upgrade to Pro',
  },
  {
    plan: 'enterprise',
    name: 'Enterprise',
    description: 'For teams & large organizations',
    monthlyPrice: 0, // Custom pricing
    yearlyPrice: 0,
    features: [
      'Everything in Pro',
      'Unlimited team members',
      'Role-based access control',
      'SSO / SAML authentication',
      'Dedicated support',
      'Custom integrations',
    ],
    ctaText: 'Contact Us',
  },
];

/**
 * Stripe price IDs (to be configured via environment variables)
 */
export const STRIPE_PRICES = {
  pro: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || '',
    yearly: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID || '',
  },
};
