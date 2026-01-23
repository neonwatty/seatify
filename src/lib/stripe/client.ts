'use client';

/**
 * Start Stripe checkout for a subscription plan
 */
export async function startCheckout(priceId: string): Promise<void> {
  const response = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      priceId,
      successUrl: `${window.location.origin}/dashboard?upgraded=true`,
      cancelUrl: `${window.location.origin}/pricing`,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to start checkout');
  }

  // Redirect to Stripe Checkout
  if (data.url) {
    window.location.href = data.url;
  }
}

/**
 * Open Stripe Customer Portal for subscription management
 */
export async function openCustomerPortal(): Promise<void> {
  const response = await fetch('/api/stripe/portal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      returnUrl: window.location.href,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to open customer portal');
  }

  // Redirect to Stripe Customer Portal
  if (data.url) {
    window.location.href = data.url;
  }
}

/**
 * Stripe price IDs for different plans
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
