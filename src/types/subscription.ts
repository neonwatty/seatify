/**
 * Subscription types for Pro features
 */

export type SubscriptionPlan = 'free' | 'pro' | 'team' | 'enterprise';

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
  team: {
    plan: 'team',
    maxEvents: -1,
    maxGuestsPerEvent: -1,
    hasWatermark: false,
    canRemoveBranding: true,
    hasCustomLogo: true,
    hasPrioritySupport: true,
    hasTeamMembers: true,
    maxTeamMembers: 5,
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
    maxTeamMembers: -1,
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
    description: 'Perfect for small events',
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
    ctaText: 'Get Started',
  },
  {
    plan: 'pro',
    name: 'Pro',
    description: 'For professional event planners',
    monthlyPrice: 12,
    yearlyPrice: 99,
    features: [
      'Unlimited events',
      'Unlimited guests',
      'Remove "Made with Seatify" branding',
      'Custom logo on PDFs',
      'Priority email support',
      'Guest database (reuse across events)',
    ],
    highlighted: true,
    ctaText: 'Start Free Trial',
  },
  {
    plan: 'team',
    name: 'Team',
    description: 'For event planning teams',
    monthlyPrice: 29,
    yearlyPrice: 249,
    features: [
      'Everything in Pro',
      'Up to 5 team members',
      'Role-based access control',
      'Comments & activity history',
      'Real-time collaboration',
    ],
    ctaText: 'Start Free Trial',
  },
  {
    plan: 'enterprise',
    name: 'Enterprise',
    description: 'Custom solutions for large organizations',
    monthlyPrice: 0, // Custom pricing
    yearlyPrice: 0,
    features: [
      'Everything in Team',
      'Unlimited team members',
      'SSO / SAML authentication',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
    ],
    ctaText: 'Contact Sales',
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
  team: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID || '',
    yearly: process.env.NEXT_PUBLIC_STRIPE_TEAM_YEARLY_PRICE_ID || '',
  },
};
